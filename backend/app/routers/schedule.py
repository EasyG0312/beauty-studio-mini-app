"""
Управление расписанием роутеры
=================================

Endpoints:
- GET /api/schedule/{master_id} - Получить расписание мастера
- POST /api/schedule - Создать смену
- PUT /api/schedule/{id} - Обновить смену
- DELETE /api/schedule/{id} - Удалить смену
- POST /api/schedule/swap - Запрос на обмен смены
- POST /api/schedule/optimize - Оптимизировать расписание
- GET /api/schedule/workload - Загруженность мастеров
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func as sa_func
from datetime import datetime, timedelta, time
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Client
from app.models.schedule import WorkSchedule, ShiftType, WorkStatus, ShiftSwap
from app.schemas import (
    WorkScheduleCreate, WorkScheduleUpdate, WorkScheduleResponse,
    ShiftSwapCreate, ShiftSwapResponse, WorkloadResponse,
    ScheduleOptimizationResponse
)
from app.dependencies import require_role, get_user_role
from app.services.schedule_service import schedule_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/schedule", tags=["schedule"])


@router.get("/{master_id}", response_model=List[WorkScheduleResponse])
async def get_master_schedule(
    master_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить расписание мастера за период."""
    if not start_date:
        start_date = datetime.now().strftime("%Y-%m-%d")
    if not end_date:
        end_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
    
    schedules = await schedule_service.get_schedule_by_period(master_id, start_dt, end_dt)
    return schedules


