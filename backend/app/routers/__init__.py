"""
Роутеры Beauty Studio API
========================

Модуль содержит все роутеры API:
- auth - аутентификация и авторизация
- bookings - управление записями
- analytics - аналитика и отчеты
- qr_codes - QR-коды система
- slots - управление временными слотами
"""

from . import auth, bookings, analytics, qr_codes, slots

__all__ = ["auth", "bookings", "analytics", "qr_codes", "slots"]
