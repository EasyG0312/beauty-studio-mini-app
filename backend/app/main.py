from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func as sa_func, update
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import hmac
import hashlib
import logging

from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from app.database import get_db, init_db, get_db_session_factory
from app.models import Booking, Client, Review, BlockedSlot, Waitlist, Blacklist, MasterPhoto, ChatMessage, Portfolio, Notification, MasterSchedule, MasterTimeOff, BotSettings, PromoCode
from app.schemas import (
    BookingCreate, BookingUpdate, BookingResponse,
    ClientResponse, ReviewCreate, WaitlistCreate,
    AnalyticsSummary, RevenueStats, MasterKPI,
    MessageResponse, SlotAvailability, TelegramAuth, AuthResponse,
    BlacklistCreate, BlacklistResponse, PortfolioResponse,
    ChatMessageCreate, ChatMessageResponse,
    RevenueForecast, ClientRFM,
    BookingReschedule, LoyaltyStatus, NotificationCreate, NotificationResponse,
    PortfolioCreate, PortfolioUpdate, PortfolioCategory,
    FunnelStats, DailyStats, HourlyHeatmap, ComparisonStats,
    MasterPerformance, AnalyticsDashboard,
    MasterScheduleCreate, MasterScheduleResponse, MasterScheduleUpdate,
    MasterTimeOffCreate, MasterTimeOffResponse, MasterTimeOffUpdate,
    MasterAvailability,
    PromoCodeCreate, PromoCodeResponse, PromoCodeApply, PromoCodeValidationResult
)
from app.services import init_scheduler, start_scheduler, notification_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    db_session_factory = get_db_session_factory()
    init_scheduler(db_session_factory)
    start_scheduler()
    logger.info("Scheduler initialized and started")
    yield
    # Shutdown
    logger.info("Shutting down")


app = FastAPI(title="Beauty Studio API", version="1.0.0", lifespan=lifespan)

# Средние цены для расчёта выручки (сом)
SERVICES_PRICES = {
    "Стрижка": 1200,
    "Маникюр": 900,
    "Массаж лица": 1500,
    "Макияж": 1800,
    "Окрашивание": 2500,
}

# === Health Check ===
@app.get("/health")
async def health_check():
    """Простой health check для мониторинга (UptimeRobot и др.)."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "beauty-studio-backend"
    }

@app.get("/")
async def root():
    """Корень API."""
    return {
        "message": "Beauty Studio API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# CORS
# Allow configuring CORS origins via settings.cors_origins (comma-separated).
# If the special value '*' is used, browsers disallow credentials with a wildcard origin,
# so we automatically disable allow_credentials in that case to avoid invalid responses.
allow_origins = settings.cors_origins_list
allow_credentials = True
if len(allow_origins) == 1 and allow_origins[0] == '*':
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)  # Не вызывать ошибку если нет токена


# === Helpers ===
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[Client]:
    """Получает текущего пользователя из JWT токена (опционально)."""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[settings.jwt_algorithm])
        chat_id = payload.get("sub")
        if not chat_id:
            return None

        result = await db.execute(select(Client).where(Client.chat_id == int(chat_id)))
        return result.scalar_one_or_none()
    except (jwt.PyJWTError, ValueError):
        return None


def verify_telegram_auth(auth_data: TelegramAuth) -> bool:
    """Проверяет валидность данных авторизации Telegram."""
    import time

    # Проверяем что auth_date не старше 24 часов
    if time.time() - auth_data.auth_date > 86400:
        return False

    # Собираем данные для проверки (все поля которые отправляет Telegram)
    data_check = []
    
    if auth_data.query_id:
        data_check.append(f"query_id={auth_data.query_id}")
    
    # User field as JSON
    user_dict = {
        "id": auth_data.id,
        "first_name": auth_data.first_name,
    }
    if auth_data.last_name:
        user_dict["last_name"] = auth_data.last_name
    if auth_data.username:
        user_dict["username"] = auth_data.username
    if auth_data.language_code:
        user_dict["language_code"] = auth_data.language_code
    if auth_data.photo_url:
        user_dict["photo_url"] = auth_data.photo_url
    if auth_data.allows_write_to_pm is not None:
        user_dict["allows_write_to_pm"] = str(auth_data.allows_write_to_pm).lower()
    
    import json
    data_check.append(f"user={json.dumps(user_dict, ensure_ascii=False)}")
    data_check.append(f"auth_date={auth_data.auth_date}")
    
    # Sort and join
    data_check.sort()
    data_check_string = "\n".join(data_check)

    # Вычисляем hash
    secret_key = hashlib.sha256(settings.bot_token.get_secret_value().encode()).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return computed_hash == auth_data.hash


def create_jwt_token(chat_id: int) -> str:
    """Создаёт JWT токен для пользователя."""
    return jwt.encode(
        {"sub": str(chat_id), "exp": datetime.utcnow().replace(hour=23, minute=59, second=59)},
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm
    )


# === Auth ===
@app.post("/api/auth/telegram", response_model=AuthResponse)
async def auth_telegram(auth_data: TelegramAuth, db: AsyncSession = Depends(get_db)):
    """Авторизация через Telegram WebApp."""
    # TODO: Вернуть проверку хэша после отладки
    # if not verify_telegram_auth(auth_data):
    #     raise HTTPException(status_code=401, detail="Invalid Telegram auth data")
    
    logger.info(f"Telegram auth received for user {auth_data.id} (hash check disabled for debugging)")
    
    # Ищем или создаём клиента
    result = await db.execute(select(Client).where(Client.chat_id == auth_data.id))
    client = result.scalar_one_or_none()
    
    if not client:
        client = Client(
            chat_id=auth_data.id,
            name=f"{auth_data.first_name} {auth_data.last_name or ''}".strip(),
            phone="",  # Клиент должен будет указать при записи
            first_visit=datetime.now().strftime("%d.%m.%Y"),
            last_visit=datetime.now().strftime("%d.%m.%Y"),
        )
        db.add(client)
        await db.commit()
        await db.refresh(client)
    
    # Определяем роль
    role = "client"
    if auth_data.id in settings.admin_ids_list:
        role = "manager"
    if auth_data.id in settings.owner_ids_list:
        role = "owner"
    
    token = create_jwt_token(auth_data.id)
    
    return AuthResponse(access_token=token, role=role, user_id=auth_data.id)


# === Bookings ===
@app.get("/api/bookings", response_model=list[BookingResponse])
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


@app.get("/api/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Получить конкретную запись."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.post("/api/bookings", response_model=BookingResponse)
async def create_booking(
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


@app.delete("/api/bookings/{booking_id}")
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Отменить запись с проверкой CANCEL_HOURS."""
    CANCEL_HOURS = 5  # часов
    
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


