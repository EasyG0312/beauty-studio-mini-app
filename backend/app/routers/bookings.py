"""
Управление записями роутеры
===========================

Endpoints:
- GET /api/bookings - Получить записи с фильтрацией и сортировкой
- GET /api/bookings/{id} - Получить конкретную запись
- POST /api/bookings - Создать новую запись
- DELETE /api/bookings/{id} - Отменить запись
- PUT /api/bookings/{id} - Обновить запись
- DELETE /api/bookings/{id}/delete - Удалить запись (админская операция)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timedelta
from typing import Optional, List
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import Booking, Client, Blacklist
from app.schemas import (
    BookingCreate, BookingUpdate, BookingResponse,
    SlotAvailability
)
from app.dependencies import get_current_user, require_role
from app.utils import check_slot_taken
from app.services import notification_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=list[BookingResponse])
async def get_bookings(
    status_filter: Optional[str] = None,
    date: Optional[str] = None,
    chat_id: Optional[int] = None,
    master: Optional[str] = None,
    service: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "date",
    sort_order: str = "asc",
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: Optional[Client] = Depends(get_current_user)
):
    """Получить записи с фильтрацией и сортировкой."""
    query = select(Booking)

    if status_filter:
        query = query.where(Booking.status == status_filter)
    if date:
        query = query.where(Booking.date == date)
    if chat_id:
        query = query.where(Booking.chat_id == chat_id)
    if master:
        query = query.where(Booking.master == master)
    if service:
        query = query.where(Booking.service == service)
    if date_from:
        query = query.where(Booking.date >= date_from)
    if date_to:
        query = query.where(Booking.date <= date_to)

    # Сортировка
    sort_column = Booking.date if sort_by == "date" else Booking.time
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc(), Booking.time.asc())

    # Лимит
    if limit:
        query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Получить конкретную запись."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("", response_model=BookingResponse)
@limiter.limit("10/minute")
async def create_booking(
    request: Request,
    booking: BookingCreate,
    db: AsyncSession = Depends(get_db),
    user: Optional[Client] = Depends(get_current_user)
):
    """Создать новую запись."""
    # Проверяем чёрный список
    result = await db.execute(select(Blacklist).where(Blacklist.chat_id == booking.chat_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Client is blacklisted")

    # Проверяем занятость слота
    is_taken = await check_slot_taken(db, booking.date, booking.time, booking.master)
    if is_taken:
        raise HTTPException(status_code=409, detail="Slot is already booked")

    db_booking = Booking(**booking.model_dump())
    db_booking.created_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    db.add(db_booking)
    await db.commit()
    await db.refresh(db_booking)

    # Обновляем или создаём клиента
    if booking.chat_id:
        from app.utils import upsert_client
        await upsert_client(db, booking.chat_id, booking.name, booking.phone)

        # Создаём напоминания
        try:
            await notification_service.create_booking_reminders(db, db_booking)
            logger.info(f"Created reminders for booking {db_booking.id}")
        except Exception as e:
            logger.error(f"Error creating reminders: {e}")

    # Отправляем уведомление админу о новой записи
    try:
        admin_chat_id = settings.admin_chat_id
        if admin_chat_id:
            admin_message = (
                f"🔔 <b>Новая запись!</b>\n\n"
                f"👤 Имя: {db_booking.name}\n"
                f"📱 Телефон: {db_booking.phone}\n"
                f"📅 Дата: {db_booking.date}\n"
                f"⏰ Время: {db_booking.time}\n"
                f"💇 Мастер: {db_booking.master}\n"
                f"💅 Услуга: {db_booking.service}\n"
                f"🆔 ID записи: {db_booking.id}"
            )
            await notification_service.send_telegram_message(admin_chat_id, admin_message)
            logger.info(f"Admin notification sent for booking {db_booking.id}")
    except Exception as e:
        logger.error(f"Error sending admin notification: {e}")

    return db_booking


@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[Client] = Depends(get_current_user)
):
    """Отменить запись с проверкой CANCEL_HOURS."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    CANCEL_HOURS = settings.cancel_hours or 5  # часов
    
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Проверяем можно ли отменить (не менее чем за N часов)
    try:
        booking_datetime = datetime.strptime(f"{booking.date} {booking.time}", "%d.%m.%Y %H:%M")
        now = datetime.now()
        hours_until = (booking_datetime - now).total_seconds() / 3600
        
        if hours_until < CANCEL_HOURS:
            raise HTTPException(
                status_code=400,
                detail=f"Нельзя отменить запись менее чем за {CANCEL_HOURS} часов"
            )
    except ValueError:
        pass  # Если не удалось распарсить дату, позволяем отмену
    
    booking.status = "cancelled"
    await db.commit()

    # Отправляем уведомление админу об отмене
    try:
        admin_chat_id = settings.admin_chat_id
        if admin_chat_id:
            admin_message = (
                f"❌ <b>Запись отменена!</b>\n\n"
                f"👤 Имя: {booking.name}\n"
                f"📱 Телефон: {booking.phone}\n"
                f"📅 Дата: {booking.date}\n"
                f"⏰ Время: {booking.time}\n"
                f"💇 Мастер: {booking.master}\n"
                f"💅 Услуга: {booking.service}\n"
                f"🆔 ID записи: {booking.id}"
            )
            await notification_service.send_telegram_message(admin_chat_id, admin_message)
            logger.info(f"Admin notification sent for cancelled booking {booking.id}")
    except Exception as e:
        logger.error(f"Error sending admin notification: {e}")

    return {"message": "Booking cancelled"}


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    update: BookingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить запись."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(booking, field, value)
    
    await db.commit()
    await db.refresh(booking)
    return booking


@router.delete("/{booking_id}/delete")
async def delete_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить запись (админская операция)."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.delete(booking)
    await db.commit()
    return {"message": "Booking deleted"}
