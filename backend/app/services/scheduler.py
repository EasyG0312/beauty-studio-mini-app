"""
Инициализация планировщика задач (APScheduler)
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select
from datetime import datetime
import logging

from app.database import get_db
from app.models import Booking, Client, Notification
from app.services.notification_service import NotificationService, notification_service

logger = logging.getLogger(__name__)

# Глобальный экземпляр планировщика
scheduler: AsyncIOScheduler | None = None


def create_scheduler(db_session_factory: async_sessionmaker) -> AsyncIOScheduler:
    """Создать и настроить планировщик задач."""
    scheduler = AsyncIOScheduler()
    
    # Задача 1: Проверка и отправка уведомлений каждые 5 минут
    scheduler.add_job(
        check_and_send_notifications,
        trigger=IntervalTrigger(minutes=5),
        id='send_notifications',
        name='Check and send notifications',
        replace_existing=True,
        kwargs={'db_session_factory': db_session_factory}
    )
    
    # Задача 2: Создание напоминаний для новых записей (каждый час)
    scheduler.add_job(
        create_reminders_for_new_bookings,
        trigger=IntervalTrigger(hours=1),
        id='create_reminders',
        name='Create reminders for new bookings',
        replace_existing=True,
        kwargs={'db_session_factory': db_session_factory}
    )
    
    # Задача 3: Проверка лояльности клиентов (каждый день в 00:00)
    scheduler.add_job(
        check_loyalty_status,
        trigger=CronTrigger(hour=0, minute=0),
        id='check_loyalty',
        name='Check loyalty status',
        replace_existing=True,
        kwargs={'db_session_factory': db_session_factory}
    )
    
    return scheduler


async def check_and_send_notifications(db_session_factory: async_sessionmaker):
    """Проверить и отправить уведомления, которые наступили."""
    logger.info("Checking for due notifications...")
    
    async with db_session_factory() as db:
        notifications = await notification_service.get_due_notifications(db)
        
        for notification in notifications:
            try:
                # Отправляем через Telegram
                success = await notification_service.send_telegram_message(
                    notification.chat_id,
                    notification.message
                )
                
                if success:
                    await notification_service.mark_as_sent(db, notification)
                    logger.info(f"Notification {notification.id} sent to {notification.chat_id}")
                else:
                    logger.warning(f"Failed to send notification {notification.id}")
                
            except Exception as e:
                logger.error(f"Error sending notification {notification.id}: {e}")
    
    logger.info(f"Processed {len(notifications)} notifications")


async def create_reminders_for_new_bookings(db_session_factory: async_sessionmaker):
    """Создать напоминания для записей без напоминаний."""
    logger.info("Creating reminders for new bookings...")
    
    async with db_session_factory() as db:
        # Найти записи без напоминаний
        result = await db.execute(
            select(Booking)
            .where(Booking.reminded_1d == False)
            .where(Booking.status.in_(['pending', 'confirmed']))
        )
        bookings = result.scalars().all()
        
        for booking in bookings:
            if booking.chat_id:
                await notification_service.create_booking_reminders(db, booking)
                booking.reminded_1d = True
                booking.reminded_3d = True
                booking.reminded_1h = True
        
        await db.commit()
    
    logger.info(f"Created reminders for {len(bookings)} bookings")


async def check_loyalty_status(db_session_factory: async_sessionmaker):
    """Проверить и обновить статус лояльности клиентов."""
    logger.info("Checking loyalty status...")
    
    LOYALTY_VISITS = 5
    
    async with db_session_factory() as db:
        result = await db.execute(
            select(Client)
            .where(Client.is_loyal == False)
            .where(Client.visit_count >= LOYALTY_VISITS)
        )
        clients = result.scalars().all()
        
        for client in clients:
            client.is_loyal = True
            
            # Создать уведомление
            await notification_service.send_loyalty_notification(db, client)
            logger.info(f"Client {client.chat_id} is now loyal")
        
        await db.commit()
    
    logger.info(f"Updated {len(clients)} clients to loyal status")


# Глобальный планировщик
scheduler: AsyncIOScheduler = None


def get_scheduler() -> AsyncIOScheduler:
    """Получить глобальный планировщик."""
    return scheduler


def init_scheduler(db_session_factory: async_sessionmaker):
    """Инициализировать глобальный планировщик."""
    global scheduler
    scheduler = create_scheduler(db_session_factory)
    return scheduler


def start_scheduler():
    """Запустить планировщик."""
    if scheduler:
        scheduler.start()
        logger.info("Scheduler started")


def shutdown_scheduler():
    """Остановить планировщик."""
    if scheduler:
        scheduler.shutdown()
        logger.info("Scheduler shutdown")
