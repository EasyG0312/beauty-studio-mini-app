"""
Сервис для работы с напоминаниями
==================================

Обрабатывает:
- Создание напоминаний для записей
- Отправку уведомлений через разные каналы
- Управление шаблонами
- Планирование рассылок
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Booking, Client
from app.models.reminders import Reminder, ReminderTemplate, NotificationLog, ReminderType, NotificationChannel
from app.services.notification_service import notification_service
from app.database import get_db_session_factory
import logging

logger = logging.getLogger(__name__)


class ReminderService:
    """Сервис для управления напоминаниями"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
    
    async def create_booking_reminders(self, booking_id: int) -> List[Reminder]:
        """Создать напоминания для новой записи"""
        async with self.db_session_factory() as db:
            # Получаем информацию о записи
            result = await db.execute(select(Booking).where(Booking.id == booking_id))
            booking = result.scalar_one_or_none()
            
            if not booking:
                logger.error(f"Booking {booking_id} not found")
                return []
            
            reminders = []
            
            # Напоминание за 24 часа
            reminder_24h = await self._create_reminder(
                db, booking, ReminderType.BEFORE_24H, 
                datetime.strptime(f"{booking.date} {booking.time}", "%d.%m.%Y %H:%M") - timedelta(hours=24)
            )
            if reminder_24h:
                reminders.append(reminder_24h)
            
            # Напоминание за 2 часа
            reminder_2h = await self._create_reminder(
                db, booking, ReminderType.BEFORE_2H,
                datetime.strptime(f"{booking.date} {booking.time}", "%d.%m.%Y %H:%M") - timedelta(hours=2)
            )
            if reminder_2h:
                reminders.append(reminder_2h)
            
            await db.commit()
            logger.info(f"Created {len(reminders)} reminders for booking {booking_id}")
            return reminders
    
    async def _create_reminder(
        self, 
        db: AsyncSession, 
        booking: Booking, 
        reminder_type: ReminderType,
        scheduled_at: datetime
    ) -> Optional[Reminder]:
        """Создать одно напоминание"""
        try:
            # Получаем шаблон
            template = await self._get_template(db, reminder_type)
            if not template:
                logger.warning(f"No template found for {reminder_type}")
                return None
            
            # Формируем сообщение
            message = self._format_message(template, booking)
            
            reminder = Reminder(
                booking_id=booking.id,
                client_id=booking.chat_id,
                reminder_type=reminder_type,
                channel=NotificationChannel.TELEGRAM,  # По умолчанию Telegram
                scheduled_at=scheduled_at,
                message_text=message,
                template_data=json.dumps({
                    'booking_id': booking.id,
                    'client_name': booking.name,
                    'service': booking.service,
                    'master': booking.master,
                    'date': booking.date,
                    'time': booking.time
                })
            )
            
            db.add(reminder)
            return reminder
            
        except Exception as e:
            logger.error(f"Error creating reminder: {e}")
            return None
    
    async def _get_template(self, db: AsyncSession, reminder_type: ReminderType) -> Optional[ReminderTemplate]:
        """Получить шаблон для типа напоминания"""
        result = await db.execute(
            select(ReminderTemplate).where(
                and_(
                    ReminderTemplate.reminder_type == reminder_type,
                    ReminderTemplate.channel == NotificationChannel.TELEGRAM,
                    ReminderTemplate.is_active == True
                )
            )
        )
        return result.scalar_one_or_none()
    
    def _format_message(self, template: ReminderTemplate, booking: Booking) -> str:
        """Форматировать сообщение из шаблона"""
        message = template.template_text
        
        # Заменяем переменные
        replacements = {
            '{client_name}': booking.name,
            '{service}': booking.service,
            '{master}': booking.master,
            '{date}': booking.date,
            '{time}': booking.time,
            '{salon_name}': 'Beauty Studio'
        }
        
        for placeholder, value in replacements.items():
            message = message.replace(placeholder, str(value))
        
        return message
    
    async def send_pending_reminders(self) -> int:
        """Отправить все ожидающие напоминания"""
        async with self.db_session_factory() as db:
            # Получаем все не отправленные напоминания
            result = await db.execute(
                select(Reminder).where(
                    and_(
                        Reminder.is_sent == False,
                        Reminder.scheduled_at <= datetime.utcnow()
                    )
                )
            )
            reminders = result.scalars().all()
            
            sent_count = 0
            
            for reminder in reminders:
                try:
                    success = await self._send_reminder(db, reminder)
                    if success:
                        reminder.is_sent = True
                        reminder.sent_at = datetime.utcnow()
                        sent_count += 1
                        logger.info(f"Sent reminder {reminder.id} to client {reminder.client_id}")
                    else:
                        logger.error(f"Failed to send reminder {reminder.id}")
                        
                except Exception as e:
                    logger.error(f"Error sending reminder {reminder.id}: {e}")
            
            await db.commit()
            logger.info(f"Sent {sent_count} reminders out of {len(reminders)}")
            return sent_count
    
    async def _send_reminder(self, db: AsyncSession, reminder: Reminder) -> bool:
        """Отправить одно напоминание"""
        try:
            # Получаем информацию о клиенте
            result = await db.execute(select(Client).where(Client.id == reminder.client_id))
            client = result.scalar_one_or_none()
            
            if not client:
                logger.error(f"Client {reminder.client_id} not found")
                return False
            
            # Отправляем через Telegram
            if reminder.channel == NotificationChannel.TELEGRAM:
                success = await notification_service.send_telegram_message(
                    client.chat_id, 
                    reminder.message_text
                )
                
                # Логируем отправку
                log = NotificationLog(
                    reminder_id=reminder.id,
                    client_id=reminder.client_id,
                    channel=reminder.channel,
                    message_text=reminder.message_text,
                    status='sent' if success else 'failed',
                    sent_at=datetime.utcnow()
                )
                db.add(log)
                
                return success
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending reminder {reminder.id}: {e}")
            return False
    
    async def create_birthday_reminders(self) -> int:
        """Создать поздравления с днем рождения"""
        async with self.db_session_factory() as db:
            # Получаем клиентов с днем рождения сегодня и завтра
            today = datetime.now().date()
            tomorrow = today + timedelta(days=1)
            
            # Для простоты используем день и месяц (без года)
            today_str = today.strftime("%m-%d")
            tomorrow_str = tomorrow.strftime("%m-%d")
            
            # Получаем клиентов (предполагаем что есть поле birthday в Client)
            result = await db.execute(
                select(Client).where(
                    # TODO: Добавить поле birthday в модель Client
                    # Client.birthday.like(f"%-{today_str}") OR Client.birthday.like(f"%-{tomorrow_str}")
                    Client.id > 0  # Заглушка
                )
            )
            clients = result.scalars().all()
            
            # TODO: Реализовать логику поздравлений
            logger.info(f"Would create birthday reminders for {len(clients)} clients")
            return len(clients)


# Глобальный экземпляр сервиса
reminder_service = None


def init_reminder_service(db_session_factory):
    """Инициализировать глобальный сервис напоминаний"""
    global reminder_service
    reminder_service = ReminderService(db_session_factory)


async def schedule_reminders():
    """Планировщик напоминаний - вызывается периодически"""
    if not reminder_service:
        logger.error("Reminder service not initialized")
        return
    
    try:
        sent_count = await reminder_service.send_pending_reminders()
        await reminder_service.create_birthday_reminders()
        logger.info(f"Reminder scheduler completed: {sent_count} sent")
    except Exception as e:
        logger.error(f"Reminder scheduler error: {e}")


# Background task для периодической отправки
async def start_reminder_scheduler():
    """Запустить планировщик напоминаний"""
    while True:
        try:
            await schedule_reminders()
            # Проверяем каждые 5 минут
            await asyncio.sleep(300)
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(60)  # При ошибке ждем 1 минуту