@router.get("/{master_id}/week", response_model=dict)
async def get_week_schedule(
    master_id: int,
    week_start: str,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить расписание мастера на неделю."""
    week_start_dt = datetime.strptime(week_start, "%Y-%m-%d")
    week_schedule = await schedule_service.get_week_schedule(master_id, week_start_dt)
    return week_schedule


@router.post("", response_model=WorkScheduleResponse)
async def create_schedule(
    schedule: WorkScheduleCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Создать новую смену."""
    schedule_data = schedule.model_dump()
    schedule_data['created_at'] = datetime.utcnow()
    
    new_schedule = await schedule_service.create_schedule(schedule_data)
    logger.info(f"Created schedule {new_schedule.id} by user {user.chat_id}")
    return new_schedule


@router.put("/{schedule_id}", response_model=WorkScheduleResponse)
async def update_schedule(
    schedule_id: int,
    update: WorkScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Обновить смену."""
    result = await db.execute(select(WorkSchedule).where(WorkSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Проверяем права доступа
    user_role = get_user_role(user)
    if user_role != "owner" and schedule.master_id != user.chat_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)
    
    schedule.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(schedule)
    
    logger.info(f"Updated schedule {schedule_id} by user {user.chat_id}")
    return schedule


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Удалить смену."""
    result = await db.execute(select(WorkSchedule).where(WorkSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Проверяем права доступа
    user_role = get_user_role(user)
    if user_role != "owner" and schedule.master_id != user.chat_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Мягкое удаление
    schedule.is_active = False
    schedule.updated_at = datetime.utcnow()
    await db.commit()
    
    logger.info(f"Deleted schedule {schedule_id} by user {user.chat_id}")
    return {"message": "Schedule deleted"}


@router.post("/swap", response_model=ShiftSwapResponse)
async def request_shift_swap(
    swap_data: ShiftSwapCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Создать запрос на обмен смены."""
    try:
        swap = await schedule_service.request_shift_swap(
            swap_data.original_schedule_id,
            swap_data.new_master_id,
            swap_data.reason
        )
        logger.info(f"Created shift swap request by user {user.chat_id}")
        return swap
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/swap/{swap_id}/approve")
async def approve_shift_swap(
    swap_id: int,
    new_schedule_data: WorkScheduleCreate,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Одобрить обмен смены."""
    success = await schedule_service.approve_shift_swap(
        swap_id, 
        user.chat_id, 
        new_schedule_data.model_dump()
    )
    
    if success:
        logger.info(f"Approved shift swap {swap_id} by user {user.chat_id}")
        return {"message": "Shift swap approved"}
    else:
        raise HTTPException(status_code=400, detail="Failed to approve shift swap")


@router.get("/swap/pending", response_model=List[ShiftSwapResponse])
async def get_pending_swaps(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить ожидающие запросы на обмен."""
    result = await db.execute(
        select(ShiftSwap).where(ShiftSwap.status == "pending")
    )
    swaps = result.scalars().all()
    return swaps


@router.post("/optimize", response_model=ScheduleOptimizationResponse)
async def optimize_schedule(
    master_id: int,
    start_date: str,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Оптимизировать расписание мастера."""
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        optimization = await schedule_service.auto_optimize_schedule(master_id, start_dt, days)
        
        logger.info(f"Schedule optimization completed for master {master_id}")
        return optimization
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workload", response_model=List[WorkloadResponse])
async def get_workload(
    date: str,
    shift_type: Optional[ShiftType] = None,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить загруженность мастеров на дату."""
    try:
        date_dt = datetime.strptime(date, "%Y-%m-%d")
        workload = await schedule_service.get_master_workload(date_dt, shift_type)
        return workload
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")


@router.get("/overtime/{master_id}")
async def get_overtime_stats(
    master_id: int,
    period_start: str,
    period_end: str,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager")
):
    """Получить статистику сверхурочных для мастера."""
    try:
        start_dt = datetime.strptime(period_start, "%Y-%m-%d")
        end_dt = datetime.strptime(period_end, "%Y-%m-%d")
        
        overtime_stats = await schedule_service.calculate_overtime(master_id, start_dt, end_dt)
        return overtime_stats
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")


@router.get("/templates", response_model=List[dict])
async def get_schedule_templates(
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Получить шаблоны расписаний."""
    result = await db.execute(
        select(ScheduleTemplate).where(ScheduleTemplate.is_active == True)
    )
    templates = result.scalars().all()
    
    return [
        {
            'id': t.id,
            'name': t.name,
            'description': t.description,
            'template_data': t.template_data,
            'is_default': t.is_default
        }
        for t in templates
    ]


@router.post("/templates", response_model=dict)
async def create_schedule_template(
    template_data: dict,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner"))
):
    """Создать шаблон расписания."""
    template = ScheduleTemplate(
        name=template_data['name'],
        description=template_data.get('description', ''),
        template_data=template_data['template_data'],
        is_default=template_data.get('is_default', False)
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    logger.info(f"Created schedule template {template.id} by user {user.chat_id}")
    return {
        'id': template.id,
        'name': template.name,
        'message': 'Template created successfully'
    }


@router.post("/generate")
async def generate_schedule_from_template(
    template_id: int,
    start_date: str,
    master_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager")
):
    """Сгенерировать расписание из шаблона."""
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        schedules = await schedule_service.generate_schedule_from_template(
            template_id, start_dt, master_id
        )
        
        logger.info(f"Generated {len(schedules)} schedules from template {template_id}")
        return {
            'message': f'Generated {len(schedules)} schedules',
            'schedules': [s.id for s in schedules]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# === Статистика ===

@router.get("/stats/{master_id}")
async def get_schedule_stats(
    master_id: int,
    period_days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Получить статистику по расписанию мастера."""
    period_start = datetime.now() - timedelta(days=period_days)
    
    result = await db.execute(
        select(sa_func.count(WorkSchedule.id)).where(
            and_(
                WorkSchedule.master_id == master_id,
                WorkSchedule.date >= period_start,
                WorkSchedule.is_active == True
            )
        )
    )
    total_shifts = result.scalar() or 0
    
    # Завершенные смены
    result = await db.execute(
        select(sa_func.count(WorkSchedule.id)).where(
            and_(
                WorkSchedule.master_id == master_id,
                WorkSchedule.date >= period_start,
                WorkSchedule.status == WorkStatus.COMPLETED
            )
        )
    )
    completed_shifts = result.scalar() or 0
    
    # Пропущенные смены
    result = await db.execute(
        select(sa_func.count(WorkSchedule.id)).where(
            and_(
                WorkSchedule.master_id == master_id,
                WorkSchedule.date >= period_start,
                WorkSchedule.status == WorkStatus.ABSENT
            )
        )
    )
    absent_shifts = result.scalar() or 0
    
    # Общее количество часов
    result = await db.execute(
        select(WorkSchedule).where(
            and_(
                WorkSchedule.master_id == master_id,
                WorkSchedule.date >= period_start,
                WorkSchedule.status == WorkStatus.COMPLETED,
                WorkSchedule.actual_start_time.isnot(None),
                WorkSchedule.actual_end_time.isnot(None)
            )
        )
    )
    completed_schedules = result.scalars().all()
    
    total_hours = 0
    for schedule in completed_schedules:
        if schedule.actual_start_time and schedule.actual_end_time:
            duration = schedule.actual_end_time - schedule.actual_start_time
            hours = duration.total_seconds() / 3600
            total_hours += hours
    
    return {
        'total_shifts': total_shifts,
        'completed_shifts': completed_shifts,
        'absent_shifts': absent_shifts,
        'attendance_rate': (completed_shifts / total_shifts * 100) if total_shifts > 0 else 0,
        'total_hours': round(total_hours, 2),
        'period_days': period_days
    }
