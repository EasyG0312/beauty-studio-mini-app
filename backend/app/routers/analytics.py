"""
Аналитика и отчеты роутеры
==========================

Endpoints:
- GET /api/analytics/summary - Сводная аналитика
- GET /api/analytics/revenue - Аналитика выручки
- GET /api/analytics/kpi - KPI мастеров
- GET /api/analytics/rfm - RFM сегментация
- GET /api/analytics/heatmap - Тепловая карта
- GET /api/analytics/forecast - Прогноз выручки
- GET /api/analytics/funnel - Воронка конверсии
- GET /api/analytics/export - Экспорт данных
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func, and_, or_
from datetime import datetime, timedelta
from typing import Optional, List
import logging

from app.database import get_db
from app.models import Booking, Client, Review
from app.schemas import (
    AnalyticsSummary, RevenueStats, MasterKPI,
    ClientRFM, RevenueForecast, FunnelStats,
    DailyStats, HourlyHeatmap, ComparisonStats,
    MasterPerformance, AnalyticsDashboard
)
from app.dependencies import require_role, get_user_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
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


@router.get("/revenue", response_model=RevenueStats)
async def get_revenue_stats(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить статистику выручки."""
    revenue = await calculate_revenue(db, days)
    return RevenueStats(
        period_days=days,
        total_revenue=revenue,
        average_daily=revenue / days if days > 0 else 0
    )


@router.get("/kpi", response_model=List[MasterKPI])
async def get_master_kpi(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить KPI мастеров."""
    # Получаем всех мастеров
    result = await db.execute(select(Booking.master).distinct())
    masters = [row[0] for row in result.all()]
    
    kpi_list = []
    for master in masters:
        kpi = await calculate_master_kpi(db, master, days)
        kpi_list.append(kpi)
    
    return kpi_list


@router.get("/rfm", response_model=List[ClientRFM])
async def get_rfm_segmentation(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Получить RFM сегментацию клиентов."""
    # Расчет RFM сегментации
    rfm_data = await calculate_rfm_segments(db)
    return rfm_data


@router.get("/heatmap", response_model=HourlyHeatmap)
async def get_heatmap(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить тепловую карту загруженности."""
    heatmap_data = await calculate_hourly_heatmap(db, days)
    return heatmap_data


@router.get("/forecast", response_model=RevenueForecast)
async def get_revenue_forecast(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Получить прогноз выручки."""
    forecast_7d = await predict_revenue(db, 7)
    forecast_30d = await predict_revenue(db, 30)
    
    return RevenueForecast(
        forecast_7d=forecast_7d,
        forecast_30d=forecast_30d,
        confidence=0.85  # 85% confidence
    )


@router.get("/funnel", response_model=FunnelStats)
async def get_funnel_stats(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить воронку конверсии."""
    funnel_data = await calculate_conversion_funnel(db, days)
    return funnel_data


@router.get("/export")
async def export_data(
    format: str = "csv",
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Экспортировать данные."""
    if format not in ["csv", "json"]:
        raise HTTPException(status_code=400, detail="Format must be csv or json")
    
    # Получаем данные для экспорта
    export_data = await get_export_data(db, days)
    
    if format == "csv":
        # Возвращаем CSV
        from fastapi.responses import Response
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Заголовки
        writer.writerow(["ID", "Имя", "Телефон", "Услуга", "Мастер", "Дата", "Время", "Статус", "Создано"])
        
        # Данные
        for booking in export_data:
            writer.writerow([
                booking.id, booking.name, booking.phone,
                booking.service, booking.master, booking.date,
                booking.time, booking.status, booking.created_at
            ])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=bookings.csv"}
        )
    else:
        # Возвращаем JSON
        return {
            "bookings": [
                {
                    "id": b.id,
                    "name": b.name,
                    "phone": b.phone,
                    "service": b.service,
                    "master": b.master,
                    "date": b.date,
                    "time": b.time,
                    "status": b.status,
                    "created_at": b.created_at
                }
                for b in export_data
            ]
        }


# === Helper Functions ===

async def calculate_revenue(db: AsyncSession, days: int) -> float:
    """Рассчитать выручку за указанный период."""
    # Средние цены для расчёта выручки (сом)
    SERVICES_PRICES = {
        "Стрижка": 1200,
        "Маникюр": 900,
        "Массаж лица": 1500,
        "Макияж": 1800,
        "Окрашивание": 2500,
    }
    
    # Получаем записи за период
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%d.%m.%Y")
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.date >= cutoff_date,
                Booking.status.in_(["confirmed", "arrived"])
            )
        )
    )
    bookings = result.scalars().all()
    
    # Считаем выручку
    revenue = 0
    for booking in bookings:
        price = SERVICES_PRICES.get(booking.service, 1000)  # Default price
        revenue += price
    
    return revenue


