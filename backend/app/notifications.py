"""
Уведомления в Telegram для админов/менеджеров
================================================
Отправка уведомлений при новых записях, отменах, событиях.
"""

import os
import logging
from typing import Optional
import httpx
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

# Конфигурация из settings
BOT_TOKEN = settings.bot_token.get_secret_value() if settings.bot_token else os.getenv("BOT_TOKEN", "")
ADMIN_CHAT_ID = str(settings.admin_chat_id) if settings.admin_chat_id else os.getenv("ADMIN_CHAT_ID", "")
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://frontend-gamma-livid-32.vercel.app")


class TelegramNotifier:
    """Класс для отправки уведомлений через Telegram Bot API."""
    
    def __init__(self, bot_token: str = None, mini_app_url: str = None):
        self.bot_token = bot_token or BOT_TOKEN
        self.mini_app_url = mini_app_url or MINI_APP_URL
        self.api_base = f"https://api.telegram.org/bot{self.bot_token}"
    
    async def send_message(
        self, 
        chat_id: str, 
        text: str, 
        reply_markup: Optional[dict] = None
    ) -> bool:
        """Отправить текстовое сообщение."""
        if not self.bot_token:
            logger.warning("BOT_TOKEN не настроен")
            return False
        
        try:
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/sendMessage",
                    json=payload,
                    timeout=10.0
                )
                result = response.json()
                
                if result.get("ok"):
                    logger.info(f"Уведомление отправлено в {chat_id}")
                    return True
                else:
                    logger.error(f"Ошибка Telegram API: {result}")
                    return False
                    
        except Exception as e:
            logger.error(f"Ошибка отправки уведомления: {e}")
            return False
    
    def _create_mini_app_button(self, path: str = "", text: str = "Открыть приложение") -> dict:
        """Создать inline-кнопку для открытия Mini App."""
        url = f"{self.mini_app_url}{path}"
        return {
            "inline_keyboard": [[
                {
                    "text": text,
                    "web_app": {"url": url}
                }
            ]]
        }
    
    async def notify_new_booking(
        self,
        chat_id: str,
        client_name: str,
        service: str,
        master: str,
        date: str,
        time: str,
        price: int,
        booking_id: str = None
    ) -> bool:
        """
        Уведомление о новой записи.
        
        Пример:
            💅 Новая запись!
            
            Клиент: Айгуль
            Услуга: Маникюр
            Мастер: Диана
            Дата: 25.04.2026
            Время: 15:00
            Сумма: 1,200 сом
            
            [Открыть для подтверждения]
        """
        emoji = "💅" if "маникюр" in service.lower() or "ногт" in service.lower() else \
                "💇" if "стриж" in service.lower() or "окраш" in service.lower() else \
                "💆" if "массаж" in service.lower() else \
                "💄" if "макияж" in service.lower() else "✨"
        
        text = (
            f"<b>{emoji} Новая запись!</b>\n\n"
            f"<b>Клиент:</b> {client_name}\n"
            f"<b>Услуга:</b> {service}\n"
            f"<b>Мастер:</b> {master}\n"
            f"<b>Дата:</b> {date}\n"
            f"<b>Время:</b> {time}\n"
            f"<b>Сумма:</b> {price:,} сом"
        )
        
        # Добавляем ID записи если есть
        if booking_id:
            text += f"\n\n<code>ID: {booking_id}</code>"
        
        # Кнопка для быстрого доступа к панели менеджера
        reply_markup = self._create_mini_app_button(
            path="/manager",
            text="📋 Подтвердить запись"
        )
        
        return await self.send_message(chat_id, text, reply_markup)
    
    async def notify_booking_cancelled(
        self,
        chat_id: str,
        client_name: str,
        service: str,
        master: str,
        date: str,
        time: str,
        reason: str = None
    ) -> bool:
        """Уведомление об отмене записи."""
        
        text = (
            f"<b>❌ Отмена записи</b>\n\n"
            f"<b>Клиент:</b> {client_name}\n"
            f"<b>Услуга:</b> {service}\n"
            f"<b>Мастер:</b> {master}\n"
            f"<b>Было на:</b> {date} {time}"
        )
        
        if reason:
            text += f"\n<b>Причина:</b> {reason}"
        
        text += f"\n\n⚠️ Слот освободился!"
        
        reply_markup = self._create_mini_app_button(
            path="/manager",
            text="📋 Открыть панель"
        )
        
        return await self.send_message(chat_id, text, reply_markup)
    
    async def notify_low_inventory(
        self,
        chat_id: str,
        item_name: str,
        current_stock: int,
        min_stock: int,
        unit: str = "шт"
    ) -> bool:
        """Уведомление о заканчивающемся товаре."""
        
        text = (
            f"<b>⚠️ Заканчивается товар!</b>\n\n"
            f"<b>{item_name}</b>\n"
            f"Остаток: {current_stock} {unit}\n"
            f"Минимум: {min_stock} {unit}\n\n"
            f"🔴 Требуется закупка!"
        )
        
        reply_markup = self._create_mini_app_button(
            path="/inventory",
            text="📦 Открыть склад"
        )
        
        return await self.send_message(chat_id, text, reply_markup)
    
    async def notify_daily_summary(
        self,
        chat_id: str,
        date: str,
        total_bookings: int,
        completed: int,
        cancelled: int,
        revenue: int,
        expenses: int = 0
    ) -> bool:
        """Ежедневная сводка."""
        
        profit = revenue - expenses
        
        text = (
            f"<b>📊 Сводка за {date}</b>\n\n"
            f"📅 Всего записей: {total_bookings}\n"
            f"✅ Выполнено: {completed}\n"
            f"❌ Отмен: {cancelled}\n\n"
            f"💰 Выручка: {revenue:,} сом\n"
        )
        
        if expenses > 0:
            text += f"📉 Расходы: {expenses:,} сом\n"
            text += f"📈 Прибыль: <b>{profit:,} сом</b>"
        
        reply_markup = self._create_mini_app_button(
            path="/financial-dashboard",
            text="💰 Открыть финансы"
        )
        
        return await self.send_message(chat_id, text, reply_markup)
    
    async def notify_new_review(
        self,
        chat_id: str,
        client_name: str,
        rating: int,
        comment: str,
        master: str = None
    ) -> bool:
        """Уведомление о новом отзыве."""
        
        stars = "⭐" * rating + "☆" * (5 - rating)
        
        text = (
            f"<b>⭐ Новый отзыв!</b>\n\n"
            f"{stars}\n\n"
            f"<b>Клиент:</b> {client_name}\n"
        )
        
        if master:
            text += f"<b>Мастер:</b> {master}\n"
        
        text += f"\n<i>{comment[:200]}</i>"  # Обрезаем длинные отзывы
        
        if len(comment) > 200:
            text += "..."
        
        reply_markup = self._create_mini_app_button(
            path="/clients",
            text="👥 Открыть клиенты"
        )
        
        return await self.send_message(chat_id, text, reply_markup)


