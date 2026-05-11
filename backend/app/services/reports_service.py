"""
Service for Reports and Analytics
================================

Обрабатывает:
- Генерацию ежедневных отчетов
- Управление кассовыми операциями
- Отчеты по сменам
- Финансовые транзакции
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func as sa_func
import json

from app.models import Client, Booking
from app.models.reports import (
    DailyReport, CashOperation, ShiftReport, FinancialTransaction,
    CashOperationType, ReportType
)
from app.models.schedule import WorkSchedule, WorkStatus
from app.database import get_db_session_factory
import logging

logger = logging.getLogger(__name__)


class ReportsService:
    """Сервис для работы с отчетами"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
    
    async def generate_daily_report(self, report_date: datetime, created_by: int) -> DailyReport:
        """Сгенерировать ежедневный отчет"""
        async with self.db_session_factory() as db:
            # Проверяем что отчет еще не существует
            existing = await db.execute(
                select(DailyReport).where(DailyReport.report_date == report_date)
            )
            if existing.scalar_one_or_none():
                raise ValueError(f"Report for {report_date.date()} already exists")
            
            # Получаем статистику по записям
            date_str = report_date.strftime("%d.%m.%Y")
            
            # Всего записей
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(Booking.date == date_str)
            )
            total_bookings = result.scalar() or 0
            
            # Завершенные записи
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(
                    and_(
                        Booking.date == date_str,
                        Booking.status == 'completed'
                    )
                )
            )
            completed_bookings = result.scalar() or 0
            
            # Отмененные записи
            result = await db.execute(
                select(sa_func.count(Booking.id)).where(
                    and_(
                        Booking.date == date_str,
                        Booking.status == 'cancelled'
                    )
                )
            )
            cancelled_bookings = result.scalar() or 0
            
            # Новые клиенты
            result = await db.execute(
                select(sa_func.count(Client.id)).where(
                    Client.first_visit == date_str
                )
            )
            new_clients = result.scalar() or 0
            
            # Статистика по услугам
            result = await db.execute(
                select(Booking.service, sa_func.count(Booking.id), sa_func.sum(Booking.price))
                .where(Booking.date == date_str)
                .group_by(Booking.service)
            )
            services_stats = {
                service: {"count": count, "revenue": float(revenue or 0)}
                for service, count, revenue in result.all()
            }
            
            # Статистика по мастерам
            result = await db.execute(
                select(Booking.chat_id, sa_func.count(Booking.id), sa_func.sum(Booking.price))
                .where(Booking.date == date_str)
                .group_by(Booking.chat_id)
            )
            masters_stats = {}
            for master_id, count, revenue in result.all():
                # Получаем имя мастера
                master_result = await db.execute(
                    select(Client.name).where(Client.id == master_id)
                )
                master_name = master_result.scalar() or f"Master_{master_id}"
                
                masters_stats[str(master_id)] = {
                    "name": master_name,
                    "bookings": count,
                    "revenue": float(revenue or 0)
                }
            
            # Рассчитываем финансовые показатели
            total_revenue = sum(service["revenue"] for service in services_stats.values())
            
            # Создаем отчет
            report = DailyReport(
                report_date=report_date,
                report_type=ReportType.DAILY,
                total_bookings=total_bookings,
                completed_bookings=completed_bookings,
                cancelled_bookings=cancelled_bookings,
                new_clients=new_clients,
                returning_clients=total_bookings - new_clients,
                total_revenue=total_revenue,
                services_stats=services_stats,
                masters_stats=masters_stats,
                created_by=created_by
            )
            
            db.add(report)
            await db.commit()
            await db.refresh(report)
            
            logger.info(f"Generated daily report for {report_date.date()}")
            return report
    
    async def add_cash_operation(
        self,
        daily_report_id: int,
        operation_type: CashOperationType,
        amount: float,
        description: str = None,
        booking_id: int = None,
        master_id: int = None,
        created_by: int = None
    ) -> CashOperation:
        """Добавить кассовую операцию"""
        async with self.db_session_factory() as db:
            operation = CashOperation(
                daily_report_id=daily_report_id,
                operation_type=operation_type,
                amount=amount,
                description=description,
                booking_id=booking_id,
                master_id=master_id,
                created_by=created_by
            )
            
            db.add(operation)
            await db.commit()
            await db.refresh(operation)
            
            # Обновляем финансовые показатели в отчете
            await self._update_daily_report_finances(db, daily_report_id)
            
            logger.info(f"Added cash operation: {operation_type.value} {amount}")
            return operation
    
    async def create_shift_report(
        self,
        daily_report_id: int,
        master_id: int,
        start_time: datetime,
        end_time: datetime = None,
        notes: str = None,
        created_by: int = None
    ) -> ShiftReport:
        """Создать отчет по смене"""
        async with self.db_session_factory() as db:
            # Получаем записи мастера за смену
            date_str = start_time.strftime("%d.%m.%Y")
            
            result = await db.execute(
                select(sa_func.count(Booking.id), sa_func.sum(Booking.price))
                .where(
                    and_(
                        Booking.date == date_str,
                        Booking.chat_id == master_id
                    )
                )
            )
            total_bookings, total_revenue = result.first() or (0, 0)
            
            # Рассчитываем часы работы
            planned_hours = 8.0  # По умолчанию 8 часов
            actual_hours = 0.0
            
            if end_time:
                actual_hours = (end_time - start_time).total_seconds() / 3600
                overtime_hours = max(0, actual_hours - planned_hours)
            else:
                overtime_hours = 0.0
            
            shift_report = ShiftReport(
                daily_report_id=daily_report_id,
                master_id=master_id,
                start_time=start_time,
                end_time=end_time,
                total_bookings=total_bookings or 0,
                completed_bookings=total_bookings or 0,  # Упрощенно
                cancelled_bookings=0,
                shift_revenue=float(total_revenue or 0.0),
                planned_hours=planned_hours,
                actual_hours=actual_hours,
                overtime_hours=overtime_hours,
                notes=notes
            )
            
            db.add(shift_report)
            await db.commit()
            await db.refresh(shift_report)
            
            logger.info(f"Created shift report for master {master_id}")
            return shift_report
    
    async def get_daily_report(self, report_date: datetime) -> Optional[DailyReport]:
        """Получить ежедневный отчет"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(DailyReport).where(DailyReport.report_date == report_date)
            )
            return result.scalar_one_or_none()
    
    async def get_cash_operations(
        self,
        daily_report_id: int,
        operation_type: Optional[CashOperationType] = None
    ) -> List[CashOperation]:
        """Получить кассовые операции"""
        async with self.db_session_factory() as db:
            query = select(CashOperation).where(CashOperation.daily_report_id == daily_report_id)
            
            if operation_type:
                query = query.where(CashOperation.operation_type == operation_type)
            
            query = query.order_by(CashOperation.created_at.desc())
            
            result = await db.execute(query)
            return result.scalars().all()
    
    async def get_shift_reports(self, daily_report_id: int) -> List[ShiftReport]:
        """Получить отчеты по сменам"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(ShiftReport)
                .where(ShiftReport.daily_report_id == daily_report_id)
                .order_by(ShiftReport.start_time)
            )
            return result.scalars().all()
    
    async def close_shift(
        self,
        shift_report_id: int,
        end_time: datetime,
        final_revenue: float,
        cash_in_drawer: float,
        notes: str = None
    ) -> ShiftReport:
        """Закрыть смену"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(ShiftReport).where(ShiftReport.id == shift_report_id)
            )
            shift_report = result.scalar_one_or_none()
            
            if not shift_report:
                raise ValueError("Shift report not found")
            
            # Обновляем данные смены
            shift_report.end_time = end_time
            shift_report.actual_hours = (end_time - shift_report.start_time).total_seconds() / 3600
            shift_report.overtime_hours = max(0, shift_report.actual_hours - shift_report.planned_hours)
            shift_report.shift_revenue = final_revenue
            
            # Добавляем операцию закрытия кассы
            await self.add_cash_operation(
                daily_report_id=shift_report.daily_report_id,
                operation_type=CashOperationType.SHIFT_CLOSE,
                amount=cash_in_drawer,
                description=f"Закрытие смены мастера {shift_report.master_id}",
                master_id=shift_report.master_id,
                created_by=shift_report.master_id
            )
            
            if notes:
                shift_report.notes = (shift_report.notes or "") + f"\nЗакрытие: {notes}"
            
            await db.commit()
            await db.refresh(shift_report)
            
            logger.info(f"Closed shift {shift_report_id}")
            return shift_report
    
    async def _update_daily_report_finances(self, db: AsyncSession, daily_report_id: int):
        """Обновить финансовые показатели в ежедневном отчете"""
        # Получаем все кассовые операции за день
        result = await db.execute(
            select(
                sa_func.sum(CashOperation.amount)
            ).where(CashOperation.daily_report_id == daily_report_id)
        )
        total_cash = result.scalar() or 0.0
        
        # Обновляем отчет
        report = await db.get(DailyReport, daily_report_id)
        if report:
            report.cash_revenue = total_cash
            await db.commit()
    
    async def get_financial_summary(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Получить финансовую сводку за период"""
        async with self.db_session_factory() as db:
            # Получаем ежедневные отчеты за период
            result = await db.execute(
                select(DailyReport).where(
                    and_(
                        DailyReport.report_date >= start_date,
                        DailyReport.report_date <= end_date
                    )
                ).order_by(DailyReport.report_date)
            )
            reports = result.scalars().all()
            
            # Агрегируем данные
            total_bookings = sum(r.total_bookings for r in reports)
            total_revenue = sum(r.total_revenue for r in reports)
            total_new_clients = sum(r.new_clients for r in reports)
            
            # По дням
            daily_breakdown = {
                r.report_date.strftime("%Y-%m-%d"): {
                    "bookings": r.total_bookings,
                    "revenue": r.total_revenue,
                    "new_clients": r.new_clients
                }
                for r in reports
            }
            
            return {
                "period": {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d")
                },
                "summary": {
                    "total_bookings": total_bookings,
                    "total_revenue": total_revenue,
                    "total_new_clients": total_new_clients,
                    "average_daily_revenue": total_revenue / len(reports) if reports else 0,
                    "average_daily_bookings": total_bookings / len(reports) if reports else 0
                },
                "daily_breakdown": daily_breakdown
            }


# Глобальный экземпляр сервиса
reports_service = None


def init_reports_service(db_session_factory):
    """Инициализировать глобальный сервис отчетов"""
    global reports_service
    reports_service = ReportsService(db_session_factory)
