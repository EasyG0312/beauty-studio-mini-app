"""
Модели для системы напоминаний
================================

Содержит:
- Reminder - напоминания для клиентов
- ReminderTemplate - шаблоны напоминаний
- NotificationLog - лог отправленных уведомлений
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class ReminderType(enum.Enum):
    """Типы напоминаний"""
    BEFORE_24H = "before_24h"
    BEFORE_2H = "before_2h"
    BIRTHDAY = "birthday"
    LOYALTY = "loyalty"
    PROMOTION = "promotion"


class NotificationChannel(enum.Enum):
    """Каналы уведомлений"""
    TELEGRAM = "telegram"
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"


class Reminder(Base):
    """Напоминания для клиентов"""
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    reminder_type = Column(Enum(ReminderType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    scheduled_at = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    is_sent = Column(Boolean, default=False)
    
    message_text = Column(Text, nullable=False)
    template_data = Column(Text, nullable=True)  # JSON с данными для шаблона
    
    # Отношения
    booking = relationship("Booking", back_populates="reminders")
    client = relationship("Client", back_populates="reminders")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReminderTemplate(Base):
    """Шаблоны напоминаний"""
    __tablename__ = "reminder_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    reminder_type = Column(Enum(ReminderType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    template_text = Column(Text, nullable=False)
    variables = Column(Text, nullable=True)  # JSON с описанием переменных
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationLog(Base):
    """Лог отправленных уведомлений"""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    reminder_id = Column(Integer, ForeignKey("reminders.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    channel = Column(Enum(NotificationChannel), nullable=False)
    message_text = Column(Text, nullable=False)
    
    status = Column(String(20), nullable=False)  # sent, failed, pending
    error_message = Column(Text, nullable=True)
    
    sent_at = Column(DateTime, nullable=False)
    
    # Отношения
    reminder = relationship("Reminder", back_populates="logs")
    client = relationship("Client", back_populates="notification_logs")
