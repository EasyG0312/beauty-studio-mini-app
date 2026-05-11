"""
Модели для управления персоналом (HR)
=====================================

Содержит:
- EmployeeProfile - профили сотрудников
- KPI - показатели эффективности
- TimeSheet - табель учета времени
- PerformanceReview - оценки производительности
- Training - обучение и развитие
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class EmployeeStatus(enum.Enum):
    """Статусы сотрудников"""
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    VACATION = "vacation"
    SICK_LEAVE = "sick_leave"
    TERMINATED = "terminated"
    PROBATION = "probation"


class KPIType(enum.Enum):
    """Типы KPI"""
    REVENUE = "revenue"                    # Выручка
    BOOKINGS = "bookings"                  # Количество записей
    CLIENT_RETENTION = "client_retention"    # Удержание клиентов
    RATING = "rating"                      # Рейтинг клиентов
    PUNCTUALITY = "punctuality"            # Пунктуальность
    UPSALES = "upsales"                    # Допродажи
    ATTENDANCE = "attendance"              # Посещаемость


class PerformanceLevel(enum.Enum):
    """Уровни производительности"""
    EXCELLENT = "excellent"    # Отлично
    GOOD = "good"              # Хорошо
    SATISFACTORY = "satisfactory"  # Удовлетворительно
    NEEDS_IMPROVEMENT = "needs_improvement"  # Требует улучшения
    POOR = "poor"              # Плохо


class EmployeeProfile(Base):
    """Профили сотрудников"""
    __tablename__ = "employee_profiles"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, unique=True)
    
    # Основная информация
    employee_code = Column(String(20), unique=True, nullable=False)  # Табельный номер
    position = Column(String(100), nullable=False)  # Должность
    department = Column(String(100), nullable=True)  # Отдел
    hire_date = Column(DateTime, nullable=False)  # Дата приема на работу
    
    # Статус и условия
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    employment_type = Column(String(50), nullable=True)  # full_time, part_time, contract
    work_schedule = Column(String(100), nullable=True)  # График работы
    
    # Финансовая информация
    base_salary = Column(Float, nullable=True)  # Базовая зарплата
    commission_rate = Column(Float, nullable=True)  # Процент комиссии
    bonus_rate = Column(Float, nullable=True)  # Процент бонусов
    
    # Навыки и квалификация
    skills = Column(JSON, nullable=True)  # Навыки
    certifications = Column(JSON, nullable=True)  # Сертификаты
    experience_years = Column(Integer, default=0)  # Опыт в годах
    specialization = Column(String(200), nullable=True)  # Специализация
    
    # Контакты и документы
    emergency_contact = Column(JSON, nullable=True)  # Экстренные контакты
    documents = Column(JSON, nullable=True)  # Документы
    
    # Дополнительная информация
    notes = Column(Text, nullable=True)
    
    # Отношения
    client = relationship("Client", back_populates="employee_profile")
    kpis = relationship("KPI", back_populates="employee")
    timesheets = relationship("TimeSheet", back_populates="employee")
    reviews = relationship("PerformanceReview", back_populates="employee")
    trainings = relationship("Training", back_populates="employee")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KPI(Base):
    """Показатели эффективности (KPI)"""
    __tablename__ = "kpis"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_profiles.id"), nullable=False)
    
    # Тип и период
    kpi_type = Column(Enum(KPIType), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Целевые и фактические значения
    target_value = Column(Float, nullable=False)
    actual_value = Column(Float, nullable=True)
    achievement_percentage = Column(Float, nullable=True)  # % выполнения
    
    # Вес и расчет
    weight = Column(Float, default=1.0)  # Вес в общем KPI
    bonus_amount = Column(Float, nullable=True)  # Бонус за выполнение
    
    # Дополнительная информация
    notes = Column(Text, nullable=True)
    calculated_at = Column(DateTime, nullable=True)
    
    # Отношения
    employee = relationship("EmployeeProfile", back_populates="kpis")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TimeSheet(Base):
    """Табель учета времени"""
    __tablename__ = "timesheets"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_profiles.id"), nullable=False)
    
    # Дата и время
    date = Column(DateTime, nullable=False)
    check_in = Column(DateTime, nullable=True)  # Время прихода
    check_out = Column(DateTime, nullable=True)  # Время ухода
    break_start = Column(DateTime, nullable=True)  # Начало обеда
    break_end = Column(DateTime, nullable=True)  # Конец обеда
    
    # Расчет времени
    total_hours = Column(Float, nullable=True)  # Всего часов
    work_hours = Column(Float, nullable=True)  # Рабочие часы
    overtime_hours = Column(Float, nullable=True)  # Сверхурочные часы
    
    # Статус
    status = Column(String(20), default="normal")  # normal, late, early_leave, absent
    approved_by = Column(Integer, ForeignKey("clients.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Комментарии
    employee_notes = Column(Text, nullable=True)
    manager_notes = Column(Text, nullable=True)
    
    # Отношения
    employee = relationship("EmployeeProfile", back_populates="timesheets")
    approver = relationship("Client", foreign_keys=[approved_by])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PerformanceReview(Base):
    """Оценки производительности"""
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_profiles.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Период оценки
    review_period_start = Column(DateTime, nullable=False)
    review_period_end = Column(DateTime, nullable=False)
    review_date = Column(DateTime, nullable=False)
    
    # Оценки по категориям
    technical_skills = Column(Integer, nullable=True)  # Технические навыки (1-5)
    customer_service = Column(Integer, nullable=True)  # Обслуживание клиентов (1-5)
    teamwork = Column(Integer, nullable=True)  # Работа в команде (1-5)
    punctuality = Column(Integer, nullable=True)  # Пунктуальность (1-5)
    initiative = Column(Integer, nullable=True)  # Инициативность (1-5)
    
    # Общая оценка
    overall_score = Column(Float, nullable=True)  # Общий балл
    performance_level = Column(Enum(PerformanceLevel), nullable=True)
    
    # Цели и планы
    strengths = Column(Text, nullable=True)  # Сильные стороны
    areas_for_improvement = Column(Text, nullable=True)  # Зоны улучшения
    goals = Column(Text, nullable=True)  # Цели на следующий период
    development_plan = Column(Text, nullable=True)  # План развития
    
    # Дополнительная информация
    employee_comments = Column(Text, nullable=True)  # Комментарии сотрудника
    reviewer_comments = Column(Text, nullable=True)  # Комментарии ревьюера
    
    # Отношения
    employee = relationship("EmployeeProfile", back_populates="reviews")
    reviewer = relationship("Client", foreign_keys=[reviewer_id])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Training(Base):
    """Обучение и развитие"""
    __tablename__ = "trainings"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_profiles.id"), nullable=False)
    
    # Информация о обучении
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    training_type = Column(String(50), nullable=True)  # course, workshop, seminar, certification
    provider = Column(String(200), nullable=True)  # Провайдер
    
    # Даты и длительность
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    duration_hours = Column(Float, nullable=True)
    
    # Статус и результаты
    status = Column(String(20), default="planned")  # planned, in_progress, completed, cancelled
    completion_status = Column(String(20), nullable=True)  # passed, failed, pending
    grade_score = Column(Float, nullable=True)  # Оценка
    certificate_obtained = Column(Boolean, default=False)
    
    # Финансовая информация
    cost = Column(Float, nullable=True)  # Стоимость обучения
    company_paid = Column(Boolean, default=True)  # Оплачено компанией
    
    # Дополнительная информация
    materials = Column(JSON, nullable=True)  # Материалы
    notes = Column(Text, nullable=True)
    
    # Отношения
    employee = relationship("EmployeeProfile", back_populates="trainings")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeaveRequest(Base):
    """Запросы на отпуск"""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_profiles.id"), nullable=False)
    
    # Тип и период отпуска
    leave_type = Column(String(50), nullable=False)  # vacation, sick_leave, personal, maternity
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    duration_days = Column(Integer, nullable=False)
    
    # Статус
    status = Column(String(20), default="pending")  # pending, approved, rejected, cancelled
    approved_by = Column(Integer, ForeignKey("clients.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Документы и комментарии
    reason = Column(Text, nullable=True)
    supporting_documents = Column(JSON, nullable=True)
    manager_comments = Column(Text, nullable=True)
    
    # Отношения
    employee = relationship("EmployeeProfile")
    approver = relationship("Client", foreign_keys=[approved_by])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Salary(Base):
    """Зарплатные ведомости"""
    __tablename__ = "salaries"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employee_profiles.id"), nullable=False)
    
    # Период
    pay_period_start = Column(DateTime, nullable=False)
    pay_period_end = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True)
    
    # Компоненты зарплаты
    base_salary = Column(Float, nullable=True)  # Базовая зарплата
    commission = Column(Float, nullable=True)  # Комиссия
    bonuses = Column(Float, nullable=True)  # Бонусы
    overtime_pay = Column(Float, nullable=True)  # Сверхурочные
    
    # Вычеты
    tax_deductions = Column(Float, nullable=True)  # Налоги
    other_deductions = Column(Float, nullable=True)  # Прочие вычеты
    
    # Итоговые суммы
    gross_salary = Column(Float, nullable=True)  # Брутто зарплата
    net_salary = Column(Float, nullable=True)  # Нетто зарплата
    
    # Статус
    status = Column(String(20), default="calculated")  # calculated, approved, paid
    approved_by = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Дополнительная информация
    notes = Column(Text, nullable=True)
    breakdown = Column(JSON, nullable=True)  # Детальная разбивка
    
    # Отношения
    employee = relationship("EmployeeProfile")
    approver = relationship("Client", foreign_keys=[approved_by])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
