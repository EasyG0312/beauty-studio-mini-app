"""
Сервис для управления расписанием мастеров
======================================

Обрабатывает:
- Создание и управление расписанием
- Расчет сверхурочных
- Обмен сменами
- Генерацию отчетов по рабочему времени
"""

import asyncio
from datetime import datetime, timedelta, time
from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func as sa_func
import json

from app.models import Client
from app.models.schedule import (
    WorkSchedule, WorkBreak, ShiftSwap, Overtime, 
    ScheduleTemplate, ShiftType, WorkStatus
)
from app.database import get_db_session_factory
import logging

logger = logging.getLogger(__name__)


class ScheduleService:
    """Сервис для управления расписанием"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
    
    async def create_schedule(self, schedule_data: dict) -> WorkSchedule:
        """Создать новую смену в расписании"""
        async with self.db_session_factory() as db:
            schedule = WorkSchedule(**schedule_data)
            db.add(schedule)
            await db.commit()
            await db.refresh(schedule)
            
            logger.info(f"Created schedule {schedule.id} for master {schedule.master_id}")
            return schedule
    
    async def get_schedule_by_period(
        self, 
        master_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[WorkSchedule]:
        """Получить расписание мастера за период"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(WorkSchedule).where(
                    and_(
                        WorkSchedule.master_id == master_id,
                        WorkSchedule.date >= start_date,
                        WorkSchedule.date <= end_date,
                        WorkSchedule.is_active == True
                    )
                ).order_by(WorkSchedule.date, WorkSchedule.start_time)
            )
            return result.scalars().all()
    
    async def get_week_schedule(self, master_id: int, week_start: datetime) -> Dict:
        """Получить расписание на неделю"""
        week_end = week_start + timedelta(days=6)
        schedules = await self.get_schedule_by_period(master_id, week_start, week_end)
        
        week_schedule = {}
        for i in range(7):
            current_date = week_start + timedelta(days=i)
            week_schedule[current_date.strftime("%Y-%m-%d")] = {
                'date': current_date,
                'schedules': [],
                'total_hours': 0,
                'status': 'free'
            }
        
        for schedule in schedules:
            date_str = schedule.date.strftime("%Y-%m-%d")
            if date_str in week_schedule:
                week_schedule[date_str]['schedules'].append(schedule)
                
                # Считаем часы
                if schedule.actual_start_time and schedule.actual_end_time:
                    duration = schedule.actual_end_time - schedule.actual_start_time
                    hours = duration.total_seconds() / 3600
                    week_schedule[date_str]['total_hours'] += hours
                
                # Определяем статус дня
                if schedule.status in [WorkStatus.IN_PROGRESS, WorkStatus.COMPLETED]:
                    week_schedule[date_str]['status'] = 'working'
                elif schedule.status == WorkStatus.SICK_LEAVE:
                    week_schedule[date_str]['status'] = 'sick'
                elif schedule.status == WorkStatus.VACATION:
                    week_schedule[date_str]['status'] = 'vacation'
        
        return week_schedule
    
    async def calculate_overtime(self, master_id: int, period_start: datetime, period_end: datetime) -> Dict:
        """Рассчитать сверхурочные за период"""
        async with self.db_session_factory() as db:
            # Получаем все смены за период
            result = await db.execute(
                select(WorkSchedule).where(
                    and_(
                        WorkSchedule.master_id == master_id,
                        WorkSchedule.date >= period_start,
                        WorkSchedule.date <= period_end,
                        WorkSchedule.status == WorkStatus.COMPLETED
                    )
                )
            )
            schedules = result.scalars().all()
            
            total_hours = 0
            regular_hours = 0  # 40 часов в неделю = 160 в месяц
            overtime_hours = 0
            
            for schedule in schedules:
                if schedule.actual_start_time and schedule.actual_end_time:
                    duration = schedule.actual_end_time - schedule.actual_start_time
                    hours = duration.total_seconds() / 3600
                    total_hours += hours
            
            # Норма рабочих часов (40 часов в неделю)
            weeks = (period_end - period_start).days / 7
            regular_hours = weeks * 40
            
            if total_hours > regular_hours:
                overtime_hours = total_hours - regular_hours
            
            return {
                'total_hours': round(total_hours, 2),
                'regular_hours': round(regular_hours, 2),
                'overtime_hours': round(overtime_hours, 2),
                'overtime_pay': round(overtime_hours * 1.5, 2)  # 1.5x ставка за сверхурочные
            }
    
    async def request_shift_swap(
        self, 
        original_schedule_id: int, 
        new_master_id: int, 
        reason: str
    ) -> ShiftSwap:
        """Создать запрос на обмен смены"""
        async with self.db_session_factory() as db:
            # Проверяем что исходная смена существует
            result = await db.execute(
                select(WorkSchedule).where(WorkSchedule.id == original_schedule_id)
            )
            original_schedule = result.scalar_one_or_none()
            
            if not original_schedule:
                raise ValueError("Original schedule not found")
            
            # Создаем запрос на обмен
            swap = ShiftSwap(
                original_schedule_id=original_schedule_id,
                original_master_id=original_schedule.master_id,
                new_master_id=new_master_id,
                reason=reason,
                status="pending"
            )
            
            db.add(swap)
            await db.commit()
            await db.refresh(swap)
            
            logger.info(f"Created shift swap request {swap.id}")
            return swap
    
    async def approve_shift_swap(self, swap_id: int, approved_by: int, new_schedule_data: dict) -> bool:
        """Одобрить обмен смены"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(ShiftSwap).where(ShiftSwap.id == swap_id)
            )
            swap = result.scalar_one_or_none()
            
            if not swap:
                return False
            
            try:
                # Создаем новую смену для принимающего мастера
                new_schedule = WorkSchedule(
                    master_id=swap.new_master_id,
                    date=swap.original_schedule.date,
                    shift_type=swap.original_schedule.shift_type,
                    start_time=swap.original_schedule.start_time,
                    end_time=swap.original_schedule.end_time,
                    status=WorkStatus.CONFIRMED
                )
                db.add(new_schedule)
                
                # Обновляем статус исходной смены
                swap.original_schedule.status = WorkStatus.SCHEDULED  # Возвращаем в запланированное
                
                # Обновляем статус обмена
                swap.status = "approved"
                swap.approved_by = approved_by
                swap.approved_at = datetime.utcnow()
                
                await db.commit()
                logger.info(f"Approved shift swap {swap_id}")
                return True
                
            except Exception as e:
                logger.error(f"Error approving shift swap {swap_id}: {e}")
                await db.rollback()
                return False
    
    async def generate_schedule_from_template(
        self, 
        template_id: int, 
        start_date: datetime,
        master_id: int
    ) -> List[WorkSchedule]:
        """Сгенерировать расписание из шаблона"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(ScheduleTemplate).where(ScheduleTemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                raise ValueError("Template not found")
            
            try:
                template_data = json.loads(template.template_data)
                schedules = []
                
                # Генерируем расписание на неделю
                for day_offset in range(7):
                    day_data = template_data.get(f'day_{day_offset}', {})
                    if day_data:
                        current_date = start_date + timedelta(days=day_offset)
                        
                        schedule = WorkSchedule(
                            master_id=master_id,
                            date=current_date,
                            shift_type=ShiftType(day_data.get('shift_type', 'morning')),
                            start_time=time.fromisoformat(day_data.get('start_time', '09:00')),
                            end_time=time.fromisoformat(day_data.get('end_time', '18:00')),
                            break_duration=day_data.get('break_duration', 60),
                            status=WorkStatus.SCHEDULED
                        )
                        
                        schedules.append(schedule)
                        db.add(schedule)
                
                await db.commit()
                logger.info(f"Generated {len(schedules)} schedules from template {template_id}")
                return schedules
                
            except Exception as e:
                logger.error(f"Error generating schedule from template {template_id}: {e}")
                await db.rollback()
                raise
    
    async def get_master_workload(
        self, 
        date: datetime, 
        shift_type: Optional[ShiftType] = None
    ) -> List[Dict]:
        """Получить загруженность мастеров на дату"""
        async with self.db_session_factory() as db:
            query = select(WorkSchedule, Client.name).join(Client).where(
                and_(
                    WorkSchedule.date == date,
                    WorkSchedule.is_active == True,
                    WorkSchedule.status.in_([WorkStatus.SCHEDULED, WorkStatus.CONFIRMED, WorkStatus.IN_PROGRESS])
                )
            )
            
            if shift_type:
                query = query.where(WorkSchedule.shift_type == shift_type)
            
            result = await db.execute(query)
            schedules = result.all()
            
            workload = []
            for schedule, master_name in schedules:
                workload.append({
                    'schedule_id': schedule.id,
                    'master_id': schedule.master_id,
                    'master_name': master_name,
                    'shift_type': schedule.shift_type.value,
                    'start_time': schedule.start_time.strftime("%H:%M"),
                    'end_time': schedule.end_time.strftime("%H:%M"),
                    'status': schedule.status.value,
                    'break_duration': schedule.break_duration
                })
            
            return workload
    
    async def auto_optimize_schedule(self, master_id: int, start_date: datetime, days: int = 7) -> Dict:
        """Автоматически оптимизировать расписание мастера"""
        async with self.db_session_factory() as db:
            # Получаем существующее расписание
            end_date = start_date + timedelta(days=days)
            existing_schedules = await self.get_schedule_by_period(master_id, start_date, end_date)
            
            # Получаем записи на этот период
            result = await db.execute(
                select(Booking).where(
                    and_(
                        Booking.chat_id == master_id,
                        Booking.date >= start_date.strftime("%d.%m.%Y"),
                        Booking.date <= end_date.strftime("%d.%m.%Y"),
                        Booking.status.in_(['confirmed', 'pending'])
                    )
                )
            )
            bookings = result.scalars().all()
            
            # Анализируем конфликты и оптимизируем
            conflicts = []
            optimizations = []
            
            for schedule in existing_schedules:
                schedule_datetime = datetime.combine(schedule.date, schedule.start_time)
                
                # Проверяем конфликты с записями
                for booking in bookings:
                    booking_datetime = datetime.strptime(
                        f"{booking.date} {booking.time}", 
                        "%d.%m.%Y %H:%M"
                    )
                    
                    # Если время записи совпадает со сменой
                    if abs((schedule_datetime - booking_datetime).total_seconds()) < 3600:  # 1 час
                        conflicts.append({
                            'schedule_id': schedule.id,
                            'booking_id': booking.id,
                            'conflict_time': booking_datetime
                        })
                        
                        # Предлагаем оптимизацию
                        optimizations.append({
                            'type': 'reschedule',
                            'schedule_id': schedule.id,
                            'suggested_time': booking_datetime + timedelta(hours=2),
                            'reason': 'Conflict with booking'
                        })
            
            return {
                'conflicts': conflicts,
                'optimizations': optimizations,
                'total_conflicts': len(conflicts),
                'optimization_suggestions': len(optimizations)
            }


# Глобальный экземпляр сервиса
schedule_service = None


def init_schedule_service(db_session_factory):
    """Инициализировать глобальный сервис расписания"""
    global schedule_service
    schedule_service = ScheduleService(db_session_factory)
