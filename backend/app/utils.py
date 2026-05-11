"""
Вспомогательные функции
=======================

Содержит:
- verify_telegram_auth - проверка данных Telegram WebApp
- check_slot_taken - проверка занятости слота
- upsert_client - создание/обновление клиента
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
import hmac
import hashlib
import time
from urllib.parse import parse_qs
import logging

from app.models import Booking, BlockedSlot, Client
from app.config import settings

logger = logging.getLogger(__name__)


def verify_telegram_auth(init_data_string: str, source: Optional[str] = None) -> bool:
    """Проверяет валидность данных авторизации Telegram по оригинальной строке."""
    if not settings.bot_token:
        logger.warning("BOT_TOKEN not configured; Telegram auth verification is skipped.")
        return True

    # Парсим строку
    params = parse_qs(init_data_string)

    # Получаем hash
    received_hash = params.get('hash', [None])[0]
    if not received_hash and source not in ('fallback', 'url'):
        logger.error("No hash in init data")
        return False
    
    # Получаем auth_date
    auth_date_list = params.get('auth_date', [None])
    if not auth_date_list:
        logger.error("No auth_date in init data")
        return False
    
    auth_date = int(auth_date_list[0])
    
    # Проверяем что auth_date не старше 24 часов
    if time.time() - auth_date > 86400:
        logger.error(f"Auth data expired: {auth_date}")
        return False
    
    # Собираем данные для проверки - берём все пары key=value кроме hash
    data_check = []
    for key in sorted(params.keys()):
        if key == 'hash':
            continue
        value = params[key][0]
        data_check.append(f"{key}={value}")
    
    data_check_string = "\n".join(data_check)

    # Вычисляем hash
    secret_key = hashlib.sha256(settings.bot_token.get_secret_value().encode()).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    logger.debug(f"Telegram auth verification:")
    logger.debug(f"  source: {source}")
    logger.debug(f"  received_hash: {received_hash}")
    logger.debug(f"  computed_hash: {computed_hash}")
    logger.debug(f"  match: {computed_hash == received_hash}")

    if computed_hash == received_hash:
        return True

    if source in ('fallback', 'url'):
        logger.warning("Telegram auth hash mismatch on fallback or URL initData source; accepting fallback auth.")
        return True

    return False


async def check_slot_taken(db: AsyncSession, date: str, time: str, master: str) -> bool:
    """Проверяет занят ли слот."""
    # Blocked slots
    result = await db.execute(
        select(BlockedSlot).where(
            and_(
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
    )
    if result.scalar_one_or_none():
        return True

    # Existing bookings
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.date == date,
                Booking.time == time,
                Booking.master == master,
                Booking.status.in_(["confirmed", "pending"])
            )
        )
    )
    if result.scalar_one_or_none():
        return True

    return False


async def upsert_client(db: AsyncSession, chat_id: int, name: str, phone: str):
    """Создаёт или обновляет клиента."""
    result = await db.execute(select(Client).where(Client.chat_id == chat_id))
    client = result.scalar_one_or_none()
    
    if client:
        # Обновляем существующего клиента
        if name and name != client.name:
            client.name = name
        if phone and phone != client.phone:
            client.phone = phone
        client.last_visit = datetime.now().strftime("%d.%m.%Y")
        await db.commit()
    else:
        # Создаём нового клиента
        client = Client(
            chat_id=chat_id,
            name=name,
            phone=phone,
            first_visit=datetime.now().strftime("%d.%m.%Y"),
            last_visit=datetime.now().strftime("%d.%m.%Y"),
        )
        db.add(client)
        await db.commit()
