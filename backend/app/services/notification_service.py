"""
Сервис уведомлений и напоминаний
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging
import httpx

from app.models import Notification, Booking, Client
from app.database import get_db
from app.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Сервис для управления уведомлениями."""
    
    REMINDER_3D_DAYS = 3
    REMINDER_1D_DAYS = 1
    REMINDER_1H_HOURS = 1
    
    def __init__(self):
        self.bot_token = settings.bot_token.get_secret_value() if hasattr(settings, 'bot_token') and settings.bot_token else ""
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else ""
    
    async def send_telegram_message(self, chat_id: int, message: str) -> bool:
        """Отправить сообщение через Telegram Bot API."""
        if not self.bot_token:
            logger.warning("Bot token not set, skipping Telegram notification")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": message,
                        "parse_mode": "HTML"
                    },
                    timeout=10.0
                )
                
                data = response.json()
                if data.get("ok"):
                    logger.info(f"Telegram message sent to {chat_id}")
                    return True
                else:
                    logger.error(f"Telegram API error: {data}")
                    return False
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        chat_id: int,
        notification_type: str,
        message: str,
        send_at: str,
        booking_id: int = None
    ) -> Notification:
        """Создать уведомление в БД."""
        notification = Notification(
            chat_id=chat_id,
            notification_type=notification_type,
            message=message,
            send_at=send_at,
            booking_id=booking_id,
            sent=False
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification
    
    async def create_booking_reminders(self, db: AsyncSession, booking: Booking) -> List[Notification]:
        """Создать напоминания для новой записи."""
        notifications = []
        
        try:
            booking_datetime = datetime.strptime(f"{booking.date} {booking.time}", "%d.%m.%Y %H:%M")
        except ValueError:
            logger.error(f"Invalid booking datetime: {booking.date} {booking.time}")
            return notifications
        
        # Напоминание за 3 дня
        reminder_3d = booking_datetime - timedelta(days=3)
        msg_3d = (
            f"🔔 <b>Напоминаем о записи за 3 дня!</b>\n\n"
            f"📅 {booking.date} в {booking.time}\n"
            f"💇 Мастер: {booking.master}\n"
            f"💅 Услуга: {booking.service}\n\n"
            f"Ждём вас!"
        )
        notif_3d = await self.create_notification(
            db, booking.chat_id, "reminder_3d", msg_3d,
            reminder_3d.strftime("%d.%m.%Y %H:%M"), booking.id
        )
        notifications.append(notif_3d)
        
        # Напоминание за 1 день
        reminder_1d = booking_datetime - timedelta(days=1)
        msg_1d = (
            f"🔔 <b>Напоминаем о записи завтра!</b>\n\n"
            f"📅 {booking.date} в {booking.time}\n"
            f"💇 Мастер: {booking.master}\n\n"
            f"До встречи!"
        )
        notif_1d = await self.create_notification(
            db, booking.chat_id, "reminder_1d", msg_1d,
            reminder_1d.strftime("%d.%m.%Y %H:%M"), booking.id
        )
        notifications.append(notif_1d)
        
        # Напоминание за 1 час
        reminder_1h = booking_datetime - timedelta(hours=1)
        msg_1h = (
            f"⏰ <b>Ваша запись через 1 час!</b>\n\n"
            f"📅 {booking.date} в {booking.time}\n"
            f"💇 Мастер: {booking.master}\n\n"
            f"Ждём вас!"
        )
        notif_1h = await self.create_notification(
            db, booking.chat_id, "reminder_1h", msg_1h,
            reminder_1h.strftime("%d.%m.%Y %H:%M"), booking.id
        )
        notifications.append(notif_1h)
        
        logger.info(f"Created {len(notifications)} reminders for booking {booking.id}")
        return notifications
    
    @staticmethod
    async def get_pending_notifications(db: AsyncSession) -> List[Notification]:
        """Получить все ожидающие уведомления."""
        result = await db.execute(
            select(Notification)
            .where(Notification.sent == False)
            .order_by(Notification.send_at)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_due_notifications(db: AsyncSession) -> List[Notification]:
        """Получить уведомления, которые пора отправить."""
        now = datetime.now().strftime("%d.%m.%Y %H:%M")
        result = await db.execute(
            select(Notification)
            .where(Notification.sent == False)
            .where(Notification.send_at <= now)
            .order_by(Notification.send_at)
        )
        return result.scalars().all()
    
    async def mark_as_sent(self, db: AsyncSession, notification: Notification) -> None:
        """Пометить уведомление как отправленное."""
        notification.sent = True
        notification.sent_at = datetime.now().strftime("%d.%m.%Y %H:%M")
        await db.commit()
    
    async def send_confirmation(self, db: AsyncSession, booking: Booking) -> Notification:
        """Отправить подтверждение записи."""
        msg = (
            f"✅ <b>Ваша запись подтверждена!</b>\n\n"
            f"📅 {booking.date} в {booking.time}\n"
            f"💇 Мастер: {booking.master}\n"
            f"💅 Услуга: {booking.service}\n\n"
            f"Ждём вас!"
        )
        notification = await self.create_notification(
            db, booking.chat_id, "confirmation", msg,
            datetime.now().strftime("%d.%m.%Y %H:%M"), booking.id
        )
        
        # Отправляем сразу через Telegram
        if booking.chat_id:
            await self.send_telegram_message(booking.chat_id, msg)
        
        return notification
    
    async def send_loyalty_notification(self, db: AsyncSession, client: Client) -> Notification:
        """Отправить уведомление о получении статуса лояльного клиента."""
        msg = (
            f"🎉 <b>Поздравляем! Вы стали постоянным клиентом!</b>\n\n"
            f"💳 Ваша скидка: 10% на все услуги\n"
            f"📊 Визитов: {client.visit_count}\n\n"
            f"Спасибо что вы с нами!"
        )
        notification = await self.create_notification(
            db, client.chat_id, "loyalty", msg,
            datetime.now().strftime("%d.%m.%Y %H:%M")
        )
        
        # Отправляем сразу через Telegram
        await self.send_telegram_message(client.chat_id, msg)
        
        return notification


# Глобальный экземпляр сервиса
notification_service = NotificationService()
