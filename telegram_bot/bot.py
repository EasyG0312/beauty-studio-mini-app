"""
Telegram Bot - оболочка для Mini App
=====================================
Этот бот служит точкой входа для Telegram Mini App.
Основной функционал перенесён в Mini App (frontend + backend).

Установка:
    pip install pyTelegramBotAPI

Запуск:
    python bot.py
"""

import os
import logging
import telebot
from telebot import types
from dotenv import load_dotenv

# Загрузка .env
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "")
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",")]
OWNER_IDS = [int(x) for x in os.getenv("OWNER_IDS", "").split(",")]

BUSINESS_NAME = "Beauty Studio Bishkek"
PHONE = "+996 707 001112"
ADDRESS = "г. Бишкек, ул. Ахунбаева, 1"
WORKING_HOURS = "Пн-Сб: 09:00 - 20:00"

# URL Mini App (замените на ваш после деплоя)
MINI_APP_URL = os.getenv("MINI_APP_URL", "http://localhost:5173")

bot = telebot.TeleBot(BOT_TOKEN)


def get_role_keyboard(chat_id: int) -> types.ReplyKeyboardMarkup:
    """Возвращает клавиатуру в зависимости от роли пользователя."""
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    
    # Клиентская клавиатура
    markup.add("📅 Записаться")
    markup.add("📋 Мои записи")
    markup.add("💇 Услуги и цены")
    markup.add("ℹ️ Контакты")
    
    # Для менеджеров и владельцев
    if chat_id in ADMIN_IDS or chat_id in OWNER_IDS:
        markup.add("👨‍💼 Панель менеджера")
    
    # Только для владельцев
    if chat_id in OWNER_IDS:
        markup.add("📊 Аналитика")
    
    return markup


@bot.message_handler(commands=["start"])
def cmd_start(message):
    """Обработчик команды /start."""
    role = "РЕЖИМ МЕНЕДЖЕРА\n\n" if message.chat.id in ADMIN_IDS else ""
    
    text = (
        f"Привет, {message.from_user.first_name}!\n\n"
        f"{role}"
        f"Добро пожаловать в {BUSINESS_NAME}!\n\n"
        f"🕒 {WORKING_HOURS}\n"
        f"📍 {ADDRESS}\n\n"
        f"Нажмите кнопку ниже чтобы записаться или используйте наше новое Mini App!"
    )
    
    # Кнопка для открытия Mini App
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="🚀 Открыть Mini App",
        web_app=types.WebAppInfo(url=MINI_APP_URL)
    ))
    
    bot.send_message(
        message.chat.id,
        text,
        reply_markup=get_role_keyboard(message.chat.id)
    )


@bot.message_handler(commands=["app"])
def cmd_app(message):
    """Открыть Mini App."""
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="Открыть приложение",
        web_app=types.WebAppInfo(url=MINI_APP_URL)
    ))
    
    bot.send_message(
        message.chat.id,
        "Нажмите кнопку чтобы открыть приложение:",
        reply_markup=markup
    )


@bot.message_handler(commands=["help"])
def cmd_help(message):
    """Справка по боту."""
    text = (
        "📖 Справка\n\n"
        "Команды:\n"
        "/start - Главное меню\n"
        "/app - Открыть Mini App\n"
        "/help - Эта справка\n\n"
        "Кнопки меню:\n"
        "📅 Записаться - Новая запись\n"
        "📋 Мои записи - Просмотр записей\n"
        "💇 Услуги и цены - Прайс-лист\n"
        "ℹ️ Контакты - Информация\n\n"
        f"Телефон: {PHONE}\n"
        f"Адрес: {ADDRESS}"
    )
    
    bot.send_message(message.chat.id, text)


@bot.message_handler(func=lambda m: m.text == "📅 Записаться")
def cmd_book_button(message):
    """Кнопка Записаться - открывает Mini App."""
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="Записаться через Mini App",
        web_app=types.WebAppInfo(url=MINI_APP_URL)
    ))
    
    bot.send_message(
        message.chat.id,
        "Для записи откройте приложение:",
        reply_markup=markup
    )


