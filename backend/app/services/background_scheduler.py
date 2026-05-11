"""
Background Scheduler Service
============================

Управляет фоновыми задачами:
- Ежедневные поздравления с днем рождения
- Напоминания о записях
- Очистка кэша
- Генерация отчетов
- Архивация старых данных
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session_factory
from app.services.reminder_service import reminder_service
from app.services.communication_service import communication_service
from app.services.cache_service import cache_service
from app.services.schedule_service import schedule_service

logger = logging.getLogger(__name__)


class BackgroundScheduler:
    """Менеджер фоновых задач"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.running = False
        self.tasks = []
        self.scheduler = None
    
    async def start(self):
        """Запустить планировщик"""
        self.running = True
        logger.info("Background scheduler started")
        
        # Запускаем все задачи
        self.tasks = [
            asyncio.create_task(self.daily_birthday_task()),
            asyncio.create_task(self.reminder_cleanup_task()),
            asyncio.create_task(self.cache_cleanup_task()),
            asyncio.create_task(self.daily_reports_task()),
            asyncio.create_task(self.weekly_analytics_task()),
            asyncio.create_task(self.monthly_archival_task()),
            asyncio.create_task(self.health_check_task()),
        ]
        
        try:
            await asyncio.gather(*self.tasks)
        except Exception as e:
            logger.error(f"Background scheduler error: {e}")
    
    async def stop(self):
        """Остановить планировщик"""
        self.running = False
        logger.info("Background scheduler stopping")
        
        # Отменяем все задачи
        for task in self.tasks:
            if not task.done():
                task.cancel()
        
        # Ждем завершения
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)
        
        logger.info("Background scheduler stopped")
    
    async def daily_birthday_task(self):
        """Ежедневная задача поздравлений с днем рождения"""
        while self.running:
            try:
                # Запускаем в 9 утра каждый день
                now = datetime.now()
                next_run = now.replace(hour=9, minute=0, second=0, microsecond=0)
                
                if now > next_run:
                    next_run += timedelta(days=1)
                
                sleep_seconds = (next_run - now).total_seconds()
                if sleep_seconds > 0:
                    await asyncio.sleep(sleep_seconds)
                
                if not self.running:
                    break
                
                logger.info("Running daily birthday task")
                if communication_service:
                    sent_count = await communication_service.schedule_birthday_campaigns()
                    logger.info(f"Sent {sent_count} birthday greetings")
                
                # Ждем до следующего дня
                await asyncio.sleep(3600)  # 1 час
                
            except Exception as e:
                logger.error(f"Daily birthday task error: {e}")
                await asyncio.sleep(300)  # 5 минут при ошибке
    
    async def reminder_cleanup_task(self):
        """Очистка старых напоминаний"""
        while self.running:
            try:
                # Запускаем каждый час
                await asyncio.sleep(3600)
                
                if not self.running:
                    break
                
                logger.info("Running reminder cleanup task")
                if reminder_service:
                    # Удаляем напоминания старше 7 дней
                    cutoff_date = datetime.now() - timedelta(days=7)
                    
                    async with self.db_session_factory() as db:
                        from app.models.reminders import Reminder
                        from sqlalchemy import delete
                        
                        result = await db.execute(
                            delete(Reminder).where(
                                Reminder.created_at < cutoff_date
                            )
                        )
                        deleted_count = result.rowcount if hasattr(result, 'rowcount') else 0
                        
                        if deleted_count > 0:
                            logger.info(f"Cleaned up {deleted_count} old reminders")
                
            except Exception as e:
                logger.error(f"Reminder cleanup task error: {e}")
                await asyncio.sleep(300)
    
    async def cache_cleanup_task(self):
        """Очистка просроченного кэша"""
        while self.running:
            try:
                # Запускаем каждые 6 часов
                await asyncio.sleep(21600)  # 6 часов
                
                if not self.running:
                    break
                
                logger.info("Running cache cleanup task")
                if cache_service:
                    # Очищаем статистику старше 24 часов
                    pattern = "analytics:daily:*"
                    deleted_count = await cache_service.invalidate_pattern(pattern)
                    
                    if deleted_count > 0:
                        logger.info(f"Cleaned up {deleted_count} old cache entries")
                
            except Exception as e:
                logger.error(f"Cache cleanup task error: {e}")
                await asyncio.sleep(300)
    
    async def daily_reports_task(self):
        """Ежедневная генерация отчетов"""
        while self.running:
            try:
                # Запускаем в 22:00 каждый день
                now = datetime.now()
                next_run = now.replace(hour=22, minute=0, second=0, microsecond=0)
                
                if now > next_run:
                    next_run += timedelta(days=1)
                
                sleep_seconds = (next_run - now).total_seconds()
                if sleep_seconds > 0:
                    await asyncio.sleep(sleep_seconds)
                
                if not self.running:
                    break
                
                logger.info("Running daily reports task")
                
                # Генерируем отчеты
                reports = await self.generate_daily_reports()
                
                # Сохраняем в кэш
                today = now.strftime("%Y-%m-%d")
                for report_name, report_data in reports.items():
                    cache_key = f"daily_report:{today}:{report_name}"
                    await cache_service.set(cache_key, report_data, ttl=86400)  # 24 часа
                
                logger.info(f"Generated {len(reports)} daily reports")
                
            except Exception as e:
                logger.error(f"Daily reports task error: {e}")
                await asyncio.sleep(300)
    
    async def weekly_analytics_task(self):
        """Еженедельная аналитика"""
        while self.running:
            try:
                # Запускаем каждое воскресенье в 23:00
                now = datetime.now()
                
                # Находим следующее воскресенье
                days_ahead = (6 - now.weekday()) % 7
                next_run = now + timedelta(days=days_ahead)
                next_run = next_run.replace(hour=23, minute=0, second=0, microsecond=0)
                
                sleep_seconds = (next_run - now).total_seconds()
                if sleep_seconds > 0:
                    await asyncio.sleep(sleep_seconds)
                
                if not self.running:
                    break
                
                logger.info("Running weekly analytics task")
                
                # Генерируем недельную аналитику
                week_start = now - timedelta(days=now.weekday())
                analytics = await self.generate_weekly_analytics(week_start)
                
                # Сохраняем в кэш
                week_key = f"weekly_analytics:{week_start.strftime('%Y-%m-%d')}"
                await cache_service.set(week_key, analytics, ttl=604800)  # 7 дней
                
                logger.info("Generated weekly analytics report")
                
            except Exception as e:
                logger.error(f"Weekly analytics task error: {e}")
                await asyncio.sleep(300)
    
    async def monthly_archival_task(self):
        """Ежемесячная архивация данных"""
        while self.running:
            try:
                # Запускаем 1-го числа каждого месяца в 02:00
                now = datetime.now()
                next_run = now.replace(day=1, hour=2, minute=0, second=0, microsecond=0)
                
                if now > next_run:
                    next_run = next_run.replace(month=now.month + 1)
                
                sleep_seconds = (next_run - now).total_seconds()
                if sleep_seconds > 0:
                    await asyncio.sleep(sleep_seconds)
                
                if not self.running:
                    break
                
                logger.info("Running monthly archival task")
                
                # Архивируем данные за прошлый месяц
                last_month = now - timedelta(days=now.day)
                archived_count = await self.archive_month_data(last_month)
                
                logger.info(f"Archived {archived_count} records from last month")
                
            except Exception as e:
                logger.error(f"Monthly archival task error: {e}")
                await asyncio.sleep(300)
    
    async def health_check_task(self):
        """Проверка здоровья системы"""
        while self.running:
            try:
                # Запускаем каждые 5 минут
                await asyncio.sleep(300)
                
                if not self.running:
                    break
                
                # Проверяем статус всех сервисов
                health_status = await self.check_system_health()
                
                # Логируем проблемы
                if health_status.get('issues'):
                    logger.warning(f"System health issues: {health_status['issues']}")
                
                # Сохраняем статус в кэш на 5 минут
                await cache_service.set("system_health", health_status, ttl=300)
                
            except Exception as e:
                logger.error(f"Health check task error: {e}")
                await asyncio.sleep(60)
    
    async def generate_daily_reports(self) -> Dict[str, Any]:
        """Генерировать ежедневные отчеты"""
        async with self.db_session_factory() as db:
            from app.models import Booking, Client
            from sqlalchemy import select, func as sa_func
            
            today = datetime.now().strftime("%d.%m.%Y")
            
            # Отчет по записям
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(Booking.date == today)
            )
            total_bookings = result.scalar() or 0
            
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(
                    and_(
                        Booking.date == today,
                        Booking.status.in_(['confirmed', 'pending'])
                    )
                )
            )
            active_bookings = result.scalar() or 0
            
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(Booking.date == today)
            )
            new_clients = result.scalar() or 0
            
            # Отчет по выручке
            # Упрощенный расчет
            revenue = active_bookings * 1500  # Средний чек
            
            return {
                'bookings': {
                    'total': total_bookings,
                    'active': active_bookings,
                    'new_clients': new_clients
                },
                'revenue': {
                    'estimated': revenue,
                    'currency': 'KGS'
                },
                'date': today,
                'generated_at': datetime.now().isoformat()
            }
    
    async def generate_weekly_analytics(self, week_start: datetime) -> Dict[str, Any]:
        """Генерировать недельную аналитику"""
        async with self.db_session_factory() as db:
            from app.models import Booking, Client
            from sqlalchemy import select, func as sa_func
            
            week_end = week_start + timedelta(days=6)
            
            # Записи за неделю
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(
                    and_(
                        Booking.date >= week_start.strftime("%d.%m.%Y"),
                        Booking.date <= week_end.strftime("%d.%m.%Y")
                    )
                )
            )
            total_bookings = result.scalar() or 0
            
            # Уникальные клиенты
            result = await db.execute(
                select(sa_func.count(Client.id)).where(
                    Client.first_visit >= week_start.strftime("%d.%m.%Y")
                )
            )
            new_clients = result.scalar() or 0
            
            # Самые популярные услуги
            result = await db.execute(
                select(Booking.service, sa_func.count(Booking.id))
                .where(
                    and_(
                        Booking.date >= week_start.strftime("%d.%m.%Y"),
                        Booking.date <= week_end.strftime("%d.%m.%Y")
                    )
                )
                .group_by(Booking.service)
                .order_by(sa_func.count(Booking.id).desc())
                .limit(5)
            )
            top_services = result.all()
            
            return {
                'period': {
                    'start': week_start.strftime("%Y-%m-%d"),
                    'end': week_end.strftime("%Y-%m-%d")
                },
                'bookings': {
                    'total': total_bookings,
                    'daily_average': total_bookings / 7
                },
                'clients': {
                    'new': new_clients,
                    'retention_rate': 0.85  # Заглушка
                },
                'top_services': [
                    {'service': service, 'count': count}
                    for service, count in top_services
                ],
                'generated_at': datetime.now().isoformat()
            }
    
    async def archive_month_data(self, month: datetime) -> int:
        """Архивировать данные за месяц"""
        # Это заглушка - нужно настроить реальную архивацию
        logger.info(f"Would archive data for {month.strftime('%Y-%m')}")
        return 0
    
    async def check_system_health(self) -> Dict[str, Any]:
        """Проверить здоровье системы"""
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'issues': []
        }
        
        # Проверяем Redis
        if cache_service:
            cache_stats = await cache_service.get_stats()
            if cache_stats.get('connected', False):
                health_status['issues'].append('Redis not connected')
                health_status['status'] = 'degraded'
        
        # Проверяем количество активных задач
        active_tasks = sum(1 for task in self.tasks if not task.done())
        if active_tasks > 10:
            health_status['issues'].append(f'Too many active tasks: {active_tasks}')
        
        # Проверяем время работы
        uptime = datetime.now() - datetime.now().replace(hour=0, minute=0, second=0)
        if uptime.total_seconds() < 60:  # Меньше минуты
            health_status['issues'].append('Recent restart detected')
        
        return health_status


# Глобальный экземпляр планировщика
background_scheduler = None


def init_background_scheduler(db_session_factory):
    """Инициализировать фоновый планировщик"""
    global background_scheduler
    background_scheduler = BackgroundScheduler(db_session_factory)
    return background_scheduler


async def start_background_scheduler():
    """Запустить фоновый планировщик"""
    global background_scheduler
    if background_scheduler and not background_scheduler.running:
        await background_scheduler.start()


async def stop_background_scheduler():
    """Остановить фоновый планировщик"""
    global background_scheduler
    if background_scheduler and background_scheduler.running:
        await background_scheduler.stop()
