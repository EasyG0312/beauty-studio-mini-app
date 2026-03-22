from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import re


# === Booking Schemas ===
class BookingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str
    service: str
    master: str
    date: str  # DD.MM.YYYY
    time: str  # HH:MM
    comment: Optional[str] = ""
    chat_id: Optional[int] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        # Валидация для Кыргызстана (+996)
        pattern = r'^\+996\d{9}$'
        if not re.match(pattern, v):
            raise ValueError('Номер телефона должен быть в формате +996XXXXXXXXX (9 цифр после +996)')
        return v


class BookingCreate(BookingBase):
    is_reschedule: Optional[bool] = False
    old_booking_id: Optional[int] = 0


class BookingReschedule(BaseModel):
    booking_id: int
    new_date: str
    new_time: str
    reason: Optional[str] = ""


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None
    actual_amount: Optional[int] = None
    cancel_reason: Optional[str] = None
    is_on_the_way: Optional[bool] = None
    reminded_1d: Optional[bool] = None
    reminded_3d: Optional[bool] = None
    reminded_1h: Optional[bool] = None


class BookingResponse(BookingBase):
    id: int
    status: str
    actual_amount: Optional[int] = None
    is_reschedule: bool
    is_on_the_way: bool
    created_at: str
    
    class Config:
        from_attributes = True


# === Client Schemas ===
class ClientBase(BaseModel):
    name: str
    phone: str


class ClientCreate(ClientBase):
    chat_id: int


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    is_loyal: Optional[bool] = None


class ClientResponse(ClientBase):
    chat_id: int
    first_visit: str
    last_visit: str
    visit_count: int
    is_loyal: bool
    notes: Optional[str] = None
    rfm_segment: str
    rfm_score: int

    class Config:
        from_attributes = True


# === Loyalty Schemas ===
class LoyaltyStatus(BaseModel):
    chat_id: int
    visit_count: int
    is_loyal: bool
    discount_percent: int
    next_reward_at: int  # через сколько визитов следующая награда
    total_saved: float = 0  # общая сумма сэкономленных средств


class PhoneValidate(BaseModel):
    phone: str

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        pattern = r'^\+996\d{9}$'
        if not re.match(pattern, v):
            raise ValueError('Номер телефона должен быть в формате +996XXXXXXXXX')
        return v


# === Review Schemas ===
class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = ""


class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    rating: int
    comment: Optional[str]
    created_at: str
    client_name: str
    service: str
    master: str
    
    class Config:
        from_attributes = True


# === Waitlist Schemas ===
class WaitlistCreate(BaseModel):
    chat_id: int
    name: str
    phone: str
    date: str
    time: str
    master: str
    service: Optional[str] = ""


class WaitlistResponse(BaseModel):
    id: int
    chat_id: int
    name: str
    phone: str
    date: str
    time: str
    master: str
    service: str
    created_at: str
    
    class Config:
        from_attributes = True


# === Analytics Schemas ===
class RevenueStats(BaseModel):
    period_days: int
    total: float
    bookings_count: int


class MasterKPI(BaseModel):
    master: str
    completed: int
    cancelled: int
    no_show: int
    revenue: float
    avg_rating: float
    conversion: float
    avg_check: float


class RFMSegment(BaseModel):
    segment: str
    count: int
    clients: List[dict]


class AnalyticsSummary(BaseModel):
    total_clients: int
    loyal_clients: int
    today_bookings: int
    week_bookings: int
    total_bookings: int
    revenue_7d: float
    revenue_30d: float
    avg_rating: float
    confirmed: int
    cancelled: int
    no_show: int