@bot.message_handler(func=lambda m: m.text == "📋 Мои записи")
def cmd_my_bookings_button(message):
    """Кнопка Мои записи - открывает Mini App."""
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="Открыть мои записи",
        web_app=types.WebAppInfo(url=f"{MINI_APP_URL}/my-bookings")
    ))
    
    bot.send_message(
        message.chat.id,
        "Ваши записи доступны в приложении:",
        reply_markup=markup
    )


@bot.message_handler(func=lambda m: m.text == "💇 Услуги и цены")
def cmd_services_button(message):
    """Кнопка Услуги и цены."""
    services = {
        "Стрижка": "от 1200 сом",
        "Маникюр": "от 900 сом",
        "Массаж лица": "от 1500 сом",
        "Макияж": "от 1800 сом",
        "Окрашивание": "от 2500 сом",
    }
    
    text = "Наши услуги:\n\n"
    for service, price in services.items():
        text += f"{service} - {price}\n"
    
    text += f"\n📍 {ADDRESS}\n📞 {PHONE}"
    
    bot.send_message(message.chat.id, text)


@bot.message_handler(func=lambda m: m.text == "ℹ️ Контакты")
def cmd_contacts_button(message):
    """Кнопка Контакты."""
    text = (
        f"{BUSINESS_NAME}\n\n"
        f"📍 Адрес: {ADDRESS}\n"
        f"📞 Телефон: {PHONE}\n"
        f"🕒 Режим работы: {WORKING_HOURS}\n\n"
        f"Портфолио: /portfolio"
    )
    
    bot.send_message(message.chat.id, text)


@bot.message_handler(func=lambda m: m.text == "👨‍💼 Панель менеджера")
def cmd_manager_panel_button(message):
    """Кнопка Панель менеджера."""
    if message.chat.id not in ADMIN_IDS and message.chat.id not in OWNER_IDS:
        bot.send_message(message.chat.id, "Доступ запрещён.")
        return
    
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="Открыть панель менеджера",
        web_app=types.WebAppInfo(url=f"{MINI_APP_URL}/manager")
    ))
    
    bot.send_message(
        message.chat.id,
        "Панель менеджера:",
        reply_markup=markup
    )


@bot.message_handler(func=lambda m: m.text == "📊 Аналитика")
def cmd_analytics_button(message):
    """Кнопка Аналитика."""
    if message.chat.id not in OWNER_IDS:
        bot.send_message(message.chat.id, "Доступ запрещён.")
        return
    
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        text="Открыть аналитику",
        web_app=types.WebAppInfo(url=f"{MINI_APP_URL}/owner")
    ))
    
    bot.send_message(
        message.chat.id,
        "Аналитика для владельца:",
        reply_markup=markup
    )


@bot.message_handler(commands=["portfolio"])
def cmd_portfolio(message):
    """Портфолио работ."""
    # TODO: Загрузка фото из БД
    bot.send_message(
        message.chat.id,
        "📸 Портфолио работ в разработке.\n"
        "Следите за обновлениями!"
    )


@bot.message_handler()
def echo(message):
    """Обработчик неизвестных команд."""
    bot.send_message(
        message.chat.id,
        f"Неизвестная команда: {message.text}\n\n"
        "Используйте /help для справки."
    )


if __name__ == "__main__":
    logger.info(f"Запуск бота '{BUSINESS_NAME}'...")
    logger.info(f"Mini App URL: {MINI_APP_URL}")
    
    # Настройка Menu Button через API бота
    try:
        bot.set_chat_menu_button(
            menu_button=types.MenuButtonWebApp(
                text="🚀 Записаться",
                web_app=types.WebAppInfo(url=MINI_APP_URL)
            )
        )
        logger.info("Menu Button настроен")
    except Exception as e:
        logger.error(f"Ошибка настройки Menu Button: {e}")
    
    bot.infinity_polling()