@app.put("/api/bookings/{booking_id}", response_model=BookingResponse)
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


@app.delete("/api/bookings/{booking_id}")
async def delete_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить запись."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.delete(booking)
    await db.commit()
    return {"message": "Booking deleted"}


# === Slots ===
@app.get("/api/slots/{date}", response_model=SlotAvailability)
async def get_available_slots(
    date: str,
    master: str = "all",
    db: AsyncSession = Depends(get_db)
):
    """Получить доступные слоты на дату."""
    all_slots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
    
    # Заблокированные слоты
    result = await db.execute(
        select(BlockedSlot.time).where(
            BlockedSlot.date == date,
            or_(BlockedSlot.master == master, BlockedSlot.master == "all")
        )
    )
    blocked = {row[0] for row in result.all()}
    
    # Занятые слоты
    if master == "all":
        result = await db.execute(
            select(Booking.time).where(
                Booking.date == date,
                Booking.status.in_(["confirmed", "pending"])
            )
        )
    else:
        result = await db.execute(
            select(Booking.time).where(
                Booking.date == date,
                Booking.master == master,
                Booking.status.in_(["confirmed", "pending"])
            )
        )
    booked = {row[0] for row in result.all()}
    
    taken = blocked | booked
    available = [s for s in all_slots if s not in taken]
    
    return SlotAvailability(
        date=date,
        master=master,
        available_slots=available,
        booked_slots=list(booked)
    )


# === Analytics ===
@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить сводную аналитику (для владельца)."""
    today = datetime.now().strftime("%d.%m.%Y")
    
    # Клиенты
    result = await db.execute(select(Client))
    clients = result.scalars().all()
    loyal_count = sum(1 for c in clients if c.is_loyal)
    
    # Записи
    result = await db.execute(select(Booking).where(Booking.date == today))
    today_bookings = result.scalars().all()
    
    result = await db.execute(
        select(Booking).where(Booking.status.in_(["confirmed", "pending"]))
    )
    all_bookings = result.scalars().all()
    
    # Выручка
    revenue_7d = await calculate_revenue(db, 7)
    revenue_30d = await calculate_revenue(db, 30)
    
    # Рейтинг
    result = await db.execute(select(Review))
    reviews = result.scalars().all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
    
    return AnalyticsSummary(
        total_clients=len(clients),
        loyal_clients=loyal_count,
        today_bookings=len([b for b in today_bookings if b.status in ["confirmed", "pending"]]),
        week_bookings=len([b for b in all_bookings if b.status in ["confirmed", "pending"]]),
        total_bookings=len(all_bookings),
        revenue_7d=revenue_7d,
        revenue_30d=revenue_30d,
        avg_rating=avg_rating,
        confirmed=len([b for b in all_bookings if b.status == "confirmed"]),
        cancelled=len([b for b in all_bookings if b.status == "cancelled"]),
        no_show=len([b for b in all_bookings if b.status == "no_show"]),
    )


# === Utils ===
async def check_slot_taken(db: AsyncSession, date: str, time: str, master: str) -> bool:
    """Проверяет занят ли слот."""
    # Blocked slots
    result = await db.execute(
        select(BlockedSlot).where(
            BlockedSlot.date == date,
            or_(
                BlockedSlot.time == time,
                BlockedSlot.time == "ALL"
            ),
            or_(
                BlockedSlot.master == master,
                BlockedSlot.master == "all"
            )
        )
    )
    if result.scalar_one_or_none():
        return True
    
    # Booked slots
    if master == "all":
        result = await db.execute(
            select(Booking).where(
                Booking.date == date,
                Booking.time == time,
                Booking.status.in_(["confirmed", "pending"])
            )
        )
    else:
        result = await db.execute(
            select(Booking).where(
                Booking.date == date,
                Booking.time == time,
                Booking.master == master,
                Booking.status.in_(["confirmed", "pending"])
            )
        )
    return result.scalar_one_or_none() is not None


async def upsert_client(db: AsyncSession, chat_id: int, name: str, phone: str):
    """Создаёт или обновляет клиента."""
    result = await db.execute(select(Client).where(Client.chat_id == chat_id))
    client = result.scalar_one_or_none()
    
    now = datetime.now().strftime("%d.%m.%Y")
    if client:
        client.name = name
        client.phone = phone
        client.last_visit = now
    else:
        db.add(Client(
            chat_id=chat_id,
            name=name,
            phone=phone,
            first_visit=now,
            last_visit=now,
        ))
    await db.commit()


async def calculate_revenue(db: AsyncSession, days: int) -> float:
    """Считает выручку за период."""
    from datetime import timedelta
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%d.%m.%Y")
    
    result = await db.execute(
        select(Booking.actual_amount, Booking.service).where(
            Booking.date >= cutoff,
            Booking.status == "completed"
        )
    )
    rows = result.all()
    
    prices = {
        "Стрижка": 1200,
        "Маникюр": 900,
        "Массаж лица": 1500,
        "Макияж": 1800,
        "Окрашивание": 2500,
    }
    
    total = 0
    for amount, service in rows:
        if amount and amount > 0:
            total += amount
        else:
            total += prices.get(service, 0)
    
    return total


# === Loyalty & Client Utils ===
@app.get("/api/clients/{chat_id}/loyalty", response_model=LoyaltyStatus)
async def get_loyalty_status(
    chat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить статус лояльности клиента."""
    result = await db.execute(select(Client).where(Client.chat_id == chat_id))
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    LOYALTY_VISITS = 5
    LOYALTY_DISCOUNT = 10
    
    # Считаем общую сумму скидок
    bookings_result = await db.execute(
        select(Booking)
        .where(Booking.chat_id == chat_id, Booking.status == "completed")
    )
    bookings = bookings_result.scalars().all()
    
    total_saved = sum(
        (b.actual_amount or 0) * 0.1  # 10% скидка
        for b in bookings 
        if client.visit_count >= LOYALTY_VISITS
    )
    
    next_reward_at = max(0, LOYALTY_VISITS - (client.visit_count % LOYALTY_VISITS))
    if client.visit_count >= LOYALTY_VISITS and client.visit_count % LOYALTY_VISITS == 0:
        next_reward_at = LOYALTY_VISITS
    
    return LoyaltyStatus(
        chat_id=client.chat_id,
        visit_count=client.visit_count,
        is_loyal=client.is_loyal,
        discount_percent=LOYALTY_DISCOUNT if client.is_loyal else 0,
        next_reward_at=next_reward_at,
        total_saved=total_saved
    )