# === Auth Schemas ===
class TelegramAuth(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None
    hash: str
    auth_date: int


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # client, manager, owner
    user_id: int


# === Blacklist Schemas ===
class BlacklistCreate(BaseModel):
    chat_id: int
    name: str
    phone: str
    reason: Optional[str] = ""
    no_show_count: Optional[int] = 0


class BlacklistResponse(BaseModel):
    chat_id: int
    name: str
    phone: str
    reason: str
    no_show_count: int
    added_at: str
    added_by: int

    class Config:
        from_attributes = True


# === Portfolio Schemas ===
class PortfolioCategory(str, Enum):
    GENERAL = "general"
    HAIRCUT = "haircut"
    MANICURE = "manicure"
    MAKEUP = "makeup"
    MASSAGE = "massage"
    COLORING = "coloring"


class PortfolioCreate(BaseModel):
    file_id: str
    category: PortfolioCategory = PortfolioCategory.GENERAL
    description: Optional[str] = ""
    master: Optional[str] = ""


class PortfolioResponse(BaseModel):
    id: int
    file_id: str
    added_at: str
    category: str
    description: Optional[str]
    master: Optional[str]
    is_public: bool

    class Config:
        from_attributes = True


class PortfolioUpdate(BaseModel):
    category: Optional[PortfolioCategory] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


# === Chat Message Schemas ===
class ChatMessageCreate(BaseModel):
    chat_id: int
    message: str
    is_from_client: bool


class ChatMessageResponse(BaseModel):
    id: int
    chat_id: int
    message: str
    is_from_client: bool
    created_at: str

    class Config:
        from_attributes = True


# === Common ===
class MessageResponse(BaseModel):
    message: str
    data: Optional[dict] = None


class SlotAvailability(BaseModel):
    date: str
    master: str
    available_slots: List[str]
    booked_slots: List[str]


# === Enhanced Analytics ===
class RevenueForecast(BaseModel):
    days: int
    forecast: float
    confidence: float


class ClientRFM(BaseModel):
    chat_id: int
    name: str
    phone: str
    rfm_segment: str
    rfm_score: int
    visit_count: int
    last_visit: str
    total_spent: float


# === Master Schedule Schemas ===
class MasterScheduleCreate(BaseModel):
    master: str
    day_of_week: int = Field(ge=0, le=6)  # 0=Пн, ..., 6=Вс
    start_time: str  # "09:00"
    end_time: str  # "20:00"
    is_working: bool = True


class MasterScheduleResponse(BaseModel):
    id: int
    master: str
    day_of_week: int
    start_time: str
    end_time: str
    is_working: bool
    is_active: bool

    class Config:
        from_attributes = True


class MasterScheduleUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: Optional[bool] = None
    is_active: Optional[bool] = None


class MasterTimeOffCreate(BaseModel):
    master: str
    start_date: str  # DD.MM.YYYY
    end_date: str  # DD.MM.YYYY
    reason: str = ""  # vacation, sick, personal, holiday
    comment: str = ""


class MasterTimeOffResponse(BaseModel):
    id: int
    master: str
    start_date: str
    end_date: str
    reason: str
    comment: str
    is_active: bool

    class Config:
        from_attributes = True


class MasterTimeOffUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reason: Optional[str] = None
    comment: Optional[str] = None
    is_active: Optional[bool] = None


class MasterAvailability(BaseModel):
    master: str
    date: str
    is_available: bool
    reason: Optional[str] = None
    schedule: Optional[MasterScheduleResponse] = None
    time_off: Optional[MasterTimeOffResponse] = None


# === Promo Code Schemas ===
class PromoCodeCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    discount_percent: int = Field(default=0, ge=0, le=100)
    discount_amount: int = Field(default=0, ge=0)
    min_booking_amount: int = Field(default=0, ge=0)
    valid_from: str
    valid_until: str
    usage_limit: int = Field(default=0, ge=0)


class PromoCodeResponse(BaseModel):
    id: int
    code: str
    discount_percent: int
    discount_amount: int
    min_booking_amount: int
    valid_from: str
    valid_until: str
    usage_limit: int
    usage_count: int
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class PromoCodeApply(BaseModel):
    code: str
    booking_id: int


class PromoCodeValidationResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    discount_percent: int = 0
    discount_amount: int = 0


# === Advanced Analytics Schemas ===
class FunnelStats(BaseModel):
    total: int
    pending: int
    confirmed: int
    completed: int
    cancelled: int
    no_show: int
    conversion_rate: float


class DailyStats(BaseModel):
    date: str
    bookings: int
    completed: int
    revenue: float
    avg_check: float


class HourlyHeatmap(BaseModel):
    day_of_week: int  # 0-6
    hour: str
    bookings_count: int
    utilization_percent: float


class ComparisonStats(BaseModel):
    current_period: float
    previous_period: float
    change_percent: float
    trend: str  # up, down, stable


class MasterPerformance(BaseModel):
    master: str
    bookings_count: int
    completed_count: int
    revenue: float
    avg_rating: float
    conversion_rate: float
    avg_check: float


class AnalyticsDashboard(BaseModel):
    period_days: int
    total_revenue: float
    total_bookings: int
    completed_bookings: int
    conversion_rate: float
    avg_check: float
    new_clients: int
    returning_clients: int
    top_services: List[dict]
    daily_stats: List[DailyStats]
    funnel: FunnelStats
    master_performance: List[MasterPerformance]


# === Notification Schemas ===
class NotificationType(str, Enum):
    REMINDER_3D = "reminder_3d"
    REMINDER_1D = "reminder_1d"
    REMINDER_1H = "reminder_1h"
    CONFIRMATION = "confirmation"
    WAITLIST = "waitlist"
    LOYALTY = "loyalty"


class NotificationCreate(BaseModel):
    chat_id: int
    notification_type: str
    message: str
    send_at: str
    booking_id: Optional[int] = None


class NotificationResponse(BaseModel):
    id: int
    chat_id: int
    notification_type: str
    message: str
    send_at: str
    sent: bool
    sent_at: Optional[str]
    booking_id: Optional[int]

    class Config:
        from_attributes = True
