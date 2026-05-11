"""
Модели для системы коммуникации с клиентами
==============================================

Содержит:
- Campaign - маркетинговые кампании
- MessageTemplate - шаблоны сообщений
- CommunicationLog - лог отправленных сообщений
- ClientSegment - сегменты клиентов
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class CampaignType(enum.Enum):
    """Типы маркетинговых кампаний"""
    PROMOTION = "promotion"
    NEWSLETTER = "newsletter"
    SURVEY = "survey"
    ANNOUNCEMENT = "announcement"
    REENGAGEMENT = "reengagement"
    BIRTHDAY = "birthday"


class CampaignStatus(enum.Enum):
    """Статусы кампаний"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class MessageChannel(enum.Enum):
    """Каналы отправки сообщений"""
    EMAIL = "email"
    SMS = "sms"
    TELEGRAM = "telegram"
    PUSH = "push"
    ALL = "all"


class Campaign(Base):
    """Маркетинговые кампании"""
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Тип и статус
    campaign_type = Column(Enum(CampaignType), nullable=False)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    
    # Настройки отправки
    channel = Column(Enum(MessageChannel), nullable=False)
    send_immediately = Column(Boolean, default=False)
    scheduled_at = Column(DateTime, nullable=True)
    
    # Сегментация аудитории
    target_segments = Column(JSON, nullable=True)  # JSON с ID сегментов
    target_client_ids = Column(JSON, nullable=True)  # JSON с ID конкретных клиентов
    exclude_client_ids = Column(JSON, nullable=True)  # JSON с ID исключенных клиентов
    
    # Контент
    subject = Column(String(500), nullable=True)  # Для email
    message_text = Column(Text, nullable=False)
    template_id = Column(Integer, ForeignKey("message_templates.id"), nullable=True)
    
    # Метрики
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    unsubscribed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    # Дополнительные настройки
    attachments = Column(JSON, nullable=True)  # JSON с файлами
    tracking_enabled = Column(Boolean, default=True)
    personalization_enabled = Column(Boolean, default=True)
    
    # Отношения
    template = relationship("MessageTemplate", back_populates="campaigns")
    logs = relationship("CommunicationLog", back_populates="campaign")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)


class MessageTemplate(Base):
    """Шаблоны сообщений"""
    __tablename__ = "message_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Тип шаблона
    template_type = Column(String(50), nullable=False)  # promotion, newsletter, etc.
    channel = Column(Enum(MessageChannel), nullable=False)
    
    # Контент шаблона
    subject_template = Column(String(500), nullable=True)
    message_template = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True)  # JSON с описанием переменных
    
    # Настройки
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Отношения
    campaigns = relationship("Campaign", back_populates="template")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClientSegment(Base):
    """Сегменты клиентов для таргетинга"""
    __tablename__ = "client_segments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Правила сегментации (JSON)
    rules = Column(JSON, nullable=False)  # Условия попадания в сегмент
    
    # Статистика
    client_count = Column(Integer, default=0)
    last_updated = Column(DateTime, nullable=True)
    
    # Отношения
    clients = relationship("Client", secondary="segment_clients", back_populates="segments")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CommunicationLog(Base):
    """Лог всех отправленных сообщений"""
    __tablename__ = "communication_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Детали отправки
    channel = Column(Enum(MessageChannel), nullable=False)
    recipient = Column(String(500), nullable=False)  # Email/телефон/Telegram ID
    subject = Column(String(500), nullable=True)
    message_text = Column(Text, nullable=False)
    
    # Статус отправки
    status = Column(String(50), nullable=False)  # sent, failed, pending, bounced
    error_message = Column(Text, nullable=True)
    
    # Метрики взаимодействия
    sent_at = Column(DateTime, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    
    # Техническая информация
    provider_response = Column(JSON, nullable=True)  # Ответ от провайдера
    cost = Column(Float, nullable=True)  # Стоимость отправки
    
    # Отношения
    campaign = relationship("Campaign", back_populates="logs")
    client = relationship("Client", back_populates="communication_logs")
    
    created_at = Column(DateTime, default=datetime.utcnow)


class SegmentClient(Base):
    """Связь клиентов с сегментами (Many-to-Many)"""
    __tablename__ = "segment_clients"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(Integer, ForeignKey("client_segments.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    added_at = Column(DateTime, default=datetime.utcnow)


class Unsubscribe(Base):
    """Отписки от рассылок"""
    __tablename__ = "unsubscribes"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    channel = Column(Enum(MessageChannel), nullable=False)
    token = Column(String(255), unique=True, nullable=False)  # Для отписки по ссылке
    
    unsubscribed_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text, nullable=True)
    
    # Отношения
    client = relationship("Client", back_populates="unsubscribes")


class EmailSettings(Base):
    """Настройки email для клиентов"""
    __tablename__ = "email_settings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Предпочтения
    preferred_time = Column(String(10), nullable=True)  # morning, afternoon, evening
    timezone = Column(String(50), nullable=True)
    language = Column(String(10), default="ru")
    
    # Типы рассылок
    marketing_emails = Column(Boolean, default=True)
    newsletter_emails = Column(Boolean, default=True)
    promotional_emails = Column(Boolean, default=True)
    reminder_emails = Column(Boolean, default=True)
    
    # Отношения
    client = relationship("Client", back_populates="email_settings")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
