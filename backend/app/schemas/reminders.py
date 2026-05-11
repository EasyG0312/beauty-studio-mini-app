"""
Схемы данных для системы напоминаний
====================================

Содержит Pydantic модели для:
- Reminder - напоминания
- ReminderTemplate - шаблоны
- NotificationLog - логи уведомлений
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class ReminderType(str, Enum):
    """Типы напоминаний"""
    BEFORE_24H = "before_24h"
    BEFORE_2H = "before_2h"
    BIRTHDAY = "birthday"
    LOYALTY = "loyalty"
    PROMOTION = "promotion"


class NotificationChannel(str, Enum):
    """Каналы уведомлений"""
    TELEGRAM = "telegram"
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"


# === Reminder ===

class ReminderBase(BaseModel):
    """Базовая модель напоминания"""
    booking_id: int
    client_id: int
    reminder_type: ReminderType
    channel: NotificationChannel
    scheduled_at: datetime
    message_text: str
    template_data: Optional[str] = None


class ReminderCreate(ReminderBase):
    """Модель для создания напоминания"""
    pass


class ReminderUpdate(BaseModel):
    """Модель для обновления напоминания"""
    scheduled_at: Optional[datetime] = None
    message_text: Optional[str] = None
    is_sent: Optional[bool] = None


class ReminderResponse(ReminderBase):
    """Модель ответа для напоминания"""
    id: int
    sent_at: Optional[datetime] = None
    is_sent: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# === ReminderTemplate ===

class ReminderTemplateBase(BaseModel):
    """Базовая модель шаблона"""
    name: str = Field(..., max_length=100)
    reminder_type: ReminderType
    channel: NotificationChannel
    template_text: str
    variables: Optional[str] = None
    is_active: bool = True


class ReminderTemplateCreate(ReminderTemplateBase):
    """Модель для создания шаблона"""
    pass


class ReminderTemplateResponse(ReminderTemplateBase):
    """Модель ответа для шаблона"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# === NotificationLog ===

class NotificationLogBase(BaseModel):
    """Базовая модель лога уведомления"""
    reminder_id: Optional[int] = None
    client_id: int
    channel: NotificationChannel
    message_text: str
    status: str = Field(..., regex="^(sent|failed|pending)$")
    error_message: Optional[str] = None
    sent_at: datetime


class NotificationLogResponse(NotificationLogBase):
    """Модель ответа для лога уведомления"""
    id: int

    class Config:
        from_attributes = True


# === Статистика ===

class ReminderStats(BaseModel):
    """Статистика по напоминаниям"""
    total_reminders: int
    sent_reminders: int
    success_rate: float
    recent_sent: int
    recent_failed: int
    period_days: int


# === Запросы ===

class ReminderRequest(BaseModel):
    """Запрос на создание напоминания"""
    booking_id: int
    reminder_types: List[ReminderType]
    channels: List[NotificationChannel] = [NotificationChannel.TELEGRAM]


class BulkReminderRequest(BaseModel):
    """Массовый запрос на создание напоминаний"""
    booking_ids: List[int]
    reminder_type: ReminderType
    channel: NotificationChannel = NotificationChannel.TELEGRAM


# === Ответы ===

class ReminderSendResponse(BaseModel):
    """Ответ на отправку напоминаний"""
    message: str
    sent_count: int
    failed_count: int = 0
    errors: List[str] = []


class ReminderPreviewResponse(BaseModel):
    """Предпросмотр напоминания"""
    message_text: str
    scheduled_at: datetime
    channel: NotificationChannel
    variables: dict