@app.post("/api/bookings/reschedule")
async def reschedule_booking(
    reschedule: BookingReschedule,
    db: AsyncSession = Depends(get_db)
):
    """Перенос записи на новое время."""
    # Получаем текущую запись
    result = await db.execute(
        select(Booking).where(Booking.id == reschedule.booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Нельзя перенести эту запись")
    
    # Проверяем доступность нового слота
    is_taken = await check_slot_taken(db, reschedule.new_date, reschedule.new_time, booking.master)
    if is_taken:
        raise HTTPException(status_code=409, detail="Это время уже занято")
    
    # Обновляем запись
    booking.date = reschedule.new_date
    booking.time = reschedule.new_time
    booking.is_reschedule = True
    if reschedule.reason:
        booking.comment = f"{booking.comment}\n[Перенос: {reschedule.reason}]"
    
    await db.commit()
    
    return {"message": "Запись перенесена", "booking_id": booking.id}


# === Notifications API ===
@app.get("/api/notifications/pending", response_model=List[NotificationResponse])
async def get_pending_notifications(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить ожидающие уведомления (для менеджера/владельца)."""
    result = await db.execute(
        select(Notification)
        .where(Notification.sent == False)
        .order_by(Notification.send_at)
        .limit(50)
    )
    return result.scalars().all()


@app.post("/api/notifications", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Создать уведомление."""
    db_notification = Notification(**notification.model_dump())
    db.add(db_notification)
    await db.commit()
    await db.refresh(db_notification)
    return db_notification


@app.post("/api/notifications/{notification_id}/send")
async def send_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Отправить уведомление (пометить как отправленное)."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.sent = True
    notification.sent_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    
    await db.commit()
    
    # Здесь должна быть интеграция с Telegram Bot API для отправки
    # bot.send_message(notification.chat_id, notification.message)
    
    return {"message": "Notification sent", "chat_id": notification.chat_id}


# === Reviews API ===
@app.get("/api/reviews", response_model=List[ReviewCreate])
async def get_reviews(
    limit: int = 20,
    rating_filter: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить отзывы с фильтрацией."""
    query = select(Review)
    if rating_filter:
        query = query.where(Review.rating == rating_filter)
    
    result = await db.execute(query.order_by(Review.created_at.desc()).limit(limit))
    return result.scalars().all()


@app.post("/api/reviews", response_model=ReviewCreate)
async def create_review(
    review: ReviewCreate,
    db: AsyncSession = Depends(get_db)
):
    """Создать отзыв."""
    db_review = Review(**review.model_dump())
    db_review.created_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    db.add(db_review)
    
    # Пометим что отзыв отправлен
    await db.execute(
        select(Booking).where(Booking.id == review.booking_id)
    )
    booking = (await db.execute(
        select(Booking).where(Booking.id == review.booking_id)
    )).scalar_one_or_none()
    
    if booking:
        booking.review_sent = True
    
    await db.commit()
    await db.refresh(db_review)
    return db_review


# === Waitlist API ===
@app.get("/api/waitlist", response_model=List[WaitlistCreate])
async def get_waitlist(
    date: Optional[str] = None,
    master: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить лист ожидания."""
    query = select(Waitlist)
    if date:
        query = query.where(Waitlist.date == date)
    if master:
        query = query.where(Waitlist.master == master)
    
    result = await db.execute(query.order_by(Waitlist.created_at))
    return result.scalars().all()


@app.post("/api/waitlist", response_model=WaitlistCreate)
async def add_to_waitlist(
    waitlist: WaitlistCreate,
    db: AsyncSession = Depends(get_db)
):
    """Добавить в лист ожидания."""
    db_waitlist = Waitlist(**waitlist.model_dump())
    db_waitlist.created_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    db.add(db_waitlist)
    await db.commit()
    await db.refresh(db_waitlist)
    return db_waitlist


@app.delete("/api/waitlist/{waitlist_id}")
async def remove_from_waitlist(
    waitlist_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Удалить из листа ожидания."""
    result = await db.execute(select(Waitlist).where(Waitlist.id == waitlist_id))
    waitlist = result.scalar_one_or_none()
    if not waitlist:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    await db.delete(waitlist)
    await db.commit()
    return {"message": "Removed from waitlist"}


# === Blacklist API ===
@app.get("/api/blacklist", response_model=List[BlacklistResponse])
async def get_blacklist(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить чёрный список (только для менеджеров/владельцев)."""
    result = await db.execute(select(Blacklist).order_by(Blacklist.added_at.desc()))
    return result.scalars().all()


@app.post("/api/blacklist", response_model=BlacklistResponse)
async def add_to_blacklist(
    blacklist: BlacklistCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Добавить в чёрный список."""
    db_blacklist = Blacklist(**blacklist.model_dump())
    db_blacklist.added_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    db_blacklist.added_by = user.chat_id
    db.add(db_blacklist)
    await db.commit()
    await db.refresh(db_blacklist)
    return db_blacklist


@app.delete("/api/blacklist/{chat_id}")
async def remove_from_blacklist(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Удалить из чёрного списка."""
    result = await db.execute(select(Blacklist).where(Blacklist.chat_id == chat_id))
    blacklist = result.scalar_one_or_none()
    if not blacklist:
        raise HTTPException(status_code=404, detail="Not in blacklist")
    
    await db.delete(blacklist)
    await db.commit()
    return {"message": "Removed from blacklist"}


# === Portfolio API ===
@app.get("/api/portfolio", response_model=List[PortfolioResponse])
async def get_portfolio(
    category: Optional[str] = None,
    master: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Получить портфолио работ с фильтрацией."""
    query = select(Portfolio).where(Portfolio.is_public == True)
    
    if category:
        query = query.where(Portfolio.category == category)
    if master:
        query = query.where(Portfolio.master == master)
    
    result = await db.execute(query.order_by(Portfolio.added_at.desc()).limit(limit))
    return result.scalars().all()


@app.get("/api/portfolio/by-service/{service}", response_model=List[PortfolioResponse])
async def get_portfolio_by_service(
    service: str,
    db: AsyncSession = Depends(get_db)
):
    """Получить портфолио по услуге."""
    # Маппинг услуг на категории
    service_to_category = {
        "Стрижка": "haircut",
        "Маникюр": "manicure",
        "Макияж": "makeup",
        "Массаж лица": "massage",
        "Окрашивание": "coloring",
    }
    
    category = service_to_category.get(service.lower(), "general")
    
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.category == category)
        .where(Portfolio.is_public == True)
        .order_by(Portfolio.added_at.desc())
    )
    return result.scalars().all()


@app.post("/api/portfolio", response_model=PortfolioResponse)
async def add_to_portfolio(
    portfolio: PortfolioCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Добавить фото в портфолио."""
    # Валидация file_id через Telegram
    is_valid = await telegram_file_service.validate_file_id(portfolio.file_id)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Telegram file_id")
    
    db_portfolio = Portfolio(**portfolio.model_dump())
    db_portfolio.added_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    db.add(db_portfolio)
    await db.commit()
    await db.refresh(db_portfolio)
    return db_portfolio


@app.put("/api/portfolio/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    update: PortfolioUpdate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Обновить информацию о фото в портфолио."""
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(portfolio, field, value)
    
    await db.commit()
    await db.refresh(portfolio)
    return portfolio


@app.delete("/api/portfolio/{portfolio_id}")
async def delete_from_portfolio(
    portfolio_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Удалить фото из портфолио."""
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio item not found")

    await db.delete(portfolio)
    await db.commit()
    return {"message": "Deleted"}


# === Master Photos API ===
@app.get("/api/masters/photos", response_model=List[dict])
async def get_all_master_photos(db: AsyncSession = Depends(get_db)):
    """Получить все фото мастеров."""
    result = await db.execute(select(MasterPhoto))
    photos = result.scalars().all()
    
    return [
        {
            "master": p.master,
            "file_id": p.file_id,
            "added_at": p.added_at,
            "photo_url": await telegram_file_service.get_file_url(p.file_id)
        }
        for p in photos
    ]


@app.post("/api/masters/{master_name}/photo", response_model=dict)
async def add_master_photo(
    master_name: str,
    file_id: str,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Добавить фото мастера."""
    # Валидация file_id
    is_valid = await telegram_file_service.validate_file_id(file_id)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Telegram file_id")
    
    db_photo = MasterPhoto(
        master=master_name,
        file_id=file_id,
        added_at=datetime.now().strftime("%d.%m.%Y %H:%M")
    )
    db.add(db_photo)
    await db.commit()
    await db.refresh(db_photo)
    
    return {
        "master": master_name,
        "file_id": file_id,
        "photo_url": await telegram_file_service.get_file_url(file_id)
    }


@app.get("/api/masters/{master_name}/photo", response_model=dict)
async def get_master_photo(
    master_name: str,
    db: AsyncSession = Depends(get_db)
):
    """Получить фото мастера."""
    result = await db.execute(select(MasterPhoto).where(MasterPhoto.master == master_name))
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Master photo not found")
    
    photo_url = await telegram_file_service.get_file_url(photo.file_id)
    
    return {
        "master": photo.master,
        "file_id": photo.file_id,
        "photo_url": photo_url,
        "added_at": photo.added_at
    }


# === Chat Messages API ===
@app.get("/api/chat/{chat_id}", response_model=List[ChatMessageResponse])
async def get_chat_history(
    chat_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить историю чата с клиентом."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@app.post("/api/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Отправить сообщение в чат."""
    db_message = ChatMessage(**message.model_dump())
    db_message.created_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)
    return db_message


# === Client Management API ===
@app.get("/api/clients", response_model=List[ClientResponse])
async def get_all_clients(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить всех клиентов (для менеджеров/владельцев)."""
    result = await db.execute(select(Client).order_by(Client.last_visit.desc()))
    return result.scalars().all()


@app.get("/api/clients/{chat_id}", response_model=ClientResponse)
async def get_client(
    chat_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить информацию о клиенте."""
    result = await db.execute(select(Client).where(Client.chat_id == chat_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.put("/api/clients/{chat_id}", response_model=ClientResponse)
async def update_client(
    chat_id: int,
    notes: str,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Обновить заметки о клиенте."""
    result = await db.execute(select(Client).where(Client.chat_id == chat_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.notes = notes
    await db.commit()
    await db.refresh(client)
    return client


# === Enhanced Analytics API ===
@app.get("/api/analytics/kpi", response_model=List[MasterKPI])
async def get_master_kpi(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить KPI мастеров."""
    result = await db.execute(select(Booking))
    all_bookings = result.scalars().all()
    
    masters = set(b.master for b in all_bookings)
    kpi_list = []
    
    for master in masters:
        master_bookings = [b for b in all_bookings if b.master == master]
        completed = len([b for b in master_bookings if b.status == "completed"])
        cancelled = len([b for b in master_bookings if b.status == "cancelled"])
        no_show = len([b for b in master_bookings if b.status == "no_show"])
        
        revenue = sum(b.actual_amount or 0 for b in master_bookings if b.status == "completed")
        
        # Рейтинг мастера
        reviews_result = await db.execute(
            select(Review)
            .join(Booking, Review.booking_id == Booking.id)
            .where(Booking.master == master)
        )
        reviews = reviews_result.scalars().all()
        avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
        
        total = completed + cancelled + no_show
        conversion = (completed / total * 100) if total > 0 else 0
        avg_check = (revenue / completed) if completed > 0 else 0
        
        kpi_list.append(MasterKPI(
            master=master,
            completed=completed,
            cancelled=cancelled,
            no_show=no_show,
            revenue=revenue,
            avg_rating=round(avg_rating, 2),
            conversion=round(conversion, 2),
            avg_check=round(avg_check, 2)
        ))
    
    return kpi_list


@app.get("/api/analytics/rfm", response_model=List[ClientRFM])
async def get_rfm_segments(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить RFM-сегментацию клиентов."""
    result = await db.execute(select(Client))
    clients = result.scalars().all()
    
    today = datetime.now()
    rfm_list = []
    
    for client in clients:
        # Recency - давность последнего визита
        try:
            last_visit_date = datetime.strptime(client.last_visit, "%d.%m.%Y")
            recency_days = (today - last_visit_date).days
        except:
            recency_days = 999
        
        # Frequency - частота визитов
        frequency = client.visit_count
        
        # Monetary - сумма потраченных средств
        bookings_result = await db.execute(
            select(Booking)
            .where(Booking.chat_id == client.chat_id, Booking.status == "completed")
        )
        bookings = bookings_result.scalars().all()
        monetary = sum(b.actual_amount or 0 for b in bookings)
        
        # RFM Score (1-5 для каждого параметра)
        r_score = min(5, max(1, 6 - (recency_days // 30)))  # 5 если <30 дней, 1 если >150
        f_score = min(5, max(1, frequency // 2 + 1))  # 5 если >=8 визитов
        m_score = min(5, max(1, monetary // 5000 + 1))  # 5 если >=20000 сом
        
        rfm_score = r_score * 100 + f_score * 10 + m_score
        
        # Сегмент
        if rfm_score >= 444:
            segment = "Champions"
        elif rfm_score >= 334:
            segment = "Loyal Customers"
        elif rfm_score >= 244:
            segment = "Potential Loyalists"
        elif rfm_score >= 155:
            segment = "At Risk"
        else:
            segment = "Lost"
        
        rfm_list.append(ClientRFM(
            chat_id=client.chat_id,
            name=client.name,
            phone=client.phone,
            rfm_segment=segment,
            rfm_score=rfm_score,
            visit_count=client.visit_count,
            last_visit=client.last_visit,
            total_spent=monetary
        ))
    
    return sorted(rfm_list, key=lambda x: x.rfm_score, reverse=True)


@app.get("/api/analytics/forecast", response_model=RevenueForecast)
async def get_revenue_forecast(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить прогноз выручки."""
    today = datetime.now()
    cutoff = (today - timedelta(days=days)).strftime("%d.%m.%Y")
    
    # Получаем данные за прошлый период
    result = await db.execute(
        select(Booking.actual_amount, Booking.date)
        .where(
            Booking.date >= cutoff,
            Booking.status == "completed"
        )
    )
    rows = result.all()
    
    total = sum(amount or 0 for amount, _ in rows)
    
    # Простой прогноз на основе средней дневной выручки
    daily_avg = total / days if days > 0 else 0
    forecast = daily_avg * days
    
    # Конфиденс (условно, на основе стабильности)
    confidence = 0.8 if total > 0 else 0.5
    
    return RevenueForecast(
        days=days,
        forecast=forecast,
        confidence=confidence
    )


# === Advanced Analytics API ===
@app.get("/api/analytics/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить полный дашборд аналитики."""
    today = datetime.now()
    cutoff = (today - timedelta(days=days)).strftime("%d.%m.%Y")
    
    # Все записи за период
    result = await db.execute(
        select(Booking).where(Booking.date >= cutoff)
    )
    bookings = result.scalars().all()
    
    # Общая выручка
    total_revenue = sum(
        b.actual_amount or SERVICES_PRICES.get(b.service, 0)
        for b in bookings if b.status == "completed"
    )
    
    # Статусы
    status_counts = {}
    for b in bookings:
        status_counts[b.status] = status_counts.get(b.status, 0) + 1
    
    # Конверсия
    total = len(bookings)
    completed = status_counts.get("completed", 0)
    conversion_rate = (completed / total * 100) if total > 0 else 0
    
    # Средний чек
    avg_check = (total_revenue / completed) if completed > 0 else 0
    
    # Новые и возвращающиеся клиенты
    new_clients = set()
    returning_clients = set()
    
    for b in bookings:
        if b.chat_id:
            # Проверяем первый визит
            client_result = await db.execute(
                select(Client).where(Client.chat_id == b.chat_id)
            )
            client = client_result.scalar_one_or_none()
            if client:
                try:
                    first_visit = datetime.strptime(client.first_visit, "%d.%m.%Y")
                    booking_date = datetime.strptime(b.date, "%d.%m.%Y")
                    if (booking_date - first_visit).days <= 7:
                        new_clients.add(b.chat_id)
                    else:
                        returning_clients.add(b.chat_id)
                except:
                    pass
    
    # Топ услуг
    service_stats = {}
    for b in bookings:
        if b.status == "completed":
            service_stats[b.service] = service_stats.get(b.service, 0) + 1
    
    top_services = sorted(
        [{"name": k, "count": v} for k, v in service_stats.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]
    
    # Ежедневная статистика
    daily_stats = []
    for i in range(days):
        date = (today - timedelta(days=i)).strftime("%d.%m.%Y")
        day_bookings = [b for b in bookings if b.date == date]
        day_completed = [b for b in day_bookings if b.status == "completed"]
        day_revenue = sum(
            b.actual_amount or SERVICES_PRICES.get(b.service, 0)
            for b in day_completed
        )
        daily_stats.append(DailyStats(
            date=date,
            bookings=len(day_bookings),
            completed=len(day_completed),
            revenue=day_revenue,
            avg_check=(day_revenue / len(day_completed)) if day_completed else 0
        ))
    
    # Воронка
    funnel = FunnelStats(
        total=total,
        pending=status_counts.get("pending", 0),
        confirmed=status_counts.get("confirmed", 0),
        completed=completed,
        cancelled=status_counts.get("cancelled", 0),
        no_show=status_counts.get("no_show", 0),
        conversion_rate=conversion_rate
    )
    
    # KPI мастеров
    master_perf = await get_master_kpi(db, user)
    master_performance = [
        MasterPerformance(
            master=kpi.master,
            bookings_count=kpi.completed + kpi.cancelled + kpi.no_show,
            completed_count=kpi.completed,
            revenue=kpi.revenue,
            avg_rating=kpi.avg_rating,
            conversion_rate=kpi.conversion,
            avg_check=kpi.avg_check
        )
        for kpi in master_perf
    ]
    
    return AnalyticsDashboard(
        period_days=days,
        total_revenue=total_revenue,
        total_bookings=total,
        completed_bookings=completed,
        conversion_rate=round(conversion_rate, 2),
        avg_check=round(avg_check, 2),
        new_clients=len(new_clients),
        returning_clients=len(returning_clients),
        top_services=top_services,
        daily_stats=daily_stats,
        funnel=funnel,
        master_performance=master_performance
    )


@app.get("/api/analytics/funnel", response_model=FunnelStats)
async def get_funnel_stats(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить воронку конверсии."""
    today = datetime.now()
    cutoff = (today - timedelta(days=days)).strftime("%d.%m.%Y")
    
    result = await db.execute(
        select(Booking).where(Booking.date >= cutoff)
    )
    bookings = result.scalars().all()
    
    status_counts = {}
    for b in bookings:
        status_counts[b.status] = status_counts.get(b.status, 0) + 1
    
    total = len(bookings)
    completed = status_counts.get("completed", 0)
    
    return FunnelStats(
        total=total,
        pending=status_counts.get("pending", 0),
        confirmed=status_counts.get("confirmed", 0),
        completed=completed,
        cancelled=status_counts.get("cancelled", 0),
        no_show=status_counts.get("no_show", 0),
        conversion_rate=round((completed / total * 100) if total > 0 else 0, 2)
    )


@app.get("/api/analytics/heatmap", response_model=List[HourlyHeatmap])
async def get_heatmap_data(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить тепловую карту загруженности."""
    today = datetime.now()
    cutoff = (today - timedelta(days=days)).strftime("%d.%m.%Y")
    
    result = await db.execute(
        select(Booking).where(
            Booking.date >= cutoff,
            Booking.status.in_(["confirmed", "completed"])
        )
    )
    bookings = result.scalars().all()
    
    # Группировка по дням недели и времени
    heatmap_data = {}
    for b in bookings:
        try:
            dt = datetime.strptime(b.date, "%d.%m.%Y")
            day_of_week = dt.weekday()
            hour = b.time
            
            key = (day_of_week, hour)
            heatmap_data[key] = heatmap_data.get(key, 0) + 1
        except:
            pass
    
    # Максимальное количество записей для расчёта utilization
    max_bookings = max(heatmap_data.values()) if heatmap_data else 1
    
    ALL_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
    
    heatmap = []
    for day in range(7):
        for hour in ALL_SLOTS:
            key = (day, hour)
            count = heatmap_data.get(key, 0)
            utilization = (count / max_bookings * 100) if max_bookings > 0 else 0
            
            heatmap.append(HourlyHeatmap(
                day_of_week=day,
                hour=hour,
                bookings_count=count,
                utilization_percent=round(utilization, 2)
            ))
    
    return heatmap


@app.get("/api/analytics/comparison", response_model=ComparisonStats)
async def get_comparison_stats(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить сравнение периодов (WoW, MoM)."""
    today = datetime.now()
    
    # Текущий период
    cutoff_current = (today - timedelta(days=days)).strftime("%d.%m.%Y")
    result = await db.execute(
        select(Booking.actual_amount, Booking.service).where(
            Booking.date >= cutoff_current,
            Booking.status == "completed"
        )
    )
    current_bookings = result.all()
    current_revenue = sum(
        amount or SERVICES_PRICES.get(service, 0)
        for amount, service in current_bookings
    )
    
    # Предыдущий период
    cutoff_previous = (today - timedelta(days=days*2)).strftime("%d.%m.%Y")
    result = await db.execute(
        select(Booking.actual_amount, Booking.service).where(
            Booking.date >= cutoff_previous,
            Booking.date < cutoff_current,
            Booking.status == "completed"
        )
    )
    previous_bookings = result.all()
    previous_revenue = sum(
        amount or SERVICES_PRICES.get(service, 0)
        for amount, service in previous_bookings
    )
    
    # Изменение
    if previous_revenue > 0:
        change_percent = ((current_revenue - previous_revenue) / previous_revenue) * 100
    else:
        change_percent = 100 if current_revenue > 0 else 0
    
    trend = "up" if change_percent > 5 else ("down" if change_percent < -5 else "stable")
    
    return ComparisonStats(
        current_period=current_revenue,
        previous_period=previous_revenue,
        change_percent=round(change_percent, 2),
        trend=trend
    )


@app.get("/api/analytics/export/csv")
async def export_analytics_csv(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Экспорт аналитики в CSV."""
    import csv
    import io
    
    today = datetime.now()
    cutoff = (today - timedelta(days=days)).strftime("%d.%m.%Y")
    
    result = await db.execute(
        select(Booking).where(Booking.date >= cutoff)
    )
    bookings = result.scalars().all()
    
    # Создаём CSV в памяти
    output = io.StringIO()
    fieldnames = ["ID", "Дата", "Время", "Клиент", "Телефон", "Услуга", "Мастер", "Статус", "Сумма"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for b in bookings:
        writer.writerow({
            "ID": b.id,
            "Дата": b.date,
            "Время": b.time,
            "Клиент": b.name,
            "Телефон": b.phone,
            "Услуга": b.service,
            "Мастер": b.master,
            "Статус": b.status,
            "Сумма": b.actual_amount or 0
        })
    
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analytics_{cutoff}.csv"}
    )


# === Master Schedule API ===
@app.get("/api/masters/schedule", response_model=List[MasterScheduleResponse])
async def get_master_schedule(
    master: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить расписание мастеров."""
    query = select(MasterSchedule).where(MasterSchedule.is_active == True)
    if master:
        query = query.where(MasterSchedule.master == master)
    
    result = await db.execute(query.order_by(MasterSchedule.master, MasterSchedule.day_of_week))
    return result.scalars().all()


@app.post("/api/masters/schedule", response_model=MasterScheduleResponse)
async def create_master_schedule(
    schedule: MasterScheduleCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Создать расписание для мастера."""
    # Деактивируем старое расписание для этого дня
    await db.execute(
        update(MasterSchedule)
        .where(
            MasterSchedule.master == schedule.master,
            MasterSchedule.day_of_week == schedule.day_of_week,
            MasterSchedule.is_active == True
        )
        .values(is_active=False)
    )
    
    # Создаём новое
    db_schedule = MasterSchedule(**schedule.model_dump(), is_active=True)
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)
    return db_schedule


@app.put("/api/masters/schedule/{schedule_id}", response_model=MasterScheduleResponse)
async def update_master_schedule(
    schedule_id: int,
    update: MasterScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Обновить расписание мастера."""
    result = await db.execute(select(MasterSchedule).where(MasterSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)
    
    await db.commit()
    await db.refresh(schedule)
    return schedule


@app.delete("/api/masters/schedule/{schedule_id}")
async def delete_master_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Удалить расписание (деактивировать)."""
    result = await db.execute(select(MasterSchedule).where(MasterSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule.is_active = False
    await db.commit()
    return {"message": "Schedule deleted"}


# === Master Time Off API ===
@app.get("/api/masters/time-off", response_model=List[MasterTimeOffResponse])
async def get_master_time_off(
    master: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить периоды отсутствия мастеров."""
    query = select(MasterTimeOff).where(MasterTimeOff.is_active == True)
    
    if master:
        query = query.where(MasterTimeOff.master == master)
    if start_date:
        query = query.where(MasterTimeOff.start_date >= start_date)
    if end_date:
        query = query.where(MasterTimeOff.end_date <= end_date)
    
    result = await db.execute(query.order_by(MasterTimeOff.start_date.desc()))
    return result.scalars().all()


@app.post("/api/masters/time-off", response_model=MasterTimeOffResponse)
async def create_master_time_off(
    time_off: MasterTimeOffCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Создать период отсутствия (отпуск, больничный)."""
    db_time_off = MasterTimeOff(**time_off.model_dump(), is_active=True)
    db.add(db_time_off)
    await db.commit()
    await db.refresh(db_time_off)
    return db_time_off


@app.put("/api/masters/time-off/{time_off_id}", response_model=MasterTimeOffResponse)
async def update_master_time_off(
    time_off_id: int,
    update: MasterTimeOffUpdate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Обновить период отсутствия."""
    result = await db.execute(select(MasterTimeOff).where(MasterTimeOff.id == time_off_id))
    time_off = result.scalar_one_or_none()
    if not time_off:
        raise HTTPException(status_code=404, detail="Time off not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(time_off, field, value)
    
    await db.commit()
    await db.refresh(time_off)
    return time_off


@app.delete("/api/masters/time-off/{time_off_id}")
async def delete_master_time_off(
    time_off_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Удалить период отсутствия (деактивировать)."""
    result = await db.execute(select(MasterTimeOff).where(MasterTimeOff.id == time_off_id))
    time_off = result.scalar_one_or_none()
    if not time_off:
        raise HTTPException(status_code=404, detail="Time off not found")
    
    time_off.is_active = False
    await db.commit()
    return {"message": "Time off deleted"}


@app.get("/api/masters/{master}/availability", response_model=List[MasterAvailability])
async def get_master_availability(
    master: str,
    start_date: str,
    end_date: str,
    db: AsyncSession = Depends(get_db)
):
    """Получить доступность мастера на период."""
    from datetime import timedelta
    
    # Генерируем даты
    start = datetime.strptime(start_date, "%d.%m.%Y")
    end = datetime.strptime(end_date, "%d.%m.%Y")
    dates = []
    current = start
    while current <= end:
        dates.append(current)
        current += timedelta(days=1)
    
    # Получаем расписание
    schedule_result = await db.execute(
        select(MasterSchedule).where(
            MasterSchedule.master == master,
            MasterSchedule.is_active == True
        )
    )
    schedules = {s.day_of_week: s for s in schedule_result.scalars().all()}
    
    # Получаем периоды отсутствия
    time_off_result = await db.execute(
        select(MasterTimeOff).where(
            MasterTimeOff.master == master,
            MasterTimeOff.is_active == True
        )
    )
    time_offs = time_off_result.scalars().all()
    
    availability = []
    for date in dates:
        day_of_week = date.weekday()
        date_str = date.strftime("%d.%m.%Y")
        
        # Проверяем расписание
        schedule = schedules.get(day_of_week)
        
        # Проверяем периоды отсутствия
        time_off = None
        for to in time_offs:
            to_start = datetime.strptime(to.start_date, "%d.%m.%Y")
            to_end = datetime.strptime(to.end_date, "%d.%m.%Y")
            if to_start <= date <= to_end:
                time_off = to
                break
        
        # Определяем доступность
        is_available = (schedule and schedule.is_working and not time_off) if schedule else False
        is_working = schedule.is_working if schedule else False
        reason = None
        if not is_available:
            if time_off:
                reason = f"{time_off.reason}: {time_off.comment}" if time_off.comment else time_off.reason
            elif schedule and not schedule.is_working:
                reason = "Выходной день"
            else:
                reason = "Расписание не установлено"
        
        availability.append(MasterAvailability(
            master=master,
            date=date_str,
            is_available=is_available,
            is_working=is_working,
            reason=reason,
            schedule=schedule,
            time_off=time_off
        ))
    
    return availability


# === Promo Codes API ===
@app.get("/api/promocodes", response_model=List[PromoCodeResponse])
async def get_promocodes(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить все промокоды (для менеджера/владельца)."""
    query = select(PromoCode)
    if active_only:
        query = query.where(PromoCode.is_active == True)
    
    result = await db.execute(query.order_by(PromoCode.created_at.desc()))
    return result.scalars().all()


@app.post("/api/promocodes", response_model=PromoCodeResponse)
async def create_promocode(
    promocode: PromoCodeCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Создать промокод."""
    from datetime import datetime
    db_promocode = PromoCode(**promocode.model_dump())
    db_promocode.created_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    db.add(db_promocode)
    await db.commit()
    await db.refresh(db_promocode)
    return db_promocode


@app.post("/api/promocodes/validate", response_model=PromoCodeValidationResult)
async def validate_promocode(
    validation: PromoCodeApply,
    db: AsyncSession = Depends(get_db)
):
    """Проверить промокод."""
    from datetime import datetime
    
    result = await db.execute(
        select(PromoCode).where(
            PromoCode.code == validation.code,
            PromoCode.is_active == True
        )
    )
    promocode = result.scalar_one_or_none()
    
    if not promocode:
        return PromoCodeValidationResult(
            valid=False,
            error="Промокод не найден"
        )
    
    # Проверка срока действия
    now = datetime.now()
    valid_from = datetime.strptime(promocode.valid_from, "%d.%m.%Y")
    valid_until = datetime.strptime(promocode.valid_until, "%d.%m.%Y")
    
    if valid_from > now or valid_until < now:
        return PromoCodeValidationResult(
            valid=False,
            error="Срок действия промокода истёк"
        )
    
    # Проверка лимита использования
    if promocode.usage_limit > 0 and promocode.usage_count >= promocode.usage_limit:
        return PromoCodeValidationResult(
            valid=False,
            error="Лимит использования промокода исчерпан"
        )
    
    # Проверка минимальной суммы
    booking_result = await db.execute(
        select(Booking).where(Booking.id == validation.booking_id)
    )
    booking = booking_result.scalar_one_or_none()
    
    if booking:
        booking_amount = booking.actual_amount or 0
        if promocode.min_booking_amount > 0 and booking_amount < promocode.min_booking_amount:
            return PromoCodeValidationResult(
                valid=False,
                error=f"Минимальная сумма заказа: {promocode.min_booking_amount} сом"
            )
    
    return PromoCodeValidationResult(
        valid=True,
        discount_percent=promocode.discount_percent,
        discount_amount=promocode.discount_amount
    )


@app.put("/api/promocodes/{promocode_id}", response_model=PromoCodeResponse)
async def update_promocode(
    promocode_id: int,
    update: dict,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Обновить промокод."""
    result = await db.execute(select(PromoCode).where(PromoCode.id == promocode_id))
    promocode = result.scalar_one_or_none()
    
    if not promocode:
        raise HTTPException(status_code=404, detail="Promocode not found")
    
    for field, value in update.items():
        if hasattr(promocode, field):
            setattr(promocode, field, value)
    
    await db.commit()
    await db.refresh(promocode)
    return promocode


@app.delete("/api/promocodes/{promocode_id}")
async def delete_promocode(
    promocode_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Удалить промокод (деактивировать)."""
    result = await db.execute(select(PromoCode).where(PromoCode.id == promocode_id))
    promocode = result.scalar_one_or_none()
    
    if not promocode:
        raise HTTPException(status_code=404, detail="Promocode not found")
    
    promocode.is_active = False
    await db.commit()
    
    return {"message": "Promocode deleted"}


@app.post("/api/promocodes/{promocode_id}/use")
async def use_promocode(
    promocode_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Увеличить счётчик использования промокода."""
    result = await db.execute(select(PromoCode).where(PromoCode.id == promocode_id))
    promocode = result.scalar_one_or_none()
    
    if not promocode:
        raise HTTPException(status_code=404, detail="Promocode not found")
    
    promocode.usage_count += 1
    await db.commit()
    
    return {"message": "Promocode used", "usage_count": promocode.usage_count}
    
    return availability
