"""
Модели для системы расписания
==============================

Содержит:
- WorkSchedule - расписание работы мастеров
- ShiftType - типы смен
- WorkBreak - перерывы в работе
- ShiftSwap - обмен сменами
- Overtime - сверхурочная работа
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, Float, Time
from sqlalchemy.orm import relationship
from datetime import datetime, time
import enum

from app.database import Base


class ShiftType(enum.Enum):
    """Типы смен"""
    MORNING = "morning"      # 09:00 - 15:00
    AFTERNOON = "afternoon"   # 15:00 - 21:00
    EVENING = "evening"     # 18:00 - 23:00
    FULL_DAY = "full_day"   # 09:00 - 21:00
    FLEXIBLE = "flexible"    # Гибкий график
    WEEKEND = "weekend"      # Выходные


class WorkStatus(enum.Enum):
    """Статус работы"""
    SCHEDULED = "scheduled"      # Запланировано
    CONFIRMED = "confirmed"      # Подтверждено
    IN_PROGRESS = "in_progress"  # В процессе
    COMPLETED = "completed"      # Завершено
    ABSENT = "absent"          # Отсутствует
    LATE = "late"              # Опоздал
    SICK_LEAVE = "sick_leave"   # Больничный
    VACATION = "vacation"       # Отпуск


class WorkSchedule(Base):
    """Расписание работы мастеров"""
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Период работы
    date = Column(DateTime, nullable=False)  # Дата смены
    shift_type = Column(Enum(ShiftType), nullable=False)
    
    # Время работы
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_duration = Column(Integer, default=30)  # Продолжительность обеда в минутах
    
    # Статус
    status = Column(Enum(WorkStatus), default=WorkStatus.SCHEDULED)
    is_active = Column(Boolean, default=True)
    
    # Дополнительная информация
    notes = Column(Text, nullable=True)
    actual_start_time = Column(DateTime, nullable=True)  # Фактическое время начала
    actual_end_time = Column(DateTime, nullable=True)    # Фактическое время окончания
    
    # Зарплата и бонусы
    base_rate = Column(Float, nullable=True)  # Базовая ставка за смену
    overtime_rate = Column(Float, nullable=True)  # Ставка за сверхурочные
    bonus = Column(Float, default=0)  # Бонусы
    
    # Отношения
    master = relationship("Client", back_populates="work_schedules")
    breaks = relationship("WorkBreak", back_populates="schedule", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkBreak(Base):
    """Перерывы в работе"""
    __tablename__ = "work_breaks"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("work_schedules.id"), nullable=False)
    
    # Время перерыва
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Тип перерыва
    break_type = Column(String(50), nullable=False)  # lunch, coffee, rest, etc.
    is_paid = Column(Boolean, default=False)  # Оплачиваемый перерыв
    
    # Отношения
    schedule = relationship("WorkSchedule", back_populates="breaks")
    
    created_at = Column(DateTime, default=datetime.utcnow)


class ShiftSwap(Base):
    """Обмен сменами между мастерами"""
    __tablename__ = "shift_swaps"

    id = Column(Integer, primary_key=True, index=True)
    
    # Исходная смена
    original_schedule_id = Column(Integer, ForeignKey("work_schedules.id"), nullable=False)
    original_master_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Новая смена
    new_schedule_id = Column(Integer, ForeignKey("work_schedules.id"), nullable=True)
    new_master_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Статус обмена
    status = Column(String(20), default="pending")  # pending, approved, rejected, completed
    reason = Column(Text, nullable=True)
    
    # Подтверждение
    approved_by = Column(Integer, ForeignKey("clients.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Отношения
    original_schedule = relationship("WorkSchedule", foreign_keys=[original_schedule_id])
    new_schedule = relationship("WorkSchedule", foreign_keys=[new_schedule_id])
    original_master = relationship("Client", foreign_keys=[original_master_id])
    new_master = relationship("Client", foreign_keys=[new_master_id])
    approver = relationship("Client", foreign_keys=[approved_by])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Overtime(Base):
    """Сверхурочная работа"""
    __tablename__ = "overtime"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("work_schedules.id"), nullable=False)
    
    # Время сверхурочной работы
    date = Column(DateTime, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Оплата
    overtime_rate = Column(Float, nullable=False)  # Ставка за сверхурочные
    total_pay = Column(Float, nullable=False)
    
    # Причина
    reason = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("clients.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Отношения
    master = relationship("Client", back_populates="overtime_records")
    schedule = relationship("WorkSchedule", foreign_keys=[schedule_id])
    approver = relationship("Client", foreign_keys=[approved_by])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduleTemplate(Base):
    """Шаблоны расписаний для быстрого создания"""
    __tablename__ = "schedule_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Шаблон расписания (JSON)
    template_data = Column(Text, nullable=False)  # JSON с расписанием на неделю
    
    # Применение
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
