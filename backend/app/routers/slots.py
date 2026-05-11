"""
Управление слотами (временем) роутеры
======================================

Endpoints:
- GET /api/slots/{date} - Получить доступные слоты на дату
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional

from app.database import get_db
from app.models import Booking, BlockedSlot
from app.schemas import SlotAvailability

router = APIRouter(prefix="/api/slots", tags=["slots"])


@router.get("/{date}", response_model=SlotAvailability)
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
