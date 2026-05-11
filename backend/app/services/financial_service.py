"""
Financial Analytics Service
==========================

Обрабатывает:
- P&L (Profit & Loss) отчеты
- Анализ кэшфлоу
- Расчет себестоимости услуг
- Финансовые прогнозы
- Анализ рентабельности
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func as sa_func
import json

from app.models import Booking, Client
from app.models.reports import DailyReport, FinancialTransaction, InventoryTransaction
from app.models.schedule import WorkSchedule, Overtime
from app.database import get_db_session_factory
import logging

logger = logging.getLogger(__name__)


class FinancialService:
    """Сервис для финансовой аналитики"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
    
    async def generate_pl_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Сгенерировать P&L отчет (Profit & Loss)"""
        async with self.db_session_factory() as db:
            # Получаем доходы
            revenue_data = await self._calculate_revenue(db, start_date, end_date)
            
            # Получаем расходы
            expense_data = await self._calculate_expenses(db, start_date, end_date)
            
            # Рассчитываем прибыль
            gross_profit = revenue_data['total_revenue'] - expense_data['cost_of_services']
            operating_profit = gross_profit - expense_data['operating_expenses']
            net_profit = operating_profit - expense_data['other_expenses']
            
            # Рассчитываем маржинальность
            gross_margin = (gross_profit / revenue_data['total_revenue'] * 100) if revenue_data['total_revenue'] > 0 else 0
            operating_margin = (operating_profit / revenue_data['total_revenue'] * 100) if revenue_data['total_revenue'] > 0 else 0
            net_margin = (net_profit / revenue_data['total_revenue'] * 100) if revenue_data['total_revenue'] > 0 else 0
            
            return {
                'period': {
                    'start': start_date.strftime("%Y-%m-%d"),
                    'end': end_date.strftime("%Y-%m-%d")
                },
                'revenue': revenue_data,
                'expenses': expense_data,
                'profitability': {
                    'gross_profit': gross_profit,
                    'operating_profit': operating_profit,
                    'net_profit': net_profit,
                    'gross_margin': round(gross_margin, 2),
                    'operating_margin': round(operating_margin, 2),
                    'net_margin': round(net_margin, 2)
                }
            }
    
    async def generate_cash_flow_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Сгенерировать отчет по кэшфлоу"""
        async with self.db_session_factory() as db:
            # Получаем финансовые транзакции
            result = await db.execute(
                select(FinancialTransaction).where(
                    and_(
                        FinancialTransaction.created_at >= start_date,
                        FinancialTransaction.created_at <= end_date
                    )
                ).order_by(FinancialTransaction.created_at)
            )
            transactions = result.scalars().all()
            
            # Группируем по типам
            cash_inflows = []
            cash_outflows = []
            
            for transaction in transactions:
                if transaction.transaction_type in ['payment', 'sale']:
                    cash_inflows.append({
                        'date': transaction.created_at.strftime("%Y-%m-%d"),
                        'amount': transaction.amount,
                        'description': transaction.description,
                        'category': transaction.category
                    })
                else:
                    cash_outflows.append({
                        'date': transaction.created_at.strftime("%Y-%m-%d"),
                        'amount': transaction.amount,
                        'description': transaction.description,
                        'category': transaction.category
                    })
            
            # Рассчитываем кэшфлоу
            total_inflows = sum(t['amount'] for t in cash_inflows)
            total_outflows = sum(t['amount'] for t in cash_outflows)
            net_cash_flow = total_inflows - total_outflows
            
            # Ежедневный кэшфлоу
            daily_cash_flow = {}
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime("%Y-%m-%d")
                
                day_inflows = sum(t['amount'] for t in cash_inflows if t['date'] == date_str)
                day_outflows = sum(t['amount'] for t in cash_outflows if t['date'] == date_str)
                
                daily_cash_flow[date_str] = {
                    'inflows': day_inflows,
                    'outflows': day_outflows,
                    'net': day_inflows - day_outflows
                }
                
                current_date += timedelta(days=1)
            
            return {
                'period': {
                    'start': start_date.strftime("%Y-%m-%d"),
                    'end': end_date.strftime("%Y-%m-%d")
                },
                'summary': {
                    'total_inflows': total_inflows,
                    'total_outflows': total_outflows,
                    'net_cash_flow': net_cash_flow,
                    'average_daily_inflow': total_inflows / ((end_date - start_date).days + 1),
                    'average_daily_outflow': total_outflows / ((end_date - start_date).days + 1)
                },
                'transactions': {
                    'inflows': cash_inflows,
                    'outflows': cash_outflows
                },
                'daily_breakdown': daily_cash_flow
            }
    
    async def calculate_service_costs(self) -> Dict[str, Any]:
        """Рассчитать себестоимость услуг"""
        async with self.db_session_factory() as db:
            # Получаем все транзакции по инвентарю
            result = await db.execute(
                select(InventoryTransaction).order_by(InventoryTransaction.created_at.desc())
            )
            inventory_transactions = result.scalars().all()
            
            # Получаем информацию об услугах
            result = await db.execute(
                select(Booking.service, sa_func.count(Booking.id), sa_func.sum(Booking.price))
                .group_by(Booking.service)
            )
            services_data = result.all()
            
            # Рассчитываем себестоимость для каждой услуги
            service_costs = {}
            
            for service, count, revenue in services_data:
                # Упрощенный расчет себестоимости
                # В реальном приложении нужно более точное распределение
                
                # Средняя себестоимость материалов (заглушка)
                material_cost_per_service = {
                    'Стрижка': 200,
                    'Окрашивание': 800,
                    'Маникюр': 150,
                    'Педикюр': 200,
                    'Укладка': 100,
                    'Чистка лица': 300,
                    'Массаж': 150
                }
                
                material_cost = material_cost_per_service.get(service, 300) * count
                
                # Затраты на труд (30% от выручки)
                labor_cost = float(revenue or 0) * 0.3
                
                # Амортизация оборудования (10% от выручки)
                depreciation_cost = float(revenue or 0) * 0.1
                
                # Прочие расходы (5% от выручки)
                other_costs = float(revenue or 0) * 0.05
                
                total_cost = material_cost + labor_cost + depreciation_cost + other_costs
                profit = float(revenue or 0) - total_cost
                profit_margin = (profit / float(revenue or 1)) * 100 if revenue else 0
                
                service_costs[service] = {
                    'service_count': count,
                    'total_revenue': float(revenue or 0),
                    'material_cost': material_cost,
                    'labor_cost': labor_cost,
                    'depreciation_cost': depreciation_cost,
                    'other_costs': other_costs,
                    'total_cost': total_cost,
                    'profit': profit,
                    'profit_margin': round(profit_margin, 2),
                    'cost_per_service': total_cost / count if count > 0 else 0,
                    'revenue_per_service': float(revenue or 0) / count if count > 0 else 0
                }
            
            return service_costs
    
    async def calculate_master_profitability(self, period_days: int = 30) -> Dict[str, Any]:
        """Рассчитать рентабельность мастеров"""
        async with self.db_session_factory() as db:
            # Получаем данные о записях мастеров
            period_start = datetime.now() - timedelta(days=period_days)
            
            result = await db.execute(
                select(
                    Booking.chat_id,
                    Client.name,
                    sa_func.count(Booking.id).label('bookings_count'),
                    sa_func.sum(Booking.price).label('total_revenue')
                )
                .join(Client, Booking.chat_id == Client.id)
                .where(Booking.date >= period_start.strftime("%d.%m.%Y"))
                .group_by(Booking.chat_id, Client.name)
            )
            masters_data = result.all()
            
            master_profitability = {}
            
            for master_id, master_name, bookings_count, total_revenue in masters_data:
                total_revenue = float(total_revenue or 0)
                
                # Зарплата мастера (40% от выручки)
                salary_cost = total_revenue * 0.4
                
                # Расходы на материалы (20% от выручки)
                material_cost = total_revenue * 0.2
                
                # Прочие расходы (10% от выручки)
                other_costs = total_revenue * 0.1
                
                total_cost = salary_cost + material_cost + other_costs
                profit = total_revenue - total_cost
                profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
                
                # Средний чек
                average_ticket = total_revenue / bookings_count if bookings_count > 0 else 0
                
                master_profitability[str(master_id)] = {
                    'name': master_name,
                    'bookings_count': bookings_count,
                    'total_revenue': total_revenue,
                    'salary_cost': salary_cost,
                    'material_cost': material_cost,
                    'other_costs': other_costs,
                    'total_cost': total_cost,
                    'profit': profit,
                    'profit_margin': round(profit_margin, 2),
                    'average_ticket': round(average_ticket, 2),
                    'revenue_per_day': total_revenue / period_days,
                    'profit_per_day': profit / period_days
                }
            
            return master_profitability
    
    async def generate_financial_forecast(
        self,
        forecast_days: int = 30
    ) -> Dict[str, Any]:
        """Сгенерировать финансовый прогноз"""
        async with self.db_session_factory() as db:
            # Получаем данные за последние 30 дней для прогноза
            period_start = datetime.now() - timedelta(days=30)
            
            result = await db.execute(
                select(DailyReport).where(
                    DailyReport.report_date >= period_start
                ).order_by(DailyReport.report_date)
            )
            reports = result.scalars().all()
            
            if len(reports) < 7:
                # Недостаточно данных для прогноза
                return {
                    'error': 'Insufficient data for forecast',
                    'required_days': 7,
                    'available_days': len(reports)
                }
            
            # Рассчитываем средние показатели
            daily_revenues = [r.total_revenue for r in reports]
            daily_bookings = [r.total_bookings for r in reports]
            
            avg_daily_revenue = sum(daily_revenues) / len(daily_revenues)
            avg_daily_bookings = sum(daily_bookings) / len(daily_bookings)
            
            # Тренд (простой линейный тренд)
            if len(daily_revenues) >= 14:
                first_week_avg = sum(daily_revenues[:7]) / 7
                last_week_avg = sum(daily_revenues[-7:]) / 7
                trend_factor = (last_week_avg - first_week_avg) / first_week_avg if first_week_avg > 0 else 0
            else:
                trend_factor = 0
            
            # Генерируем прогноз
            forecast_data = {}
            current_date = datetime.now()
            
            for day in range(1, forecast_days + 1):
                forecast_date = current_date + timedelta(days=day)
                
                # Базовый прогноз с учетом тренда
                base_revenue = avg_daily_revenue * (1 + trend_factor * (day / 30))
                base_bookings = avg_daily_bookings * (1 + trend_factor * (day / 30))
                
                # Сезонные корректировки (упрощенно)
                weekday = forecast_date.weekday()
                seasonal_factor = 1.0
                
                if weekday in [5, 6]:  # Выходные
                    seasonal_factor = 1.3
                elif weekday == 0:  # Понедельник
                    seasonal_factor = 0.8
                
                forecast_revenue = base_revenue * seasonal_factor
                forecast_bookings = int(base_bookings * seasonal_factor)
                
                forecast_data[forecast_date.strftime("%Y-%m-%d")] = {
                    'revenue': round(forecast_revenue, 2),
                    'bookings': forecast_bookings,
                    'weekday': weekday,
                    'seasonal_factor': seasonal_factor
                }
            
            total_forecast_revenue = sum(d['revenue'] for d in forecast_data.values())
            total_forecast_bookings = sum(d['bookings'] for d in forecast_data.values())
            
            return {
                'forecast_period': {
                    'start_date': (current_date + timedelta(days=1)).strftime("%Y-%m-%d"),
                    'end_date': (current_date + timedelta(days=forecast_days)).strftime("%Y-%m-%d"),
                    'days': forecast_days
                },
                'assumptions': {
                    'avg_daily_revenue': round(avg_daily_revenue, 2),
                    'avg_daily_bookings': round(avg_daily_bookings, 2),
                    'trend_factor': round(trend_factor, 4),
                    'historical_days': len(reports)
                },
                'forecast': {
                    'total_revenue': round(total_forecast_revenue, 2),
                    'total_bookings': total_forecast_bookings,
                    'average_daily_revenue': round(total_forecast_revenue / forecast_days, 2),
                    'average_daily_bookings': round(total_forecast_bookings / forecast_days, 2),
                    'daily_breakdown': forecast_data
                }
            }
    
    async def _calculate_revenue(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Рассчитать доходы"""
        result = await db.execute(
            select(
                sa_func.sum(Booking.price).label('total_revenue'),
                sa_func.count(Booking.id).label('total_bookings')
            )
            .where(
                and_(
                    Booking.created_at >= start_date,
                    Booking.created_at <= end_date,
                    Booking.status.in_(['confirmed', 'completed'])
                )
            )
        )
        revenue_data = result.first()
        
        # Доходы по категориям услуг
        result = await db.execute(
            select(
                Booking.service,
                sa_func.sum(Booking.price).label('revenue'),
                sa_func.count(Booking.id).label('count')
            )
            .where(
                and_(
                    Booking.created_at >= start_date,
                    Booking.created_at <= end_date,
                    Booking.status.in_(['confirmed', 'completed'])
                )
            )
            .group_by(Booking.service)
        )
        service_revenue = {
            service: {'revenue': float(revenue or 0), 'count': count}
            for service, revenue, count in result.all()
        }
        
        return {
            'total_revenue': float(revenue_data.total_revenue or 0),
            'total_bookings': revenue_data.total_bookings or 0,
            'average_booking_value': (
                float(revenue_data.total_revenue or 0) / (revenue_data.total_bookings or 1)
            ),
            'service_breakdown': service_revenue
        }
    
    async def _calculate_expenses(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Рассчитать расходы"""
        # Получаем финансовые транзакции с расходами
        result = await db.execute(
            select(
                FinancialTransaction.category,
                sa_func.sum(FinancialTransaction.amount).label('total')
            )
            .where(
                and_(
                    FinancialTransaction.created_at >= start_date,
                    FinancialTransaction.created_at <= end_date,
                    FinancialTransaction.transaction_type.in_(['expense', 'salary', 'refund'])
                )
            )
            .group_by(FinancialTransaction.category)
        )
        expense_categories = dict(result.all())
        
        # Классификация расходов
        cost_of_services = expense_categories.get('materials', 0) + expense_categories.get('products', 0)
        operating_expenses = (
            expense_categories.get('salary', 0) +
            expense_categories.get('rent', 0) +
            expense_categories.get('utilities', 0) +
            expense_categories.get('marketing', 0)
        )
        other_expenses = (
            expense_categories.get('maintenance', 0) +
            expense_categories.get('insurance', 0) +
            expense_categories.get('other', 0)
        )
        
        return {
            'cost_of_services': cost_of_services,
            'operating_expenses': operating_expenses,
            'other_expenses': other_expenses,
            'total_expenses': cost_of_services + operating_expenses + other_expenses,
            'category_breakdown': expense_categories
        }


# Глобальный экземпляр сервиса
financial_service = None


def init_financial_service(db_session_factory):
    """Инициализировать глобальный финансовый сервис"""
    global financial_service
    financial_service = FinancialService(db_session_factory)
