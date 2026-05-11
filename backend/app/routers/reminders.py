"""
Управление напоминаниями роутеры
=================================

Endpoints:
- GET /api/reminders - Получить напоминания
- POST /api/reminders - Создать напоминание
- PUT /api/reminders/{id} - Обновить напоминание
- DELETE /api/reminders/{id} - Удалить напоминание
- POST /api/reminders/send - Отправить напоминания вручную
- GET /api/reminders/templates - Получить шаблоны
- POST /api/reminders/templates - Создать шаблон
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Booking, Client
from app.models.reminders import Reminder, ReminderTemplate, NotificationLog, ReminderType, NotificationChannel
from app.schemas import (
    ReminderCreate, ReminderUpdate, ReminderResponse,
    ReminderTemplateCreate, ReminderTemplateResponse,
    NotificationLogResponse
)
from app.dependencies import require_role, get_user_role
from app.services.reminder_service import reminder_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("", response_model=List[ReminderResponse])
async def get_reminders(
    booking_id: Optional[int] = None,
    client_id: Optional[int] = None,
    is_sent: Optional[bool] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить список напоминаний с фильтрацией."""
    query = select(Reminder)
    
    if booking_id:
        query = query.where(Reminder.booking_id == booking_id)
    if client_id:
        query = query.where(Reminder.client_id == client_id)
    if is_sent is not None:
        query = query.where(Reminder.is_sent == is_sent)
    
    query = query.order_by(Reminder.scheduled_at.desc()).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Создать новое напоминание."""
    db_reminder = Reminder(**reminder.model_dump())
    db.add(db_reminder)
    await db.commit()
    await db.refresh(db_reminder)
    
    logger.info(f"Created reminder {db_reminder.id} by user {user.chat_id}")
    return db_reminder


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    update: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Обновить напоминание."""
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    
    await db.commit()
    await db.refresh(reminder)
    
    logger.info(f"Updated reminder {reminder_id} by user {user.chat_id}")
    return reminder


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Удалить напоминание."""
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    await db.delete(reminder)
    await db.commit()
    
    logger.info(f"Deleted reminder {reminder_id} by user {user.chat_id}")
    return {"message": "Reminder deleted"}


@router.post("/send")
async def send_reminders_manual(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Отправить все ожидающие напоминания вручную."""
    if not reminder_service:
        raise HTTPException(status_code=500, detail="Reminder service not available")
    
    sent_count = await reminder_service.send_pending_reminders()
    
    logger.info(f"Manual reminder send triggered by user {user.chat_id}, sent {sent_count}")
    return {"message": f"Sent {sent_count} reminders"}


# === Шаблоны напоминаний ===

@router.get("/templates", response_model=List[ReminderTemplateResponse])
async def get_reminder_templates(
    reminder_type: Optional[ReminderType] = None,
    channel: Optional[NotificationChannel] = None,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Получить шаблоны напоминаний."""
    query = select(ReminderTemplate).where(ReminderTemplate.is_active == True)
    
    if reminder_type:
        query = query.where(ReminderTemplate.reminder_type == reminder_type)
    if channel:
        query = query.where(ReminderTemplate.channel == channel)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/templates", response_model=ReminderTemplateResponse)
async def create_reminder_template(
    template: ReminderTemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Создать шаблон напоминания."""
    db_template = ReminderTemplate(**template.model_dump())
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    
    logger.info(f"Created reminder template {db_template.id} by user {user.chat_id}")
    return db_template


@router.put("/templates/{template_id}", response_model=ReminderTemplateResponse)
async def update_reminder_template(
    template_id: int,
    update: ReminderTemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Обновить шаблон напоминания."""
    result = await db.execute(select(ReminderTemplate).where(ReminderTemplate.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    
    await db.commit()
    await db.refresh(template)
    
    logger.info(f"Updated reminder template {template_id} by user {user.chat_id}")
    return template


@router.delete("/templates/{template_id}")
async def delete_reminder_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Удалить шаблон напоминания."""
    result = await db.execute(select(ReminderTemplate).where(ReminderTemplate.id == template_id))
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.is_active = False  # Мягкое удаление
    await db.commit()
    
    logger.info(f"Deactivated reminder template {template_id} by user {user.chat_id}")
    return {"message": "Template deactivated"}


# === Логи уведомлений ===

@router.get("/logs", response_model=List[NotificationLogResponse])
async def get_notification_logs(
    client_id: Optional[int] = None,
    channel: Optional[NotificationChannel] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить логи отправленных уведомлений."""
    query = select(NotificationLog)
    
    if client_id:
        query = query.where(NotificationLog.client_id == client_id)
    if channel:
        query = query.where(NotificationLog.channel == channel)
    if status:
        query = query.where(NotificationLog.status == status)
    
    query = query.order_by(NotificationLog.sent_at.desc()).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


# === Статистика ===

@router.get("/stats")
async def get_reminder_stats(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить статистику по напоминаниям."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Общая статистика
    result = await db.execute(select(Reminder))
    all_reminders = result.scalars().all()
    
    # Статистика за период
    result = await db.execute(
        select(NotificationLog).where(NotificationLog.sent_at >= cutoff_date)
    )
    recent_logs = result.scalars().all()
    
    # Считаем метрики
    total_reminders = len(all_reminders)
    sent_reminders = len([r for r in all_reminders if r.is_sent])
    success_rate = (sent_reminders / total_reminders * 100) if total_reminders > 0 else 0
    
    recent_sent = len([l for l in recent_logs if l.status == 'sent'])
    recent_failed = len([l for l in recent_logs if l.status == 'failed'])
    
    return {
        "total_reminders": total_reminders,
        "sent_reminders": sent_reminders,
        "success_rate": round(success_rate, 2),
        "recent_sent": recent_sent,
        "recent_failed": recent_failed,
        "period_days": days
    }