async def calculate_master_kpi(db: AsyncSession, master: str, days: int) -> MasterKPI:
    """Рассчитать KPI для мастера."""
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%d.%m.%Y")
    
    # Завершенные записи
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.master == master,
                Booking.date >= cutoff_date,
                Booking.status.in_(["confirmed", "arrived"])
            )
        )
    )
    completed_bookings = result.scalars().all()
    
    # Отмененные записи
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.master == master,
                Booking.date >= cutoff_date,
                Booking.status == "cancelled"
            )
        )
    )
    cancelled_bookings = result.scalars().all()
    
    # Выручка
    revenue = await calculate_revenue_by_master(db, master, days)
    
    # Рейтинг
    result = await db.execute(
        select(Review).where(Review.master == master)
    )
    reviews = result.scalars().all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
    
    # Конверсия
    total_bookings = len(completed_bookings) + len(cancelled_bookings)
    conversion_rate = len(completed_bookings) / total_bookings if total_bookings > 0 else 0
    
    return MasterKPI(
        master=master,
        completed_bookings=len(completed_bookings),
        cancelled_bookings=len(cancelled_bookings),
        revenue=revenue,
        avg_rating=avg_rating,
        conversion_rate=conversion_rate
    )


async def calculate_revenue_by_master(db: AsyncSession, master: str, days: int) -> float:
    """Рассчитать выручку мастера за период."""
    SERVICES_PRICES = {
        "Стрижка": 1200,
        "Маникюр": 900,
        "Массаж лица": 1500,
        "Макияж": 1800,
        "Окрашивание": 2500,
    }
    
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%d.%m.%Y")
    result = await db.execute(
        select(Booking).where(
            and_(
                Booking.master == master,
                Booking.date >= cutoff_date,
                Booking.status.in_(["confirmed", "arrived"])
            )
        )
    )
    bookings = result.scalars().all()
    
    revenue = sum(SERVICES_PRICES.get(b.service, 1000) for b in bookings)
    return revenue


async def calculate_rfm_segments(db: AsyncSession) -> List[ClientRFM]:
    """Рассчитать RFM сегментацию."""
    # Упрощенная RFM сегментация
    result = await db.execute(select(Client))
    clients = result.scalars().all()
    
    rfm_segments = []
    for client in clients:
        # Recency: дней с последнего визита
        last_visit = datetime.strptime(client.last_visit, "%d.%m.%Y")
        recency_days = (datetime.now() - last_visit).days
        
        # Frequency: количество записей
        result = await db.execute(
            select(Booking).where(Booking.chat_id == client.chat_id)
        )
        bookings = result.scalars().all()
        frequency = len(bookings)
        
        # Monetary: примерная сумма
        monetary = len(bookings) * 1200  # Средний чек
        
        # Определяем сегмент
        if recency_days <= 30 and frequency >= 5:
            segment = "Champions"
        elif recency_days <= 60 and frequency >= 3:
            segment = "Loyal"
        elif recency_days <= 90:
            segment = "At Risk"
        else:
            segment = "Lost"
        
        rfm_segments.append(ClientRFM(
            chat_id=client.chat_id,
            name=client.name,
            recency_days=recency_days,
            frequency=frequency,
            monetary=monetary,
            segment=segment
        ))
    
    return rfm_segments


async def calculate_hourly_heatmap(db: AsyncSession, days: int) -> HourlyHeatmap:
    """Рассчитать тепловую карту по часам."""
    # Упрощенная тепловая карта
    hours = list(range(9, 20))  # 9:00 - 19:00
    days_of_week = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    
    heatmap = {}
    for day in days_of_week:
        heatmap[day] = {}
        for hour in hours:
            heatmap[day][hour] = 0  # Заглушка
    
    return HourlyHeatmap(heatmap=heatmap)


async def predict_revenue(db: AsyncSession, days: int) -> float:
    """Предсказать выручку на основе исторических данных."""
    # Упрощенное предсказание на основе среднего
    current_revenue = await calculate_revenue(db, days)
    # Простая линейная экстраполяция
    return current_revenue * 1.1  # +10% рост


async def calculate_conversion_funnel(db: AsyncSession, days: int) -> FunnelStats:
    """Рассчитать воронку конверсии."""
    # Упрощенная воронка
    total_visitors = 1000  # Заглушка
    bookings_started = 100
    bookings_completed = 80
    
    return FunnelStats(
        visitors=total_visitors,
        bookings_started=bookings_started,
        bookings_completed=bookings_completed,
        conversion_rate=bookings_completed / total_visitors if total_visitors > 0 else 0
    )


async def get_export_data(db: AsyncSession, days: int) -> List[Booking]:
    """Получить данные для экспорта."""
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%d.%m.%Y")
    result = await db.execute(
        select(Booking).where(Booking.date >= cutoff_date)
    )
    return result.scalars().all()
