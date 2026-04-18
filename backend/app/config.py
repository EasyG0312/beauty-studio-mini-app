import os
from pydantic_settings import BaseSettings
from pydantic import SecretStr
from typing import List, Optional


class Settings(BaseSettings):
    # Telegram
    bot_token: Optional[SecretStr] = None
    admin_chat_id: Optional[int] = None
    admin_ids: str = ""
    owner_ids: str = ""

    # Business
    business_name: str = "Beauty Studio Bishkek"
    phone: str = "+996 707 001112"
    address: str = "г. Бишкек, ул. Ахунбаева, 1"
    working_hours: str = "Пн-Сб: 09:00 - 20:00"

    # Database
    database_url: str | None = None

    # Email
    email_smtp_host: str | None = None
    email_smtp_port: int = 587
    email_user: str | None = None
    email_pass: str | None = None
    email_to: str | None = None

    # JWT
    jwt_secret: Optional[SecretStr] = None
    jwt_algorithm: str = "HS256"

    # CORS
    cors_origins: str = "*"

    # Business logic
    repeat_sale_days: int = 45
    cancel_hours: int = 5
    loyalty_visits: int = 5
    loyalty_discount: int = 10

    @property
    def admin_ids_list(self) -> List[int]:
        return [int(x.strip()) for x in self.admin_ids.split(",") if x.strip()]

    @property
    def owner_ids_list(self) -> List[int]:
        return [int(x.strip()) for x in self.owner_ids.split(",") if x.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        return [x.strip() for x in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
