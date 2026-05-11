"""
Модели для системы отчетности
==============================

Содержит:
- DailyReport - ежедневные отчеты
- CashOperation - кассовые операции
- ShiftReport - отчеты по сменам
- FinancialTransaction - финансовые транзакции
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class ReportType(enum.Enum):
    """Типы отчетов"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SHIFT = "shift"


class CashOperationType(enum.Enum):
    """Типы кассовых операций"""
    CASH_IN = "cash_in"          # Приход
    CASH_OUT = "cash_out"        # Расход
    CARD_PAYMENT = "card_payment" # Оплата картой
    CASH_PAYMENT = "cash_payment" # Оплата наличными
    REFUND = "refund"            # Возврат
    SHIFT_OPEN = "shift_open"     # Открытие смены
    SHIFT_CLOSE = "shift_close"   # Закрытие смены


class DailyReport(Base):
    """Ежедневные отчеты"""
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(DateTime, nullable=False, unique=True)
    report_type = Column(Enum(ReportType), default=ReportType.DAILY)
    
    # Статистика записей
    total_bookings = Column(Integer, default=0)
    completed_bookings = Column(Integer, default=0)
    cancelled_bookings = Column(Integer, default=0)
    new_clients = Column(Integer, default=0)
    returning_clients = Column(Integer, default=0)
    
    # Финансовые показатели
    total_revenue = Column(Float, default=0.0)
    cash_revenue = Column(Float, default=0.0)
    card_revenue = Column(Float, default=0.0)
    refunds_amount = Column(Float, default=0.0)
    
    # Статистика по услугам
    services_stats = Column(JSON, nullable=True)  # {service_name: {count, revenue}}
    masters_stats = Column(JSON, nullable=True)    # {master_id: {bookings, revenue, hours}}
    
    # Дополнительная информация
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Отношения
    creator = relationship("Client", back_populates="daily_reports")
    cash_operations = relationship("CashOperation", back_populates="daily_report")
    shift_reports = relationship("ShiftReport", back_populates="daily_report")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CashOperation(Base):
    """Кассовые операции"""
    __tablename__ = "cash_operations"

    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id"), nullable=False)
    
    # Детали операции
    operation_type = Column(Enum(CashOperationType), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String(500), nullable=True)
    
    # Связанные сущности
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    master_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Дополнительная информация
    payment_method = Column(String(50), nullable=True)  # cash, card, transfer
    reference = Column(String(100), nullable=True)      # Номер чека/транзакции
    
    # Отношения
    daily_report = relationship("DailyReport", back_populates="cash_operations")
    booking = relationship("Booking", back_populates="cash_operations")
    master = relationship("Client", back_populates="cash_operations")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("clients.id"), nullable=False)


class ShiftReport(Base):
    """Отчеты по сменам"""
    __tablename__ = "shift_reports"

    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Время смены
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    # Статистика смены
    total_bookings = Column(Integer, default=0)
    completed_bookings = Column(Integer, default=0)
    cancelled_bookings = Column(Integer, default=0)
    
    # Финансы смены
    shift_revenue = Column(Float, default=0.0)
    cash_revenue = Column(Float, default=0.0)
    card_revenue = Column(Float, default=0.0)
    
    # Время работы
    planned_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    
    # Дополнительная информация
    notes = Column(Text, nullable=True)
    issues = Column(Text, nullable=True)  # Проблемы за смену
    achievements = Column(Text, nullable=True)  # Достижения
    
    # Отношения
    daily_report = relationship("DailyReport", back_populates="shift_reports")
    master = relationship("Client", back_populates="shift_reports")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FinancialTransaction(Base):
    """Финансовые транзакции"""
    __tablename__ = "financial_transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Тип и статус
    transaction_type = Column(String(50), nullable=False)  # payment, refund, expense, salary
    status = Column(String(20), default="completed")      # pending, completed, failed
    
    # Финансовые данные
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="KGS")
    
    # Связанные сущности
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    master_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Детали транзакции
    description = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)  # services, products, salary, rent, etc.
    payment_method = Column(String(50), nullable=True)
    
    # Дополнительная информация
    metadata = Column(JSON, nullable=True)  # Дополнительные данные
    external_id = Column(String(100), nullable=True)  # ID из внешней системы
    
    # Отношения
    booking = relationship("Booking", back_populates="financial_transactions")
    client = relationship("Client", back_populates="financial_transactions")
    master = relationship("Client", back_populates="financial_transactions")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InventoryTransaction(Base):
    """Транзакции по инвентарю"""
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Тип операции
    transaction_type = Column(String(20), nullable=False)  # purchase, usage, adjustment, sale
    
    # Товар
    product_name = Column(String(200), nullable=False)
    product_category = Column(String(100), nullable=True)
    
    # Количество и стоимость
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    
    # Дополнительная информация
    supplier = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Связанные сущности
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    master_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("clients.id"), nullable=False)


class WeeklyReport(Base):
    """Еженедельные отчеты"""
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(DateTime, nullable=False, unique=True)
    week_end = Column(DateTime, nullable=False)
    
    # Агрегированные данные за неделю
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    total_clients = Column(Integer, default=0)
    new_clients = Column(Integer, default=0)
    
    # Статистика по дням недели
    daily_breakdown = Column(JSON, nullable=True)  # {date: {bookings, revenue, clients}}
    
    # Топ услуги и мастера
    top_services = Column(JSON, nullable=True)    # [{service, count, revenue}]
    top_masters = Column(JSON, nullable=True)     # [{master_id, name, revenue, bookings}]
    
    # Сравнение с предыдущей неделей
    revenue_change_percent = Column(Float, default=0.0)
    bookings_change_percent = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("clients.id"), nullable=False)
