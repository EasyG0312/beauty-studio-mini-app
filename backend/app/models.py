from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    service = Column(String, nullable=False)
    master = Column(String, nullable=False)
    date = Column(String, nullable=False)  # DD.MM.YYYY
    time = Column(String, nullable=False)  # HH:MM
    comment = Column(Text, default="")
    chat_id = Column(Integer, nullable=True)  # 0 для записи по звонку
    status = Column(String, default="pending")  # pending, confirmed, cancelled, completed, no_show
    actual_amount = Column(Integer, default=0)
    is_reschedule = Column(Boolean, default=False)
    old_booking_id = Column(Integer, default=0)
    reminded_1d = Column(Boolean, default=False)
    reminded_3d = Column(Boolean, default=False)
    reminded_1h = Column(Boolean, default=False)
    review_sent = Column(Boolean, default=False)
    no_show_checked = Column(Boolean, default=False)
    repeat_notified = Column(Boolean, default=False)
    is_on_the_way = Column(Boolean, default=False)
    cancel_reason = Column(String, default="")
    arrived_at = Column(String, default="")  # Время прихода клиента (QR скан)
    created_at = Column(String)
    
    # Связи
    reviews = relationship("Review", back_populates="booking", lazy="selectin")
    
    __table_args__ = (
        Index("idx_bookings_chat_id", "chat_id"),
        Index("idx_bookings_date", "date"),
        Index("idx_bookings_status", "status"),
        Index("idx_bookings_date_status", "date", "status"),
    )


class BlockedSlot(Base):
    __tablename__ = "blocked_slots"
    
    id = Column(Integer, primary_key=True)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    master = Column(String, default="all")
    
    __table_args__ = (
        UniqueConstraint("date", "time", "master"),
    )


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    chat_id = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(String)
    
    # Поля для управления отзывом админом
    admin_reply = Column(Text, default="")  # Ответ админа/владельца
    replied_at = Column(String, nullable=True)  # Когда ответили
    is_visible = Column(Boolean, default=True)  # Показывать ли на сайте
    is_deleted = Column(Boolean, default=False)  # Удалён (soft delete)
    
    booking = relationship("Booking", back_populates="reviews")


class Client(Base):
    __tablename__ = "clients"

    chat_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    first_visit = Column(String, nullable=False)
    last_visit = Column(String, nullable=False)
    visit_count = Column(Integer, default=0)
    is_loyal = Column(Boolean, default=False)
    notes = Column(Text, default="")
    rfm_segment = Column(String, default="")
    rfm_score = Column(Integer, default=0)
    total_saved = Column(Integer, default=0)  # Общая сумма скидок

    __table_args__ = (
        Index("idx_clients_loyal", "is_loyal"),
    )


class Portfolio(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True)
    file_id = Column(String, unique=True)
    added_at = Column(String)
    category = Column(String, default="general")  # haircut, manicure, makeup, massage, coloring
    description = Column(String, default="")
    master = Column(String, default="")  # имя мастера
    is_public = Column(Boolean, default=True)


class MasterPhoto(Base):
    __tablename__ = "master_photos"
    
    master = Column(String, primary_key=True)
    file_id = Column(String, nullable=False)
    added_at = Column(String, nullable=False)


class Waitlist(Base):
    __tablename__ = "waitlist"
    
    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    master = Column(String, default="all")
    service = Column(String, default="")
    created_at = Column(String)
    
    __table_args__ = (
        UniqueConstraint("chat_id", "date", "time", "master"),
    )


class Blacklist(Base):
    __tablename__ = "blacklist"

    chat_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    reason = Column(String, default="")
    no_show_count = Column(Integer, default=0)
    added_at = Column(String, nullable=False)
    added_by = Column(Integer, default=0)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, nullable=False, index=True)
    message = Column(Text, nullable=False)
    is_from_client = Column(Boolean, default=True)
    created_at = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_chat_messages_chat_id", "chat_id"),
        Index("idx_chat_messages_created_at", "created_at"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, nullable=False, index=True)
    notification_type = Column(String, nullable=False)  # reminder_3d, reminder_1d, reminder_1h, confirmation
    message = Column(Text, nullable=False)
    send_at = Column(String, nullable=False)
    sent = Column(Boolean, default=False)
    sent_at = Column(String, nullable=True)
    booking_id = Column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_notifications_chat_id", "chat_id"),
        Index("idx_notifications_sent", "sent"),
        Index("idx_notifications_send_at", "send_at"),
    )


class MasterSchedule(Base):
    __tablename__ = "master_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    master = Column(String, nullable=False, index=True)  # имя мастера
    day_of_week = Column(Integer, nullable=False)  # 0=Пн, 1=Вт, ..., 6=Вс
    start_time = Column(String, nullable=False)  # "09:00"
    end_time = Column(String, nullable=False)  # "20:00"
    is_working = Column(Boolean, default=True)  # работает ли в этот день
    is_active = Column(Boolean, default=True)  # активно ли расписание

    __table_args__ = (
        UniqueConstraint("master", "day_of_week", "is_active"),
        Index("idx_master_schedules_master", "master"),
        Index("idx_master_schedules_day", "day_of_week"),
    )


class MasterTimeOff(Base):
    __tablename__ = "master_time_off"

    id = Column(Integer, primary_key=True, autoincrement=True)
    master = Column(String, nullable=False, index=True)
    start_date = Column(String, nullable=False)  # DD.MM.YYYY
    end_date = Column(String, nullable=False)  # DD.MM.YYYY
    reason = Column(String, default="")  # vacation, sick, personal, holiday
    comment = Column(String, default="")
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index("idx_master_time_off_master", "master"),
        Index("idx_master_time_off_dates", "start_date", "end_date"),
    )


class BotSettings(Base):
    __tablename__ = "bot_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_token = Column(String, nullable=False)
    admin_chat_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(String, nullable=True)


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False, index=True)
    discount_percent = Column(Integer, default=0)
    discount_amount = Column(Integer, default=0)
    min_booking_amount = Column(Integer, default=0)
    valid_from = Column(String, nullable=False)
    valid_until = Column(String, nullable=False)
    usage_limit = Column(Integer, default=0)  # 0 = безлимит
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(String, nullable=True)

    __table_args__ = (
        Index("idx_promo_codes_code", "code"),
        Index("idx_promo_codes_active", "is_active"),
    )


class QRCode(Base):
    __tablename__ = "qr_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    code = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now())
    scanned_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_qr_codes_booking_id", "booking_id"),
        Index("idx_qr_codes_code", "code"),
    )