# Глобальный экземпляр
notifier = TelegramNotifier()


# Удобные функции для использования в API

async def notify_admin_new_booking(
    client_name: str,
    service: str,
    master: str,
    date: str,
    time: str,
    price: int,
    booking_id: str = None
):
    """Отправить уведомление админу о новой записи."""
    if ADMIN_CHAT_ID:
        return await notifier.notify_new_booking(
            chat_id=ADMIN_CHAT_ID,
            client_name=client_name,
            service=service,
            master=master,
            date=date,
            time=time,
            price=price,
            booking_id=booking_id
        )
    return False


async def notify_admin_booking_cancelled(
    client_name: str,
    service: str,
    master: str,
    date: str,
    time: str,
    reason: str = None
):
    """Отправить уведомление об отмене."""
    if ADMIN_CHAT_ID:
        return await notifier.notify_booking_cancelled(
            chat_id=ADMIN_CHAT_ID,
            client_name=client_name,
            service=service,
            master=master,
            date=date,
            time=time,
            reason=reason
        )
    return False


async def notify_admin_low_inventory(
    item_name: str,
    current_stock: int,
    min_stock: int,
    unit: str = "шт"
):
    """Отправить уведомление о заканчивающемся товаре."""
    if ADMIN_CHAT_ID:
        return await notifier.notify_low_inventory(
            chat_id=ADMIN_CHAT_ID,
            item_name=item_name,
            current_stock=current_stock,
            min_stock=min_stock,
            unit=unit
        )
    return False
