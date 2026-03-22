"""
=============================================================
  TELEGRAM BOT v13.0 - Beauty Studio Bishkek
=============================================================
  УСТАНОВКА:  pip install pyTelegramBotAPI schedule python-dotenv
  ЗАПУСК:     python telegram_bot_v12.py

  ЧТО НОВОГО В v13.0 (Уровень 1 + 2):

  УРОВЕНЬ 1 - КЛИЕНТ:
  ✅ Кнопка "Я выезжаю" — мастер получает уведомление
  ✅ Фото мастера показывается ПРИ выборе (уже было)
  ✅ Напоминание за 3 дня ( push)

  УРОВЕНЬ 1 - МЕНЕДЖЕР:
  ✅ Дашборд "Кто сегодня" — все записи за 1 экран
  ✅ Bulk-подтверждение — кнопка "Подтвердить все"
  ✅ Заметки на клиента (аллергии, предпочтения)

  УРОВЕНЬ 1 - ВЛАДЕЛЕЦ:
  ✅ RFM-аналитика — сегментация клиентов
  ✅ Email-отчёты — настройка в .env
  ✅ KPI мастеров — выручка, конверсия, рейтинг

  УРОВЕНЬ 2 - КЛИЕНТ:
  ✅ Чат с менеджером — двусторонняя связь
  ✅ Напоминание за 3 дня

  УРОВЕНЬ 2 - МЕНЕДЖЕР:
  ✅ Шаблоны ответов (6 готовых)
  ✅ Причины отмены (dropdown)

  УРОВЕНЬ 2 - ВЛАДЕЛЕЦ:
  ✅ Прогноз выручки на 7/30 дней
  ✅ Подробные KPI мастеров

  ЧТО БЫЛО В v12.0:
  - Исправлены баги с дублирующимися сообщениями
  - Фото мастеров из БД
  - Нумерация шагов
  - История визитов — 20 записей

  ЧТО БЫЛО В v6.0:
  - Кнопки владельца: Отзывы, Экспорт CSV
  - Расширенная аналитика: выручка 7/30/90д, конверсия, ТОП мастеров
  - Просмотр отзывов с фильтрами
  - CSV-экспорт

  ЧТО БЫЛО В v5.0:
  - Защита от дублей, валидация телефона
  - Отмена за 5+ часов
  - Напоминания за 1 день + 1 час
  - Лояльность (5 визитов = скидка)
  - Портфолио
=============================================================
"""

import os
import logging
from collections import defaultdict
import telebot
from telebot import types
import csv
import io
import sqlite3
import re
import threading
import time
import time as time_module
import schedule
from datetime import datetime, timedelta

# .env поддержка — pip install python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv не установлен; используются переменные окружения или значения ниже

# ============================================================
#  ЛОГИРОВАНИЕ
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("bot.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================
#  RATE LIMITING (защита от спама)
# ============================================================
_last_msg_time: defaultdict = defaultdict(float)  # uid(int) → last message time(float)
RATE_LIMIT_SEC = 0.8  # минимальный интервал между сообщениями (секунд)

def _is_rate_limited(uid: int) -> bool:
    """Возвращает True если пользователь шлёт сообщения слишком часто."""
    now = time.time()
    if now - _last_msg_time[uid] < RATE_LIMIT_SEC:
        return True
    _last_msg_time[uid] = now
    return False

# ============================================================
#  НАСТРОЙКИ
# ============================================================
# РЕКОМЕНДАЦИЯ: задайте эти значения в файле .env (см. .env.example)
BOT_TOKEN     = os.getenv("BOT_TOKEN",     "8699202257:AAHRGrMOSA7JczE7Jb0F_2vOFRvXV2BQoIM")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "338067005")
ADMIN_IDS     = os.getenv("ADMIN_IDS",     "338067005").split(",")
OWNER_IDS     = os.getenv("OWNER_IDS",     "338067005").split(",")

BUSINESS_NAME    = "Beauty Studio Bishkek"
PHONE            = "+996 707 001112"
ADDRESS          = "г. Бишкек, ул. Ахунбаева, 1"
WORKING_HOURS    = "Пн-Сб: 09:00 - 20:00"
DB_FILE          = "salon.db"
REPEAT_SALE_DAYS = 45
CANCEL_HOURS     = 5        # нельзя отменить менее чем за N часов
LOYALTY_VISITS   = 5        # визитов для получения скидки постоянного клиента
LOYALTY_DISCOUNT = 10       # скидка % для постоянных клиентов

EMAIL_SMTP_HOST = os.getenv("EMAIL_SMTP_HOST", "")
EMAIL_SMTP_PORT = int(os.getenv("EMAIL_SMTP_PORT", "587"))
EMAIL_USER      = os.getenv("EMAIL_USER", "")
EMAIL_PASS      = os.getenv("EMAIL_PASS", "")
EMAIL_TO        = os.getenv("EMAIL_TO", "")

RESPONSE_TEMPLATES = {
    "welcome": "Здравствуйте! Рады видеть вас в {}. Запишитесь на удобное время!",
    "confirm": "Ваша запись подтверждена: {} {} у мастера {}. Ждём вас!",
    "remind": "Напоминаем о визите завтра в {} к мастеру {}.",
    "cancel": "Ваша запись отменена. Если передумаете — запишитесь снова!",
    "review": "Спасибо за визит! Оставьте отзыв — это поможет нам стать лучше!",
    "loyalty": "Поздравляем! Вы стали постоянным клиентом! Скидка {}% на все услуги!",
}

CANCEL_REASONS = [
    "Передумал",
    "Неудобное время",
    "Нашёл другого мастера",
    "Болезнь",
    "Другое",
]

# Фото работ: file_id из Telegram или URL
# Загрузи фото боту командой /addphoto, или вставь file_id вручную
PORTFOLIO_PHOTOS = []       # пример: ["AgACAgI...", "AgACAgJ..."]

ALL_SLOTS = [
    "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
]
DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

MASTERS = {
    "1": "Айгуль",
    "2": "Диана",
    "3": "Любой мастер",
    "4": "Айгерим",
    "5": "Эльвира",
}

# Профили мастеров — показываются клиенту при выборе
# photo_id: file_id фото из Telegram (загружается через /setmasterphoto)
# spec: специализация (короткая строка)
# Рейтинг берётся из БД автоматически
MASTER_PROFILES = {
    "Айгуль":  {"spec": "Стрижки, окрашивание",  "photo_id": ""},
    "Диана":   {"spec": "Маникюр, педикюр",       "photo_id": ""},
    "Айгерим": {"spec": "Макияж, брови",           "photo_id": ""},
    "Эльвира": {"spec": "Массаж лица, уход",       "photo_id": ""},
}

# Максимальное число no_show после которого клиент автоматически предупреждается
BLACKLIST_THRESHOLD = 3  # предупреждение менеджеру

SERVICES = {
    "Стрижка":      "от 1000 сом",
    "Маникюр":      "от 800 сом",
    "Массаж лица":  "от 1200 сом",
    "Макияж":       "от 1500 сом",
    "Окрашивание":  "от 2000 сом",
}

# Средние цены для расчёта выручки (сом)
SERVICES_PRICES = {
    "Стрижка":     1200,
    "Маникюр":     900,
    "Массаж лица": 1500,
    "Макияж":      1800,
    "Окрашивание": 2500,
}

# График работы мастеров (0=Пн … 5=Сб, 6=Вс)
MASTER_SCHEDULE = {
    "Айгуль":       [0, 1, 2, 3, 4],    # Пн–Пт
    "Диана":        [1, 2, 3, 4, 5],    # Вт–Сб
    "Айгерим":      [0, 2, 4, 5],       # Пн, Ср, Пт, Сб
    "Эльвира":      [0, 1, 2, 3, 4, 5], # Пн–Сб
    "Любой мастер": [0, 1, 2, 3, 4, 5], # Пн–Сб
}

DIGEST_HOUR = 20  # час отправки суточного дайджеста владельцу (0–23)

FAQ = {
    "Принимаете карты?":   "Да — Visa, MasterCard, Элкарт.",
    "Есть парковка?":      "Нет, парковка отсутствует.",
    "Нужна запись?":       "Рекомендуем записываться заранее.",
    "Есть скидки?":        "При первом визите скидка 10%. После {} визитов — постоянная скидка {}%!".format(LOYALTY_VISITS, LOYALTY_DISCOUNT),
}
# ============================================================

bot = telebot.TeleBot(BOT_TOKEN)
user_state       = {}               # chat_id → dict состояния диалога
_user_state_lock = threading.RLock()  # защита от гонок при конкурентном доступе
_digest_sent_date = ""              # дата последнего отправленного дайджеста


# ============================================================
#  БАЗА ДАННЫХ
# ============================================================
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS bookings (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT,
        phone           TEXT,
        service         TEXT,
        master          TEXT,
        date            TEXT,
        time            TEXT,
        comment         TEXT DEFAULT '',
        chat_id         INTEGER,
        status          TEXT DEFAULT 'pending',
        actual_amount   INTEGER DEFAULT 0,
        is_reschedule   INTEGER DEFAULT 0,
        old_bid         INTEGER DEFAULT 0,
        reminded_1d     INTEGER DEFAULT 0,
        reminded_3d     INTEGER DEFAULT 0,
        reminded_1h     INTEGER DEFAULT 0,
        review_sent     INTEGER DEFAULT 0,
        no_show_checked INTEGER DEFAULT 0,
        repeat_notified INTEGER DEFAULT 0,
        is_on_the_way   INTEGER DEFAULT 0,
        cancel_reason   TEXT DEFAULT '',
        created_at      TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS blocked_slots (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        date   TEXT,
        time   TEXT,
        master TEXT DEFAULT 'all',
        UNIQUE(date, time, master)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS reviews (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        chat_id    INTEGER,
        rating     INTEGER,
        comment    TEXT,
        created_at TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS clients (
        chat_id      INTEGER PRIMARY KEY,
        name         TEXT,
        phone        TEXT,
        first_visit  TEXT,
        last_visit   TEXT,
        visit_count  INTEGER DEFAULT 0,
        is_loyal     INTEGER DEFAULT 0,
        notes        TEXT DEFAULT '',
        rfm_segment  TEXT DEFAULT '',
        rfm_score    INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS portfolio (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id  TEXT UNIQUE,
        added_at TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS master_photos (
        master   TEXT PRIMARY KEY,
        file_id  TEXT NOT NULL,
        added_at TEXT NOT NULL
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS waitlist (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id    INTEGER NOT NULL,
        name       TEXT    NOT NULL,
        phone      TEXT    NOT NULL,
        date       TEXT    NOT NULL,
        time       TEXT    NOT NULL,
        master     TEXT    NOT NULL DEFAULT 'all',
        service    TEXT    NOT NULL DEFAULT '',
        created_at TEXT    NOT NULL,
        UNIQUE(chat_id, date, time, master)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS blacklist (
        chat_id    INTEGER PRIMARY KEY,
        name       TEXT,
        phone      TEXT,
        reason     TEXT    DEFAULT '',
        no_show_count INTEGER DEFAULT 0,
        added_at   TEXT    NOT NULL,
        added_by   INTEGER
    )""")
    # Индексы — ускоряют частые запросы
    c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_chat_id  ON bookings(chat_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_date     ON bookings(date)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_bookings_date_st  ON bookings(date, status)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_clients_loyal     ON clients(is_loyal)")
    conn.commit()
    conn.close()


# ============================================================
#  МИГРАЦИИ СХЕМЫ БД
# ============================================================
DB_VERSION = 7

def migrate_db():
    with db() as conn:
        current = conn.execute("PRAGMA user_version").fetchone()[0]
        if current >= DB_VERSION:
            return
        logger.info("Миграция БД: %d → %d", current, DB_VERSION)
        
        # v5 -> v6: новые поля клиентов
        if current < 6:
            try:
                conn.execute("ALTER TABLE clients ADD COLUMN notes TEXT DEFAULT ''")
            except:
                pass
            try:
                conn.execute("ALTER TABLE clients ADD COLUMN rfm_segment TEXT DEFAULT ''")
            except:
                pass
            try:
                conn.execute("ALTER TABLE clients ADD COLUMN rfm_score INTEGER DEFAULT 0")
            except:
                pass
        
        # v6 -> v7: новые поля записей
        if current < 7:
            try:
                conn.execute("ALTER TABLE bookings ADD COLUMN reminded_3d INTEGER DEFAULT 0")
            except:
                pass
            try:
                conn.execute("ALTER TABLE bookings ADD COLUMN is_on_the_way INTEGER DEFAULT 0")
            except:
                pass
            try:
                conn.execute("ALTER TABLE bookings ADD COLUMN cancel_reason TEXT DEFAULT ''")
            except:
                pass
        
        conn.execute(f"PRAGMA user_version = {DB_VERSION}")
        conn.commit()
    logger.info("Миграция БД завершена (версия %d)", DB_VERSION)

def db():
    return sqlite3.connect(DB_FILE)

def get_booking(bid):
    with db() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone()
        return dict(row) if row else None

def save_booking(name, phone, service, master, date, slot, chat_id,
                 comment="", is_reschedule=0, old_bid=0):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")  # ISO-формат для корректного SQL-сравнения
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO bookings"
            " (name,phone,service,master,date,time,comment,chat_id,"
            "  status,is_reschedule,old_bid,created_at)"
            " VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?)",
            (name, phone, service, master, date, slot, comment,
             chat_id, is_reschedule, old_bid, now))
        conn.commit()
        bid = cur.lastrowid
    # chat_id=0 означает запись по звонку — клиентский профиль не создаём
    if chat_id and chat_id != 0:
        upsert_client(chat_id, name, phone)
    return bid

def update_status(bid, status):
    with db() as conn:
        conn.execute("UPDATE bookings SET status=? WHERE id=?", (status, bid))
        conn.commit()

def complete_booking(bid, actual_amount=0):
    """Закрывает визит со статусом completed и фактической суммой.
    Увеличивает visit_count клиента — только реальные завершённые визиты."""
    with db() as conn:
        conn.execute(
            "UPDATE bookings SET status='completed', actual_amount=? WHERE id=?",
            (actual_amount, bid))
        conn.commit()
    # Увеличиваем счётчик у клиента (только для реальных Telegram-пользователей)
    b = get_booking(bid)
    if b and b.get("chat_id") and b["chat_id"] != 0:
        cid = b["chat_id"]
        with db() as conn:
            row = conn.execute(
                "SELECT visit_count, is_loyal FROM clients WHERE chat_id=?",
                (cid,)).fetchone()
            if row:
                new_count = row[0] + 1
                is_loyal  = 1 if new_count >= LOYALTY_VISITS else row[1]
                conn.execute(
                    "UPDATE clients SET visit_count=?, is_loyal=? WHERE chat_id=?",
                    (new_count, is_loyal, cid))
                conn.commit()
    logger.info("Визит #%d завершён, сумма: %d сом", bid, actual_amount)

def no_show_booking(bid):
    """Отмечает клиента как не явившегося и уведомляет лист ожидания."""
    with db() as conn:
        conn.execute(
            "UPDATE bookings SET status='no_show', no_show_checked=1 WHERE id=?",
            (bid,))
        conn.commit()
    logger.info("Запись #%d — клиент не явился", bid)
    # Уведомляем лист ожидания в отдельном потоке
    b = get_booking(bid)
    if b:
        threading.Thread(
            target=notify_waitlist,
            args=(b["date"], b["time"], b["master"]),
            daemon=True).start()
        # Авто-счётчик no_show — только для реальных клиентов (не записи по звонку)
        if b.get("chat_id") and b["chat_id"] != 0:
            count = get_client_no_show_count(b["chat_id"])
            if count >= BLACKLIST_THRESHOLD:
                try:
                    bot.send_message(int(ADMIN_CHAT_ID),
                        "ВНИМАНИЕ: {} ({}) не явился уже {} раз.\n"
                        "Рассмотрите добавление в чёрный список: /blacklist".format(
                            b["name"], b["phone"], count))
                except Exception as e:
                    logger.error("Blacklist alert: %s", e)

def get_active_bookings(date=None):
    with db() as conn:
        conn.row_factory = sqlite3.Row
        if date:
            rows = conn.execute(
                "SELECT * FROM bookings WHERE date=? AND status IN ('confirmed','pending') ORDER BY time",
                (date,)).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM bookings WHERE status IN ('confirmed','pending') ORDER BY date,time"
            ).fetchall()
        return [dict(r) for r in rows]

def get_client_bookings(chat_id, status_filter=None):
    with db() as conn:
        conn.row_factory = sqlite3.Row
        if status_filter:
            rows = conn.execute(
                "SELECT * FROM bookings WHERE chat_id=? AND status=? ORDER BY date,time",
                (chat_id, status_filter)).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM bookings WHERE chat_id=? AND status IN ('confirmed','pending') ORDER BY date,time",
                (chat_id,)).fetchall()
        return [dict(r) for r in rows]

def client_has_booking_on_date(chat_id, date):
    with db() as conn:
        row = conn.execute(
            "SELECT id FROM bookings WHERE chat_id=? AND date=? AND status IN ('confirmed','pending')",
            (chat_id, date)).fetchone()
        return row is not None

def is_slot_taken(date, slot, master="all"):
    with db() as conn:
        blocked = conn.execute(
            "SELECT id FROM blocked_slots WHERE date=? AND (time=? OR time='ALL') AND (master=? OR master='all')",
            (date, slot, master)).fetchone()
        if blocked:
            return True
        if master in ("all", "Любой мастер"):
            booked = conn.execute(
                "SELECT id FROM bookings WHERE date=? AND time=? AND status IN ('confirmed','pending')",
                (date, slot)).fetchone()
        else:
            booked = conn.execute(
                "SELECT id FROM bookings WHERE date=? AND time=? AND master=? AND status IN ('confirmed','pending')",
                (date, slot, master)).fetchone()
        return booked is not None

def free_slots(date, master="all"):
    """Свободные слоты с учётом графика мастера."""
    if master not in ("all", "Любой мастер") and master in MASTER_SCHEDULE:
        try:
            dt = datetime.strptime(date, "%d.%m.%Y")
            if dt.weekday() not in MASTER_SCHEDULE[master]:
                return []  # мастер не работает в этот день
        except Exception:
            pass
    return [s for s in ALL_SLOTS if not is_slot_taken(date, s, master)]

def block_slot(date, slot, master="all"):
    with db() as conn:
        conn.execute("INSERT OR IGNORE INTO blocked_slots (date,time,master) VALUES (?,?,?)",
                     (date, slot, master))
        conn.commit()

def block_day(date, master="all"):
    for s in ALL_SLOTS:
        block_slot(date, s, master)

def unblock_slot(date, slot, master="all"):
    with db() as conn:
        conn.execute("DELETE FROM blocked_slots WHERE date=? AND time=? AND master=?",
                     (date, slot, master))
        conn.commit()

def unblock_day(date, master="all"):
    with db() as conn:
        conn.execute("DELETE FROM blocked_slots WHERE date=? AND master=?", (date, master))
        conn.commit()

def save_review(bid, chat_id, rating, comment=""):
    with db() as conn:
        conn.execute(
            "INSERT INTO reviews (booking_id,chat_id,rating,comment,created_at) VALUES (?,?,?,?,?)",
            (bid, chat_id, rating, comment, datetime.now().strftime("%d.%m.%Y %H:%M")))
        conn.execute("UPDATE bookings SET review_sent=1 WHERE id=?", (bid,))
        conn.commit()

def upsert_client(chat_id, name, phone):
    """Создаёт или обновляет профиль клиента.
    visit_count НЕ увеличивается здесь — только при complete_booking()."""
    now = datetime.now().strftime("%d.%m.%Y")
    with db() as conn:
        ex = conn.execute(
            "SELECT chat_id FROM clients WHERE chat_id=?", (chat_id,)).fetchone()
        if ex:
            conn.execute(
                "UPDATE clients SET name=?, phone=?, last_visit=? WHERE chat_id=?",
                (name, phone, now, chat_id))
        else:
            conn.execute(
                "INSERT INTO clients"
                " (chat_id,name,phone,first_visit,last_visit,visit_count,is_loyal)"
                " VALUES (?,?,?,?,?,0,0)",
                (chat_id, name, phone, now, now))
        conn.commit()

def get_client(chat_id):
    with db() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM clients WHERE chat_id=?", (chat_id,)).fetchone()
        return dict(row) if row else None

def get_all_clients():
    with db() as conn:
        conn.row_factory = sqlite3.Row
        return [dict(r) for r in conn.execute("SELECT * FROM clients").fetchall()]

def save_portfolio_photo(file_id):
    """Сохраняет file_id фото в БД (не теряется при перезапуске)."""
    with db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO portfolio (file_id, added_at) VALUES (?,?)",
            (file_id, datetime.now().strftime("%d.%m.%Y %H:%M")))
        conn.commit()

def get_portfolio_photos():
    with db() as conn:
        rows = conn.execute("SELECT file_id FROM portfolio ORDER BY id").fetchall()
        return [r[0] for r in rows]

def save_master_photo(master: str, file_id: str) -> None:
    """Сохраняет фото мастера в БД — не теряется при рестарте."""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO master_photos (master, file_id, added_at) VALUES (?,?,?)",
            (master, file_id, now))
        conn.commit()

def load_master_photos() -> None:
    """Загружает photo_id из БД в MASTER_PROFILES при старте бота."""
    with db() as conn:
        rows = conn.execute("SELECT master, file_id FROM master_photos").fetchall()
    for master, file_id in rows:
        if master in MASTER_PROFILES:
            MASTER_PROFILES[master]["photo_id"] = file_id
    if rows:
        logger.info("Загружено фото мастеров из БД: %d", len(rows))


# ============================================================
#  ЛИСТ ОЖИДАНИЯ (WAITLIST)
# ============================================================
def add_to_waitlist(chat_id, name, phone, date, time, master, service=""):
    """Добавляет клиента в лист ожидания на конкретный слот."""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    with db() as conn:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO waitlist
                   (chat_id, name, phone, date, time, master, service, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (chat_id, name, phone, date, time, master, service, now))
            conn.commit()
            return True
        except Exception as e:
            logger.error("Waitlist add error: %s", e)
            return False

def get_waitlist_for_slot(date, time, master="all"):
    """Все ожидающие на конкретный слот."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM waitlist WHERE date=? AND time=? AND (master=? OR master='all')"
            " ORDER BY id",
            (date, time, master)).fetchall()
        return [dict(r) for r in rows]

def remove_from_waitlist(waitlist_id):
    with db() as conn:
        conn.execute("DELETE FROM waitlist WHERE id=?", (waitlist_id,))
        conn.commit()

def remove_client_from_waitlist(chat_id, date, time):
    with db() as conn:
        conn.execute(
            "DELETE FROM waitlist WHERE chat_id=? AND date=? AND time=?",
            (chat_id, date, time))
        conn.commit()

def notify_waitlist(date, time, master="all"):
    """
    При освобождении слота уведомляет первого в очереди.
    После уведомления удаляет запись из waitlist.
    Если клиент не ответил за 30 минут — слот предлагается следующему.
    """
    waiting = get_waitlist_for_slot(date, time, master)
    if not waiting:
        return
    first = waiting[0]
    try:
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton(
                "Записаться сейчас",
                callback_data="waitlist_book_{}_{}_{}".format(
                    date.replace(".", "_"),
                    time.replace(":", "_"),
                    master.replace(" ", "_"))),
            types.InlineKeyboardButton(
                "Отказаться",
                callback_data="waitlist_skip_{}_{}".format(
                    first["id"], date.replace(".", "_"))),
        )
        bot.send_message(
            first["chat_id"],
            "Место освободилось!\n\n"
            "{} {} — {}\n"
            "Мастер: {}\n\n"
            "Хотите записаться? У вас 30 минут.".format(
                date, time,
                first["service"] if first.get("service") else "услуга по вашему выбору",
                master),
            reply_markup=markup)
        # Удаляем из очереди сразу после уведомления.
        # Если клиент откажется — remove_from_waitlist уже ничего не сделает (запись удалена).
        # Если проигнорирует — через 30 минут слот снова свободен для следующего.
        remove_from_waitlist(first["id"])
        logger.info("Waitlist notify + removed: chat_id=%s slot=%s %s",
                    first["chat_id"], date, time)

        # Через 30 минут — если слот всё ещё свободен, предложить следующему в очереди
        def _delayed_retry():
            time_module.sleep(30 * 60)
            if not is_slot_taken(date, time):
                notify_waitlist(date, time, master)

        threading.Thread(target=_delayed_retry, daemon=True).start()

    except Exception as e:
        logger.error("Waitlist notify error: %s", e)


# ============================================================
#  ЧЁРНЫЙ СПИСОК
# ============================================================
def add_to_blacklist(chat_id, name, phone, reason="", no_show_count=0, added_by=0):
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    with db() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO blacklist
               (chat_id, name, phone, reason, no_show_count, added_at, added_by)
               VALUES (?,?,?,?,?,?,?)""",
            (chat_id, name, phone, reason, no_show_count, now, added_by))
        conn.commit()
    logger.info("Blacklist: добавлен chat_id=%s (%s)", chat_id, name)

def remove_from_blacklist(chat_id):
    with db() as conn:
        conn.execute("DELETE FROM blacklist WHERE chat_id=?", (chat_id,))
        conn.commit()

def is_blacklisted(chat_id) -> bool:
    with db() as conn:
        row = conn.execute(
            "SELECT chat_id FROM blacklist WHERE chat_id=?", (chat_id,)).fetchone()
        return row is not None

def get_blacklist():
    with db() as conn:
        conn.row_factory = sqlite3.Row
        return [dict(r) for r in conn.execute(
            "SELECT * FROM blacklist ORDER BY added_at DESC").fetchall()]

def get_client_no_show_count(chat_id) -> int:
    """Считает сколько раз клиент не явился."""
    with db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM bookings WHERE chat_id=? AND status='no_show'",
            (chat_id,)).fetchone()
        return row[0] if row else 0


# ============================================================
#  АНАЛИТИКА ВЛАДЕЛЬЦА: выручка, мастера, отзывы
# ============================================================
def get_revenue(period_days=30):
    """
    Выручка за период — только завершённые визиты (status='completed').
    Если фактическая сумма введена — берём её, иначе базовую цену из конфига.
    Фильтруем по дате ВИЗИТА (поле date), а не по дате создания записи.
    """
    cutoff = (datetime.now() - timedelta(days=period_days)).strftime("%d.%m.%Y")
    with db() as conn:
        rows = conn.execute(
            "SELECT service, actual_amount FROM bookings"
            " WHERE status='completed' AND date >= ?",
            (cutoff,)).fetchall()
    total = 0
    for service, actual in rows:
        if actual and actual > 0:
            total += actual
        else:
            total += SERVICES_PRICES.get(service, 0)
    return total

def get_master_stats():
    """Статистика по мастерам: реальные завершённые визиты + выручка + средняя оценка.
    Выручка: если actual_amount > 0 — берём его, иначе базовую цену из конфига."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        bookings = conn.execute(
            "SELECT master, COUNT(*) cnt, service, actual_amount"
            " FROM bookings WHERE status='completed'"
            " ORDER BY master").fetchall()
        ratings = conn.execute(
            "SELECT b.master, AVG(r.rating) avg_r FROM reviews r"
            " JOIN bookings b ON b.id = r.booking_id GROUP BY b.master").fetchall()
    rating_map = {r["master"]: r["avg_r"] for r in ratings}
    # Группируем и считаем выручку с учётом базовых цен
    master_data = {}
    for b in bookings:
        m = b["master"]
        if m not in master_data:
            master_data[m] = {"count": 0, "revenue": 0}
        master_data[m]["count"] += 1
        amount = b["actual_amount"] if b["actual_amount"] and b["actual_amount"] > 0 \
                 else SERVICES_PRICES.get(b["service"], 0)
        master_data[m]["revenue"] += amount
    return [
        {"master": m, "count": v["count"], "revenue": v["revenue"],
         "avg_r": rating_map.get(m)}
        for m, v in sorted(master_data.items(), key=lambda x: -x[1]["count"])
    ]

def get_all_reviews_filtered(min_rating=1, master=None, limit=20):
    """Отзывы с фильтрацией по оценке и мастеру."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        if master:
            rows = conn.execute(
                "SELECT r.*, b.name, b.service, b.master FROM reviews r"
                " JOIN bookings b ON b.id = r.booking_id"
                " WHERE r.rating >= ? AND b.master = ? ORDER BY r.id DESC LIMIT ?",
                (min_rating, master, limit)).fetchall()
        else:
            rows = conn.execute(
                "SELECT r.*, b.name, b.service, b.master FROM reviews r"
                " JOIN bookings b ON b.id = r.booking_id"
                " WHERE r.rating >= ? ORDER BY r.id DESC LIMIT ?",
                (min_rating, limit)).fetchall()
        return [dict(r) for r in rows]

def search_client(query):
    """Поиск по всем записям — включая отменённые, завершённые, no_show."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM bookings WHERE (name LIKE ? OR phone LIKE ?)"
            " ORDER BY date DESC LIMIT 20",
            ("%{}%".format(query), "%{}%".format(query))).fetchall()
        return [dict(r) for r in rows]

def get_stats():
    today_s  = datetime.now().strftime("%d.%m.%Y")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    with db() as conn:
        # Завершённые визиты (реальные деньги)
        total     = conn.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'").fetchone()[0]
        today_c   = conn.execute(
            "SELECT COUNT(*) FROM bookings WHERE date=? AND status='completed'",
            (today_s,)).fetchone()[0]
        week_c    = conn.execute(
            "SELECT COUNT(*) FROM bookings WHERE status='completed' AND created_at >= ?",
            (week_ago,)).fetchone()[0]
        # Статистика по всем статусам
        confirmed = conn.execute("SELECT COUNT(*) FROM bookings WHERE status='confirmed'").fetchone()[0]
        cancel    = conn.execute("SELECT COUNT(*) FROM bookings WHERE status='cancelled'").fetchone()[0]
        no_show   = conn.execute("SELECT COUNT(*) FROM bookings WHERE status='no_show'").fetchone()[0]
        tops      = conn.execute(
            "SELECT service, COUNT(*) cnt FROM bookings WHERE status='completed'"
            " GROUP BY service ORDER BY cnt DESC LIMIT 3").fetchall()
        avg_r     = conn.execute("SELECT AVG(rating) FROM reviews").fetchone()[0]
        clients   = conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
        loyal     = conn.execute("SELECT COUNT(*) FROM clients WHERE is_loyal=1").fetchone()[0]
        return {
            "total": total, "today": today_c, "week": week_c,
            "confirmed": confirmed, "cancel": cancel, "no_show": no_show,
            "tops": tops, "avg_r": avg_r, "clients": clients, "loyal": loyal,
        }


# ============================================================
#  RFM АНАЛИТИКА (Уровень 1 - Владелец)
# ============================================================
def calculate_rfm():
    """RFM: Recency (давность), Frequency (частота), Monetary (деньги)."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT c.chat_id, c.name, c.phone, c.visit_count, c.last_visit,
                   COALESCE(SUM(b.actual_amount), 0) as total_spent,
                   (SELECT MAX(date) FROM bookings b2 WHERE b2.chat_id = c.chat_id AND b2.status = 'completed') as last_visit_date
            FROM clients c
            LEFT JOIN bookings b ON b.chat_id = c.chat_id AND b.status = 'completed'
            WHERE c.chat_id != 0
            GROUP BY c.chat_id
        """).fetchall()
    
    segments = {"at_risk": [], "churned": [], "loyal": [], "new": [], "vip": []}
    now = datetime.now()
    
    for r in rows:
        try:
            last = datetime.strptime(r["last_visit_date"], "%d.%m.%Y") if r["last_visit_date"] else None
            days_ago = (now - last).days if last else 999
            visits = r["visit_count"] or 0
            spent = r["total_spent"] or 0
            
            # Сегментация
            if days_ago > 90:
                segment = "churned"
            elif days_ago > 45:
                segment = "at_risk"
            elif visits >= 10 and spent >= 15000:
                segment = "vip"
            elif visits >= 5:
                segment = "loyal"
            else:
                segment = "new"
            
            segments[segment].append({
                "chat_id": r["chat_id"],
                "name": r["name"],
                "phone": r["phone"],
                "visits": visits,
                "spent": spent,
                "days_ago": days_ago,
            })
            
            # Сохраняем сегмент в БД
            conn.execute(
                "UPDATE clients SET rfm_segment=?, rfm_score=? WHERE chat_id=?",
                (segment, visits * 10 - days_ago, r["chat_id"]))
        except Exception:
            pass
    conn.commit()
    return segments

def get_rfm_report():
    """Отчёт по RFM для владельца."""
    segments = calculate_rfm()
    text = "RFM АНАЛИТИКА\n\n"
    
    seg_names = {
        "vip": "VIP клиенты (10+ визитов, 15000+ сом)",
        "loyal": "Постоянные (5-9 визитов)",
        "new": "Новые (до 5 визитов)",
        "at_risk": "Под угрозой ухода (45+ дней)",
        "churned": "Ушедшие (90+ дней)",
    }
    
    for seg, clients in segments.items():
        if clients:
            text += f"{seg_names.get(seg, seg)}: {len(clients)}\n"
            for c in clients[:3]:
                text += f"  • {c['name']} — {c['visits']} виз, {c['spent']} сом\n"
            if len(clients) > 3:
                text += f"  ... и ещё {len(clients)-3}\n"
            text += "\n"
    
    return text


# ============================================================
#  ЗАМЕТКИ НА КЛИЕНТА (Уровень 1 - Менеджер)
# ============================================================
def update_client_notes(chat_id, notes):
    with db() as conn:
        conn.execute("UPDATE clients SET notes=? WHERE chat_id=?", (notes, chat_id))
        conn.commit()

def get_client_notes(chat_id):
    with db() as conn:
        row = conn.execute("SELECT notes FROM clients WHERE chat_id=?", (chat_id,)).fetchone()
        return row[0] if row else ""


# ============================================================
#  KPI МАСТЕРОВ (Уровень 2 - Владелец)
# ============================================================
def get_master_kpi():
    """KPI мастеров: выручка, средний чек, конверсия, рейтинг."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        masters = {}
        
        # Все мастера
        for mname in MASTERS.values():
            if mname == "Любой мастер":
                continue
            masters[mname] = {"completed": 0, "cancelled": 0, "no_show": 0, 
                            "revenue": 0, "total_reviews": 0, "avg_rating": 0}
        
        # Завершённые
        rows = conn.execute("""
            SELECT master, COUNT(*) cnt, SUM(actual_amount) revenue
            FROM bookings WHERE status='completed' AND master != 'Любой мастер'
            GROUP BY master
        """).fetchall()
        for r in rows:
            if r["master"] in masters:
                masters[r["master"]]["completed"] = r["cnt"]
                masters[r["master"]]["revenue"] = r["revenue"] or 0
        
        # Отменённые
        rows = conn.execute("""
            SELECT master, COUNT(*) cnt FROM bookings 
            WHERE status='cancelled' AND master != 'Любой мастер'
            GROUP BY master
        """).fetchall()
        for r in rows:
            if r["master"] in masters:
                masters[r["master"]]["cancelled"] = r["cnt"]
        
        # No-show
        rows = conn.execute("""
            SELECT master, COUNT(*) cnt FROM bookings 
            WHERE status='no_show' AND master != 'Любой мастер'
            GROUP BY master
        """).fetchall()
        for r in rows:
            if r["master"] in masters:
                masters[r["master"]]["no_show"] = r["cnt"]
        
        # Рейтинг
        rows = conn.execute("""
            SELECT b.master, AVG(r.rating) avg_r, COUNT(*) cnt
            FROM reviews r JOIN bookings b ON b.id = r.booking_id
            WHERE b.master != 'Любой мастер'
            GROUP BY b.master
        """).fetchall()
        for r in rows:
            if r["master"] in masters:
                masters[r["master"]]["avg_rating"] = r["avg_r"]
                masters[r["master"]]["total_reviews"] = r["cnt"]
        
        return masters

def get_master_kpi_text():
    """Текстовый отчёт по KPI мастеров."""
    kpi = get_master_kpi()
    text = "KPI МАСТЕРОВ\n\n"
    
    for m, data in sorted(kpi.items(), key=lambda x: -x[1]["revenue"]):
        total = data["completed"] + data["cancelled"] + data["no_show"]
        conversion = (data["completed"] / total * 100) if total else 0
        avg_check = (data["revenue"] / data["completed"]) if data["completed"] else 0
        rating = "{:.1f}".format(data["avg_rating"]) if data["avg_rating"] else "нет"
        
        text += f"{m}:\n"
        text += f"  Выручка: {data['revenue']:,} сом\n"
        text += f"  Визитов: {data['completed']} | Средний чек: {avg_check:,.0f} сом\n"
        text += f"  Конверсия: {conversion:.0f}% | Рейтинг: {rating}★\n"
        text += f"  Отменено: {data['cancelled']} | Не явились: {data['no_show']}\n\n"
    
    return text


# ============================================================
#  ПРОГНОЗ ВЫРУЧКИ (Уровень 2 - Владелец)
# ============================================================
def predict_revenue(days_ahead=7):
    """Простой прогноз выручки на основе среднего за последние 4 недели."""
    with db() as conn:
        # Средняя выручка за последние 28 дней
        total = 0
        count = 0
        for i in range(28):
            date = (datetime.now() - timedelta(days=i)).strftime("%d.%m.%Y")
            row = conn.execute("""
                SELECT SUM(actual_amount) as sum FROM bookings 
                WHERE date=? AND status='completed'
            """, (date,)).fetchone()
            if row and row[0]:
                total += row[0]
                count += 1
        
        avg_daily = total / count if count else 0
        
        # Прогноз
        forecast = avg_daily * days_ahead
        return {
            "avg_daily": avg_daily,
            "forecast": forecast,
            "days_analyzed": count,
        }

def get_forecast_text():
    forecast = predict_revenue(7)
    forecast30 = predict_revenue(30)
    
    return f"""ПРОГНОЗ ВЫРУЧКИ

Средняя выручка в день: {forecast['avg_daily']:,.0f} сом
За 7 дней: ~{forecast['forecast']:,.0f} сом
За 30 дней: ~{forecast30['forecast']:,.0f} сом

На основе данных за {forecast['days_analyzed']} дней
"""


# ============================================================
#  EMAIL ОТЧЁТЫ (Уровень 1 - Владелец)
# ============================================================
def send_daily_email():
    """Отправка ежедневного отчёта на email."""
    if not EMAIL_SMTP_HOST or not EMAIL_USER or not EMAIL_TO:
        return False
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        s = get_stats()
        rev7 = get_revenue(7)
        rev30 = get_revenue(30)
        segments = calculate_rfm()
        
        body = f"""ОТЧЁТ {datetime.now().strftime('%d.%m.%Y')}

Визитов сегодня: {s['today']}
За неделю: {s['week']}
За месяц: {s['total']}

Выручка за 7 дней: {rev7:,} сом
Выручка за 30 дней: {rev30:,} сом

Клиентов: {s['clients']} | Постоянных: {s['loyal']}

Статусы:
- Подтверждено: {s['confirmed']}
- Отменено: {s['cancel']}
- Не явились: {s['no_show']}

RFM:
- VIP: {len(segments.get('vip', []))}
- Постоянные: {len(segments.get('loyal', []))}
- Под угрозой: {len(segments.get('at_risk', []))}
- Ушедшие: {len(segments.get('churned', []))}
"""
        
        msg = MIMEMultipart()
        msg["From"] = EMAIL_USER
        msg["To"] = EMAIL_TO
        msg["Subject"] = f"Отчёт {BUSINESS_NAME} - {datetime.now().strftime('%d.%m.%Y')}"
        msg.attach(MIMEText(body, "plain", "utf-8"))
        
        server = smtplib.SMTP(EMAIL_SMTP_HOST, EMAIL_SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
        server.quit()
        
        logger.info("Email отчёт отправлен")
        return True
    except Exception as e:
        logger.error("Email error: %s", e)
        return False


# ============================================================
#  HELPERS
# ============================================================
def is_admin(uid): return str(uid) in ADMIN_IDS
def is_owner(uid): return str(uid) in OWNER_IDS
def today_str():   return datetime.now().strftime("%d.%m.%Y")

def next_days(n=7):
    return [datetime.now() + timedelta(days=i) for i in range(n)]

def day_label(dt):
    t = datetime.now().date()
    if dt.date() == t:
        return "Сегодня " + dt.strftime("%d.%m")
    if dt.date() == t + timedelta(days=1):
        return "Завтра " + dt.strftime("%d.%m")
    return DAY_NAMES[dt.weekday()] + " " + dt.strftime("%d.%m")

def validate_phone(text):
    """Принимает: +996XXXXXXXXX, 996XXXXXXXXX, 0XXXXXXXXX (KG) и международные +X…"""
    cleaned = re.sub(r"[\s\-\(\)]", "", text)  # убираем пробелы, дефисы, скобки
    return bool(re.match(r"^(\+996\d{9}|996\d{9}|0\d{9}|\+\d{10,14})$", cleaned))

def can_cancel(date, time_slot):
    """Возвращает True если до визита больше CANCEL_HOURS часов"""
    try:
        visit_dt = datetime.strptime("{} {}".format(date, time_slot), "%d.%m.%Y %H:%M")
        return datetime.now() < visit_dt - timedelta(hours=CANCEL_HOURS)
    except Exception:
        return True

def kb(uid):
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    if is_admin(uid):
        m.add("Записаться", "Расписание", "Кто сегодня",
              "Закрыть время", "Открыть время",
              "Отменить запись", "Найти клиента",
              "Услуги и цены", "Контакты",
              "Запись по звонку", "Чёрный список",
              "Написать клиенту")
        if is_owner(uid):
            m.add("Аналитика", "Рассылка", "Отзывы", "Экспорт",
                  "KPI мастеров", "Прогноз", "RFM", "EMAIL отчёт")
    else:
        m.add("Записаться", "Услуги и цены",
              "Частые вопросы", "Контакты",
              "Мои записи", "Перенести запись",
              "Мой лист ожидания", "Я выезжаю",
              "Написать менеджеру")
    return m
def admin_markup(bid, is_resc=False):
    label = "Подтвердить перенос" if is_resc else "Подтвердить"
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton(label,       callback_data="confirm_{}".format(bid)),
        types.InlineKeyboardButton("Отклонить", callback_data="decline_{}".format(bid)))
    return markup

def loyalty_info(chat_id):
    """Возвращает строку о статусе лояльности"""
    client = get_client(chat_id)
    if not client:
        return ""
    visits = client.get("visit_count", 0)
    if client.get("is_loyal"):
        return "\n\nВы постоянный клиент! Скидка {}% на все услуги.".format(LOYALTY_DISCOUNT)
    remaining = LOYALTY_VISITS - visits
    if remaining > 0:
        return "\n\nДо скидки {}%: ещё {} визитов.".format(LOYALTY_DISCOUNT, remaining)
    return ""


# ============================================================
#  ФОНОВЫЙ ПОТОК: напоминания + отзывы + повторные продажи + лояльность
# ============================================================
def run_reminders():
    def _job_impl():
        now      = datetime.now()
        today    = now.strftime("%d.%m.%Y")
        tomorrow = (now + timedelta(days=1)).strftime("%d.%m.%Y")
        day3     = (now + timedelta(days=3)).strftime("%d.%m.%Y")
        h1_time  = (now + timedelta(hours=1)).strftime("%H:%M")

        # Оптимизированный запрос: только сегодня/завтра/3 дня с незакрытыми флагами
        with db() as conn:
            conn.row_factory = sqlite3.Row
            confirmed = [dict(r) for r in conn.execute(
                "SELECT * FROM bookings WHERE status='confirmed'"
                " AND date IN (?,?,?)"
                " AND (reminded_1d=0 OR reminded_3d=0 OR reminded_1h=0 OR review_sent=0)",
                (today, tomorrow, day3)).fetchall()]
            # Повторные продажи: завершённые визиты (completed) у которых прошло REPEAT_SALE_DAYS
            for_repeat = [dict(r) for r in conn.execute(
                "SELECT * FROM bookings WHERE status IN ('confirmed','completed')"
                " AND repeat_notified=0 AND date <= ?",
                (today,)).fetchall()]

        for b in confirmed:
            # Напоминание за 3 дня (Уровень 2)
            day3 = (datetime.now() + timedelta(days=3)).strftime("%d.%m.%Y")
            if b["date"] == day3 and not b.get("reminded_3d"):
                try:
                    bot.send_message(b["chat_id"],
                        "Напоминаем: через 3 дня у вас визит в {}!\n\n"
                        "{} | Мастер: {} | {}\n"
                        "Адрес: {}".format(
                            BUSINESS_NAME, b["service"], b["master"], b["time"], ADDRESS))
                    with db() as c2:
                        c2.execute("UPDATE bookings SET reminded_3d=1 WHERE id=?", (b["id"],))
                        c2.commit()
                except Exception as e:
                    logger.error("Reminder 3d (bid=%s): %s", b.get("id"), e)

            # Напоминание за 1 день
            if b["date"] == tomorrow and not b["reminded_1d"]:
                try:
                    comment_line = "\nПожелание: {}".format(b["comment"]) if b.get("comment") else ""
                    bot.send_message(b["chat_id"],
                        "Завтра визит в {}!\n\n"
                        "{} | Мастер: {} | {}{}\n"
                        "Адрес: {}\n\n"
                        "Если нужно перенести - нажмите Перенести запись".format(
                            BUSINESS_NAME, b["service"], b["master"],
                            b["time"], comment_line, ADDRESS))
                    with db() as c2:
                        c2.execute("UPDATE bookings SET reminded_1d=1 WHERE id=?", (b["id"],))
                        c2.commit()
                except Exception as e:
                    logger.error("Reminder 1d (bid=%s): %s", b.get("id"), e)

            # Напоминание за 1 час
            if b["date"] == today and b["time"] == h1_time and not b["reminded_1h"]:
                try:
                    bot.send_message(b["chat_id"],
                        "Через 1 час ждем вас в {}!\n\n"
                        "{} | Мастер: {} | {}\n"
                        "Адрес: {}".format(
                            BUSINESS_NAME, b["service"], b["master"], b["time"], ADDRESS))
                    with db() as c2:
                        c2.execute("UPDATE bookings SET reminded_1h=1 WHERE id=?", (b["id"],))
                        c2.commit()
                except Exception as e:
                    logger.error("Reminder 1h (bid=%s): %s", b.get("id"), e)

            # Запрос отзыва через 2 часа после визита — только если визит ещё не закрыт вручную
            # (если менеджер нажал "Визит завершён", отзыв уже отправлен в step_enter_amount)
            if b["date"] == today and not b["review_sent"] and b["status"] == "confirmed":
                try:
                    visit_dt = datetime.strptime(
                        "{} {}".format(b["date"], b["time"]), "%d.%m.%Y %H:%M")
                    if now >= visit_dt + timedelta(hours=2):
                        markup = types.InlineKeyboardMarkup(row_width=5)
                        for i in range(1, 6):
                            markup.add(types.InlineKeyboardButton(
                                "{} зв.".format(i),
                                callback_data="review_{}_{}".format(b["id"], i)))
                        bot.send_message(b["chat_id"],
                            "Как прошел визит в {}?\n"
                            "Оцените от 1 до 5 — это займет 10 секунд!".format(BUSINESS_NAME),
                            reply_markup=markup)
                        with db() as c2:
                            c2.execute("UPDATE bookings SET review_sent=1 WHERE id=?", (b["id"],))
                            c2.commit()
                except Exception as e:
                    logger.error("Review send (bid=%s): %s", b.get("id"), e)

        # Повторная продажа через REPEAT_SALE_DAYS дней
        for b in for_repeat:
            try:
                visit_dt   = datetime.strptime(b["date"], "%d.%m.%Y")
                days_since = (now.date() - visit_dt.date()).days
                if days_since >= REPEAT_SALE_DAYS:
                    markup = types.InlineKeyboardMarkup()
                    markup.add(types.InlineKeyboardButton(
                        "Записаться снова", callback_data="repeat_book"))
                    bot.send_message(b["chat_id"],
                        "Привет, {}!\n\n"
                        "Прошло {} дней с последнего визита в {}.\n\n"
                        "Самое время обновить {}!\n"
                        "Записывайтесь — ждем вас!".format(
                            b["name"], days_since, BUSINESS_NAME, b["service"]),
                        reply_markup=markup)
                    with db() as c2:
                        c2.execute("UPDATE bookings SET repeat_notified=1 WHERE id=?", (b["id"],))
                        c2.commit()
            except Exception as e:
                logger.error("Repeat sale (bid=%s): %s", b.get("id"), e)

        # Уведомление о лояльности — при достижении порога
        with db() as conn:
            newly_loyal = conn.execute(
                "SELECT * FROM clients WHERE visit_count=? AND is_loyal=0",
                (LOYALTY_VISITS,)).fetchall()
        for c in newly_loyal:
            try:
                bot.send_message(c[0],
                    "Поздравляем! Вы стали постоянным клиентом {}!\n\n"
                    "Теперь вы получаете скидку {}% на все услуги.\n"
                    "Просто запишитесь как обычно — скидка применяется автоматически!".format(
                        BUSINESS_NAME, LOYALTY_DISCOUNT))
                with db() as c2:
                    c2.execute("UPDATE clients SET is_loyal=1 WHERE chat_id=?", (c[0],))
                    c2.commit()
            except Exception as e:
                logger.error("Loyalty notify (chat_id=%s): %s", c[0], e)

        # Суточный дайджест владельцу в DIGEST_HOUR
        # Используем флаг даты — не пропустим даже если бот был перезапущен
        now2 = datetime.now()
        global _digest_sent_date
        if now2.hour >= DIGEST_HOUR and _digest_sent_date != today:
            try:
                today_s = today_str()
                with db() as conn:
                    completed_today = conn.execute(
                        "SELECT COUNT(*) FROM bookings WHERE date=? AND status='completed'",
                        (today_s,)).fetchone()[0]
                    cancelled_today = conn.execute(
                        "SELECT COUNT(*) FROM bookings WHERE date=? AND status='cancelled'",
                        (today_s,)).fetchone()[0]
                    no_show_today = conn.execute(
                        "SELECT COUNT(*) FROM bookings WHERE date=? AND status='no_show'",
                        (today_s,)).fetchone()[0]
                    row = conn.execute(
                        "SELECT COUNT(*), AVG(rating) FROM reviews"
                        " WHERE created_at LIKE ?", (today_s + "%",)).fetchone()
                    reviews_today = row[0]
                    avg_today     = row[1]
                    # Выручка сегодня — только завершённые с фактической суммой
                    rev_rows = conn.execute(
                        "SELECT service, actual_amount FROM bookings"
                        " WHERE date=? AND status='completed'",
                        (today_s,)).fetchall()
                revenue_today = sum(
                    (a if a and a > 0 else SERVICES_PRICES.get(s, 0))
                    for s, a in rev_rows)
                avg_str = "{:.1f}".format(avg_today) if avg_today else "нет"
                digest = (
                    "Итог дня {}\n\n"
                    "Завершено: {} | Отменено: {} | Не явились: {}\n"
                    "Отзывов: {} | Средняя оценка: {}\n"
                    "Выручка: {:,} сом".format(
                        today_s, completed_today, cancelled_today,
                        no_show_today, reviews_today, avg_str, revenue_today)
                )
                # Алерт если no_show больше 30% от всех визитов дня
                total_today = completed_today + no_show_today
                if total_today > 0 and no_show_today / total_today >= 0.3:
                    digest += "\n\nВНИМАНИЕ: высокий процент неявок сегодня — {}%".format(
                        int(no_show_today / total_today * 100))
                # Лист ожидания — сколько клиентов в очереди на завтра
                tomorrow_s = (datetime.now() + timedelta(days=1)).strftime("%d.%m.%Y")
                with db() as conn:
                    wl_count = conn.execute(
                        "SELECT COUNT(*) FROM waitlist WHERE date=?",
                        (tomorrow_s,)).fetchone()[0]
                if wl_count:
                    digest += "\n\nЛист ожидания на завтра: {} чел.".format(wl_count)
                for oid in OWNER_IDS:
                    bot.send_message(int(oid), digest)
                _digest_sent_date = today  # помечаем что дайджест сегодня отправлен
            except Exception as e:
                logger.error("Digest error: %s", e)

    def job():
        """Обёртка с защитой: исключение в одном цикле не ломает весь планировщик."""
        try:
            _job_impl()
        except Exception as e:
            logger.exception("Критическая ошибка в планировщике: %s", e)

    schedule.every(1).minutes.do(job)
    while True:
        schedule.run_pending()
        time.sleep(30)


# ============================================================
#  /start
# ============================================================
@bot.message_handler(commands=["start"])
def cmd_start(msg):
    user_state.pop(msg.chat.id, None)  # сброс зависшего диалога при перезапуске/сбое
    if _is_rate_limited(msg.from_user.id):
        return
    role = "РЕЖИМ МЕНЕДЖЕРА\n\n" if is_admin(msg.from_user.id) else ""
    loyal = loyalty_info(msg.chat.id)
    bot.send_message(msg.chat.id,
        "Привет, {}!\n\n{}"
        "Добро пожаловать в {}!\n{}\n{}{}\n\nЧем помочь?".format(
            msg.from_user.first_name, role,
            BUSINESS_NAME, WORKING_HOURS, ADDRESS, loyal),
        reply_markup=kb(msg.from_user.id))


# ============================================================
#  ПОРТФОЛИО
# ============================================================
@bot.message_handler(commands=["portfolio"])
def cmd_portfolio(msg):
    photos = get_portfolio_photos()  # загружаем из БД (не теряется при перезапуске)
    if not photos:
        bot.send_message(msg.chat.id,
            "Фото работ скоро появятся!\n"
            "А пока посмотрите наши работы в Instagram: @beautystudio_bishkek")
        return
    bot.send_message(msg.chat.id, "Наши работы:")
    for photo in photos[:10]:
        try:
            bot.send_photo(msg.chat.id, photo)
        except Exception:
            pass

# Владелец добавляет фото через /addphoto
@bot.message_handler(commands=["addphoto"])
def cmd_addphoto(msg):
    if not is_owner(msg.from_user.id):
        return
    user_state[msg.chat.id] = {"step": "add_photo"}
    bot.send_message(msg.chat.id,
        "Отправьте фото для портфолио.\n"
        "Я сохраню file_id для использования в /portfolio\n\n"
        "Или напишите отмена.")

@bot.message_handler(content_types=["photo"],
                     func=lambda m: user_state.get(m.chat.id, {}).get("step") == "add_photo")
def handle_portfolio_photo(msg):
    user_state.pop(msg.chat.id, None)
    file_id = msg.photo[-1].file_id
    save_portfolio_photo(file_id)  # сохраняем в БД — не потеряется при перезапуске
    photos = get_portfolio_photos()
    bot.send_message(msg.chat.id,
        "Фото добавлено в портфолио!\n"
        "file_id: {}\n\n"
        "Всего фото: {}.".format(file_id, len(photos)))


# ============================================================
#  УСЛУГИ / FAQ / КОНТАКТЫ
# ============================================================

# Кнопка «Запись по звонку» из меню менеджера
@bot.message_handler(func=lambda m: m.text == "Запись по звонку" and is_admin(m.from_user.id))
def cmd_newbook_btn(msg):
    user_state[msg.chat.id] = {"step": "nb_name", "manual": True}
    bot.send_message(msg.chat.id,
        "Запись по звонку.\n\nШаг 1/6: Введите имя клиента:",
        reply_markup=types.ReplyKeyboardRemove())

# Кнопка «Чёрный список» из меню менеджера
@bot.message_handler(func=lambda m: m.text == "Чёрный список" and is_admin(m.from_user.id))
def cmd_blacklist_btn(msg):
    bl = get_blacklist()
    if not bl:
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton(
            "Добавить клиента", callback_data="bl_add_start"))
        bot.send_message(msg.chat.id, "Чёрный список пуст.", reply_markup=markup)
        return
    markup = types.InlineKeyboardMarkup(row_width=1)
    lines  = ["Чёрный список ({}):\n".format(len(bl))]
    for c in bl:
        ns = c["no_show_count"]
        reason   = c["reason"] if c.get("reason") else "без причины"
        added_at = c.get("added_at", "")[:10]
        lines.append("{} {} | no_show: {} | {} | добавлен: {}".format(
            c["name"], c["phone"], ns, reason, added_at))
        markup.add(types.InlineKeyboardButton(
            "Разблокировать {}".format(c["name"]),
            callback_data="bl_remove_{}".format(c["chat_id"])))
    markup.add(types.InlineKeyboardButton("Добавить клиента", callback_data="bl_add_start"))
    for chunk in ["\n".join(lines[i:i+20]) for i in range(0, len(lines), 20)]:
        bot.send_message(msg.chat.id, chunk, reply_markup=markup)


@bot.message_handler(func=lambda m: m.text == "Услуги и цены")
def cmd_services(msg):
    client = get_client(msg.chat.id)
    discount = ""
    if client and client.get("is_loyal"):
        discount = "\n\nВы постоянный клиент — скидка {}% на все услуги!".format(LOYALTY_DISCOUNT)
    text = "Наши услуги:\n\n" + "\n".join(
        "{} - {}".format(s, p) for s, p in SERVICES.items()) + discount
    bot.send_message(msg.chat.id, text, reply_markup=kb(msg.from_user.id))

@bot.message_handler(func=lambda m: m.text == "Частые вопросы")
def cmd_faq(msg):
    markup = types.InlineKeyboardMarkup(row_width=1)
    for q in FAQ:
        markup.add(types.InlineKeyboardButton(q, callback_data="faq_" + q))
    bot.send_message(msg.chat.id, "Частые вопросы:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("faq_"))
def cb_faq(call):
    q = call.data[4:]
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id,
        "{}\n\n{}".format(q, FAQ.get(q, "?")),
        reply_markup=kb(call.from_user.id))

# ============================================================
#  ВСПОМОГАТЕЛЬНАЯ КЛАВИАТУРА ВЫБОРА ДАТЫ
# ============================================================
def date_picker_keyboard():
    """Возвращает клавиатуру с кнопками дат на 7 дней + Назад."""
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    for d in next_days(7):
        m.add(types.KeyboardButton("ДАТА " + day_label(d)))
    m.add(types.KeyboardButton("Назад"))
    return m


@bot.message_handler(func=lambda m: m.text == "Контакты")
def cmd_contacts(msg):
    bot.send_message(msg.chat.id,
        "{}\n\n{}\n{}\n{}\n\nПортфолио работ: /portfolio".format(
            BUSINESS_NAME, PHONE, ADDRESS, WORKING_HOURS),
        reply_markup=kb(msg.from_user.id))


# ============================================================
#  ЗАПИСЬ: шаг 1 — дата (с защитой от дублей)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Записаться")
def cmd_book(msg):
    if _is_rate_limited(msg.from_user.id):
        return
    # Проверка чёрного списка
    if is_blacklisted(msg.chat.id):
        bot.send_message(msg.chat.id,
            "К сожалению, запись через бот для вас недоступна.\n"
            "Пожалуйста, позвоните нам: {}".format(PHONE))
        return
    user_state[msg.chat.id] = {"step": "date"}
    bot.send_message(msg.chat.id, "Выберите дату записи:", reply_markup=date_picker_keyboard())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "date")
def step_date(msg):
    if msg.text == "Назад":
        user_state.pop(msg.chat.id, None)
        bot.send_message(msg.chat.id, "Отменено.", reply_markup=kb(msg.from_user.id))
        return
    try:
        raw = msg.text.replace("ДАТА ", "").strip().split(" ")[-1]
        sel = datetime.strptime(
            "{}.{}".format(raw, datetime.now().year), "%d.%m.%Y").strftime("%d.%m.%Y")
    except Exception:
        bot.send_message(msg.chat.id, "Выберите дату из списка.")
        return

    # Защита от дублей: проверяем нет ли уже записи на этот день
    if not is_admin(msg.from_user.id) and client_has_booking_on_date(msg.chat.id, sel):
        bot.send_message(msg.chat.id,
            "У вас уже есть запись на {}.\n\n"
            "Посмотреть — нажмите Мои записи\n"
            "Перенести — нажмите Перенести запись".format(sel),
            reply_markup=kb(msg.from_user.id))
        user_state.pop(msg.chat.id, None)
        return

    user_state[msg.chat.id].update({"date": sel, "step": "master"})
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    for mname in MASTERS.values():
        m.add(mname)
    bot.send_message(msg.chat.id,
        "Дата: {}\n\nВыберите мастера:".format(sel), reply_markup=m)

# шаг 2 — мастер
@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "master")
def step_master(msg):
    if msg.text not in MASTERS.values():
        bot.send_message(msg.chat.id, "Выберите мастера из списка.")
        return
    date   = user_state[msg.chat.id]["date"]
    master = msg.text
    free   = free_slots(date, master)
    if not free:
        # Предлагаем встать в лист ожидания если клиент уже знает имя/телефон
        client = get_client(msg.chat.id)
        if client and not is_admin(msg.from_user.id):
            wl_markup = types.InlineKeyboardMarkup(row_width=1)
            wl_markup.add(types.InlineKeyboardButton(
                "Уведомить если место освободится",
                callback_data="wl_add_{}_{}".format(
                    user_state[msg.chat.id]["date"].replace(".", "_"),
                    master.replace(" ", "_"))))
            bot.send_message(msg.chat.id,
                "У мастера {} нет свободного времени на {}.\n\n"
                "Хотите чтобы мы уведомили вас если место освободится?".format(master, date),
                reply_markup=wl_markup)
        else:
            bot.send_message(msg.chat.id,
                "У мастера {} нет свободного времени на {}. "
                "Выберите другого мастера.".format(master, date))
        return

    user_state[msg.chat.id].update({"master": master, "step": "name"})

    # Профиль мастера + запрос имени — одно сообщение
    if master != "Любой мастер" and master in MASTER_PROFILES:
        profile  = MASTER_PROFILES[master]
        with db() as conn:
            row = conn.execute(
                "SELECT AVG(r.rating) FROM reviews r"
                " JOIN bookings b ON b.id = r.booking_id"
                " WHERE b.master=?", (master,)).fetchone()
        avg_r    = row[0]
        rating_s = " | Рейтинг {:.1f}★".format(avg_r) if avg_r else ""
        caption  = "{}{}\n{}\n\nВведите ваше имя:".format(
            master, rating_s, profile["spec"])
        if profile.get("photo_id"):
            try:
                bot.send_photo(msg.chat.id, profile["photo_id"],
                               caption=caption,
                               reply_markup=types.ReplyKeyboardRemove())
                return
            except Exception:
                pass
        bot.send_message(msg.chat.id, caption,
                         reply_markup=types.ReplyKeyboardRemove())
    else:
        bot.send_message(msg.chat.id,
            "Мастер: {}\n\nВведите ваше имя:".format(master),
            reply_markup=types.ReplyKeyboardRemove())

# шаг 3 — имя
@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "name")
def step_name(msg):
    if len(msg.text.strip()) < 2:
        bot.send_message(msg.chat.id, "Введите ваше имя (минимум 2 символа).")
        return
    user_state[msg.chat.id].update({"name": msg.text.strip(), "step": "phone"})
    bot.send_message(msg.chat.id, "Приятно, {}! Введите номер телефона:".format(msg.text.strip()))

# шаг 4 — телефон с валидацией
@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "phone")
def step_phone(msg):
    if not validate_phone(msg.text):
        bot.send_message(msg.chat.id,
            "Введите корректный номер телефона.\n"
            "Пример: +996 700 123456 или 0700123456")
        return
    user_state[msg.chat.id].update({"phone": msg.text.strip(), "step": "service"})
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    for s in SERVICES:
        m.add(s)
    bot.send_message(msg.chat.id, "Выберите услугу:", reply_markup=m)

# шаг 5 — услуга
@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "service")
def step_service(msg):
    if msg.text not in SERVICES:
        bot.send_message(msg.chat.id, "Выберите из списка.")
        return
    user_state[msg.chat.id].update({"service": msg.text, "step": "time"})
    date   = user_state[msg.chat.id]["date"]
    master = user_state[msg.chat.id]["master"]
    free   = free_slots(date, master)
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=3)
    for s in free:
        m.add(s)
    bot.send_message(msg.chat.id,
        "Свободное время на {} у мастера {}:".format(date, master),
        reply_markup=m)

# шаг 6 — время
@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "time")
def step_time(msg):
    state  = user_state[msg.chat.id]
    date   = state["date"]
    master = state["master"]
    if msg.text not in free_slots(date, master):
        bot.send_message(msg.chat.id, "Это время занято. Выберите другое.")
        return
    state["time"] = msg.text
    # шаг 7 — комментарий
    user_state[msg.chat.id].update({"step": "comment"})
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=1)
    markup.add("Без пожеланий")
    bot.send_message(msg.chat.id,
        "Время: {}\n\n"
        "Есть пожелания мастеру? (длина волос, цвет, аллергии и т.д.)\n"
        "Или нажмите Без пожеланий".format(msg.text),
        reply_markup=markup)

# шаг 7 — комментарий → сохранить запись
@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "comment")
def step_comment(msg):
    state   = user_state[msg.chat.id]
    comment = "" if msg.text == "Без пожеланий" else msg.text
    state["comment"] = comment
    user_state.pop(msg.chat.id, None)

    is_resc = state.get("reschedule", False)
    old_bid = state.get("old_bid", 0)

    bid = save_booking(
        state["name"], state["phone"], state["service"],
        state["master"], state["date"], state["time"],
        msg.chat.id, comment=comment,
        is_reschedule=1 if is_resc else 0, old_bid=old_bid)

    # Информация о скидке постоянного клиента
    client = get_client(msg.chat.id)
    discount_note = ""
    if client and client.get("is_loyal"):
        discount_note = "\n\nВы постоянный клиент! Скидка {}% будет применена.".format(LOYALTY_DISCOUNT)

    # Уведомляем менеджера
    comment_line = "\nПожелание: {}".format(state["comment"]) if state.get("comment") else ""
    if is_resc:
        old_b    = get_booking(old_bid) if old_bid else None
        old_info = "{} {}".format(old_b["date"], old_b["time"]) if old_b else "неизвестно"
        admin_text = (
            "ЗАПРОС НА ПЕРЕНОС #{}\n\n"
            "{} | {}\n"
            "{} | Мастер: {}{}\n"
            "Старое: {}\nНовое: {} {}".format(
                bid, state["name"], state["phone"],
                state["service"], state["master"], comment_line,
                old_info, state["time"], state["date"]))
        if old_bid:
            update_status(old_bid, "cancelled")
    else:
        loyal_note = " [ПОСТОЯННЫЙ -{}%]".format(LOYALTY_DISCOUNT) if (client and client.get("is_loyal")) else ""
        admin_text = (
            "НОВАЯ ЗАЯВКА #{}\n\n"
            "{} | {}{}\n"
            "{} | Мастер: {}{}\n"
            "{} {}".format(
                bid, state["name"], state["phone"], loyal_note,
                state["service"], state["master"], comment_line,
                state["time"], state["date"]))

    try:
        bot.send_message(ADMIN_CHAT_ID, admin_text,
                         reply_markup=admin_markup(bid, is_resc))
    except Exception as e:
        logger.error("Admin notify (bid=%s): %s", bid, e)

    # Сообщение клиенту
    if is_resc:
        bot.send_message(msg.chat.id,
            "Запрос на перенос #{} отправлен!\n\n"
            "{} | Мастер: {} | {} {}\n\n"
            "Ожидайте подтверждения менеджера.".format(
                bid, state["service"], state["master"], state["time"], state["date"]),
            reply_markup=kb(msg.from_user.id))
    else:
        bot.send_message(msg.chat.id,
            "Заявка #{} принята!\n\n"
            "{} | {} | Мастер: {}\n"
            "{} {}{}\n\n"
            "Ожидайте подтверждения (обычно 15 минут).".format(
                bid, state["name"], state["service"], state["master"],
                state["time"], state["date"], discount_note),
            reply_markup=kb(msg.from_user.id))


# ============================================================
#  ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ
# ============================================================
@bot.callback_query_handler(func=lambda c: c.data.startswith("confirm_"))
def cb_confirm(call):
    if not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "Нет доступа.")
        return
    bid = int(call.data[8:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Не найдена.")
        return
    update_status(bid, "confirmed")
    bot.answer_callback_query(call.id, "Подтверждено!")
    try:
        bot.edit_message_reply_markup(call.message.chat.id, call.message.message_id, reply_markup=None)
    except Exception:
        pass
    label = "Перенос" if b.get("is_reschedule") else "Запись"
    # Кнопки управления визитом после подтверждения
    visit_markup = types.InlineKeyboardMarkup(row_width=2)
    visit_markup.add(
        types.InlineKeyboardButton(
            "Визит завершён",   callback_data="visit_done_{}".format(bid)),
        types.InlineKeyboardButton(
            "Не явился",        callback_data="visit_noshow_{}".format(bid)),
    )
    bot.send_message(call.message.chat.id,
        "{} #{} подтверждена\n{} | {} {} {}\n\nПосле визита отметьте результат:".format(
            label, bid, b["name"], b["service"], b["date"], b["time"]),
        reply_markup=visit_markup)
    comment_line = "\nПожелание: {}".format(b["comment"]) if b.get("comment") else ""
    try:
        bot.send_message(b["chat_id"],
            "{} #{} ПОДТВЕРЖДЕНА!\n\n"
            "{} | Мастер: {} | {} {}{}\n"
            "Адрес: {}\n\n"
            "Ждем вас! Напоминания придут за день и за час.".format(
                label, bid, b["service"], b["master"],
                b["time"], b["date"], comment_line, ADDRESS))
    except Exception as e:
        logger.error("Confirm client (bid=%s): %s", bid, e)

# ── Менеджер нажимает «Визит завершён» → вводит фактическую сумму ───────────
@bot.callback_query_handler(func=lambda c: c.data.startswith("visit_done_"))
def cb_visit_done(call):
    if not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "Нет доступа.")
        return
    bid = int(call.data[11:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Запись не найдена.")
        return
    # Защита от повторного нажатия
    if b["status"] != "confirmed":
        status_names = {
            "completed": "уже завершён",
            "no_show":   "отмечен как неявка",
            "cancelled": "отменён",
        }
        label = status_names.get(b["status"], "уже обработан")
        bot.answer_callback_query(call.id,
            "Визит #{} {}.".format(bid, label), show_alert=True)
        return
    bot.answer_callback_query(call.id)
    try:
        bot.edit_message_reply_markup(call.message.chat.id, call.message.message_id, reply_markup=None)
    except Exception:
        pass
    base = SERVICES_PRICES.get(b["service"], 0)
    user_state[call.from_user.id] = {"step": "enter_amount", "bid": bid}
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    if base:
        markup.add(str(base))
    markup.add("Пропустить")
    bot.send_message(call.message.chat.id,
        "Визит #{} — {}.\n"
        "Введите фактическую сумму чека (сом):\n"
        "Базовая цена: {} сом".format(bid, b["name"], base),
        reply_markup=markup)

@bot.message_handler(func=lambda m: user_state.get(m.from_user.id, {}).get("step") == "enter_amount")
def step_enter_amount(msg):
    state = user_state.pop(msg.from_user.id, {})
    bid   = state.get("bid")
    if not bid:
        return
    b = get_booking(bid)
    if msg.text == "Пропустить":
        amount = SERVICES_PRICES.get(b["service"], 0) if b else 0
    else:
        try:
            amount = int(re.sub(r"[^\d]", "", msg.text))
        except (ValueError, TypeError):
            bot.send_message(msg.chat.id,
                "Введите число — сумму в сомах (например: 1500).")
            user_state[msg.from_user.id] = state  # возвращаем state
            return
    complete_booking(bid, amount)
    bot.send_message(msg.chat.id,
        "Визит #{} завершён. Сумма: {:,} сом.".format(bid, amount),
        reply_markup=kb(msg.from_user.id))
    # Отправляем клиенту запрос отзыва — и сразу помечаем review_sent=1
    # чтобы планировщик не прислал второй запрос через 2 часа
    if b:
        try:
            markup = types.InlineKeyboardMarkup(row_width=5)
            for i in range(1, 6):
                markup.add(types.InlineKeyboardButton(
                    "{} зв.".format(i),
                    callback_data="review_{}_{}".format(bid, i)))
            bot.send_message(b["chat_id"],
                "Спасибо за визит в {}!\n"
                "Как всё прошло? Оцените пожалуйста:".format(BUSINESS_NAME),
                reply_markup=markup)
            # Помечаем чтобы планировщик не слал второй раз
            with db() as conn:
                conn.execute("UPDATE bookings SET review_sent=1 WHERE id=?", (bid,))
                conn.commit()
        except Exception as e:
            logger.error("Review prompt after complete (bid=%s): %s", bid, e)

# ── Менеджер нажимает «Не явился» ───────────────────────────────────────────
@bot.callback_query_handler(func=lambda c: c.data.startswith("visit_noshow_"))
def cb_visit_noshow(call):
    if not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "Нет доступа.")
        return
    bid = int(call.data[13:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Запись не найдена.")
        return
    # Защита от повторного нажатия
    if b["status"] != "confirmed":
        status_names = {
            "completed": "уже завершён",
            "no_show":   "уже отмечен как неявка",
            "cancelled": "отменён",
        }
        label = status_names.get(b["status"], "уже обработан")
        bot.answer_callback_query(call.id,
            "Визит #{} {}.".format(bid, label), show_alert=True)
        return
    no_show_booking(bid)
    bot.answer_callback_query(call.id, "Отмечено: не явился.")
    try:
        bot.edit_message_text(
            "Запись #{} — {} не явился. Слот освобождён.".format(bid, b["name"]),
            call.message.chat.id, call.message.message_id)
    except Exception:
        bot.send_message(call.message.chat.id,
            "Запись #{} — {} не явился.".format(bid, b["name"]),
            reply_markup=kb(call.from_user.id))

# ── Кнопка «Завершить визит» из расписания (детальный вид дня) ───────────────
@bot.callback_query_handler(func=lambda c: c.data.startswith("close_visit_"))
def cb_close_visit(call):
    if not is_admin(call.from_user.id):
        return
    bid = int(call.data[12:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Не найдена.")
        return
    bot.answer_callback_query(call.id)
    visit_markup = types.InlineKeyboardMarkup(row_width=2)
    visit_markup.add(
        types.InlineKeyboardButton(
            "Визит завершён", callback_data="visit_done_{}".format(bid)),
        types.InlineKeyboardButton(
            "Не явился",      callback_data="visit_noshow_{}".format(bid)),
    )
    bot.send_message(call.message.chat.id,
        "Закрытие визита #{} — {} | {} | {}\nВыберите результат:".format(
            bid, b["name"], b["service"], b["time"]),
        reply_markup=visit_markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("decline_"))
def cb_decline(call):
    if not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "Нет доступа.")
        return
    bid = int(call.data[8:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Не найдена.")
        return
    user_state[call.from_user.id] = {"step": "decline_reason", "bid": bid}
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id,
        "Укажите причину отклонения (или напишите нет):",
        reply_markup=types.ForceReply())

@bot.message_handler(func=lambda m: user_state.get(m.from_user.id, {}).get("step") == "decline_reason")
def step_decline(msg):
    state  = user_state.pop(msg.from_user.id, {})
    bid    = state.get("bid")
    if not bid:
        return
    b = get_booking(bid)
    # Проверяем что запись ещё не отменена (защита от двойного нажатия)
    if not b or b["status"] not in ("pending", "confirmed"):
        bot.send_message(msg.chat.id,
            "Запись #{} уже обработана.".format(bid),
            reply_markup=kb(msg.from_user.id))
        return
    update_status(bid, "cancelled")
    reason = "" if msg.text.lower() in ("нет", "net", "no") else " Причина: {}".format(msg.text)
    bot.send_message(msg.chat.id,
        "Запись #{} отклонена.".format(bid), reply_markup=kb(msg.from_user.id))
    try:
        bot.send_message(b["chat_id"],
            "Ваша заявка #{} на {} {} отклонена.{}\n\n"
            "Выберите другое время или позвоните: {}".format(
                bid, b["date"], b["time"], reason, PHONE))
    except Exception as e:
        logger.error("Decline client (bid=%s): %s", bid, e)


# ============================================================
#  МОИ ЗАПИСИ
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Мои записи")
def cmd_my(msg):
    # Активные записи (pending + confirmed)
    active = get_client_bookings(msg.chat.id)
    # История завершённых и отменённых (последние 5)
    with db() as conn:
        conn.row_factory = sqlite3.Row
        history = [dict(r) for r in conn.execute(
            "SELECT * FROM bookings WHERE chat_id=? AND status IN ('completed','cancelled','no_show')"
            " ORDER BY date DESC, time DESC LIMIT 20",
            (msg.chat.id,)).fetchall()]

    if not active and not history:
        bot.send_message(msg.chat.id,
            "У вас нет записей.{}".format(loyalty_info(msg.chat.id)))
        return

    markup = types.InlineKeyboardMarkup(row_width=1)
    text = "Ваши записи:{}\n\n".format(loyalty_info(msg.chat.id))

    if active:
        text += "Активные:\n"
        for b in active:
            icon    = "(ожидает)" if b["status"] == "pending" else "(подтверждена)"
            comment = "  [{}]".format(b["comment"]) if b.get("comment") else ""
            text += "#{} {} | {} {} | {} | {}{}\n".format(
                b["id"], icon, b["date"], b["time"],
                b["service"], b["master"], comment)
            if can_cancel(b["date"], b["time"]):
                btn_label = "Отозвать заявку #{}" if b["status"] == "pending" else "Отменить #{}"
                markup.add(types.InlineKeyboardButton(
                    "{} ({} {})".format(btn_label.format(b["id"]), b["date"], b["time"]),
                    callback_data="cancel_{}".format(b["id"])))
            else:
                markup.add(types.InlineKeyboardButton(
                    "#{} — отмена недоступна (менее {} ч)".format(b["id"], CANCEL_HOURS),
                    callback_data="cancel_too_late_{}".format(b["id"])))

    if history:
        text += "\nИстория (последние 5):\n"
        status_icons = {
            "completed": "завершён",
            "cancelled": "отменён",
            "no_show":   "не явился",
        }
        for b in history:
            label  = status_icons.get(b["status"], b["status"])
            amount = "  {:,} сом".format(b["actual_amount"]) if b.get("actual_amount") else ""
            text += "{} {} | {} | {}{}\n".format(
                b["date"], b["time"], b["service"], label, amount)

    bot.send_message(msg.chat.id, text, reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("cancel_too_late_"))
def cb_cancel_too_late(call):
    bot.answer_callback_query(call.id,
        "Отмена недоступна менее чем за {} часа до визита.\nПозвоните нам: {}".format(
            CANCEL_HOURS, PHONE), show_alert=True)

# Шаг 1 — спрашиваем подтверждение
@bot.callback_query_handler(func=lambda c: c.data.startswith("cancel_") and not c.data.startswith("cancel_too"))
def cb_cancel(call):
    bid = int(call.data[7:])
    b   = get_booking(bid)
    if not b or b["status"] not in ("pending", "confirmed"):
        bot.answer_callback_query(call.id, "Запись не найдена.")
        return
    if b["chat_id"] != call.message.chat.id:
        bot.answer_callback_query(call.id, "Не ваша запись.")
        return
    if not can_cancel(b["date"], b["time"]):
        bot.answer_callback_query(call.id,
            "Отмена недоступна. Позвоните нам: {}".format(PHONE), show_alert=True)
        return
    # Показываем диалог подтверждения
    bot.answer_callback_query(call.id)
    confirm_markup = types.InlineKeyboardMarkup(row_width=2)
    confirm_markup.add(
        types.InlineKeyboardButton("Да, отменить",  callback_data="do_cancel_{}".format(bid)),
        types.InlineKeyboardButton("Нет, оставить", callback_data="abort_cancel"),
    )
    bot.send_message(call.message.chat.id,
        "Вы уверены что хотите отменить запись?\n\n"
        "#{} | {} {} | {} | {}".format(
            bid, b["date"], b["time"], b["service"], b["master"]),
        reply_markup=confirm_markup)

# Шаг 2 — фактическая отмена
@bot.callback_query_handler(func=lambda c: c.data.startswith("do_cancel_"))
def cb_do_cancel(call):
    bid = int(call.data[10:])
    b   = get_booking(bid)
    if not b or b["status"] not in ("pending", "confirmed"):
        bot.answer_callback_query(call.id, "Запись уже отменена.")
        return
    if b["chat_id"] != call.message.chat.id:
        bot.answer_callback_query(call.id, "Не ваша запись.")
        return
    if not can_cancel(b["date"], b["time"]):
        bot.answer_callback_query(call.id,
            "Отмена закрыта. Позвоните: {}".format(PHONE), show_alert=True)
        return
    update_status(bid, "cancelled")
    bot.answer_callback_query(call.id)
    try:
        bot.edit_message_text(
            "Запись #{} отменена.".format(bid),
            call.message.chat.id, call.message.message_id,
            reply_markup=None)
    except Exception:
        bot.send_message(call.message.chat.id,
            "Запись #{} отменена.".format(bid),
            reply_markup=kb(call.from_user.id))
    try:
        bot.send_message(ADMIN_CHAT_ID,
            "ОТМЕНА #{} — клиент\n{} | {} {} | {}".format(
                bid, b["name"], b["date"], b["time"], b["service"]))
    except Exception:
        pass
    # Уведомляем лист ожидания
    threading.Thread(
        target=notify_waitlist,
        args=(b["date"], b["time"], b["master"]),
        daemon=True).start()

# Клиент передумал отменять
@bot.callback_query_handler(func=lambda c: c.data == "abort_cancel")
def cb_abort_cancel(call):
    bot.answer_callback_query(call.id, "Запись сохранена.")
    try:
        bot.delete_message(call.message.chat.id, call.message.message_id)
    except Exception:
        pass


# ============================================================
#  ПЕРЕНОС ЗАПИСИ
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Перенести запись")
def cmd_reschedule(msg):
    rows = [b for b in get_client_bookings(msg.chat.id) if b["status"] == "confirmed"]
    if not rows:
        bot.send_message(msg.chat.id,
            "Нет подтвержденных записей для переноса.\n"
            "Сначала запишитесь — нажмите Записаться")
        return
    markup = types.InlineKeyboardMarkup(row_width=1)
    for b in rows:
        markup.add(types.InlineKeyboardButton(
            "Перенести #{} - {} {} | {}".format(b["id"], b["date"], b["time"], b["service"]),
            callback_data="resc_{}".format(b["id"])))
    bot.send_message(msg.chat.id, "Выберите запись для переноса:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("resc_"))
def cb_resc(call):
    bid = int(call.data[5:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Не найдена.")
        return
    bot.answer_callback_query(call.id)
    user_state[call.message.chat.id] = {
        "step": "date", "name": b["name"], "phone": b["phone"],
        "service": b["service"], "master": b["master"],
        "reschedule": True, "old_bid": bid,
    }
    bot.send_message(call.message.chat.id,
        "Перенос записи #{}\n"
        "Старое время: {} {}\n\n"
        "Выберите новую дату:".format(bid, b["date"], b["time"]),
        reply_markup=date_picker_keyboard())

@bot.callback_query_handler(func=lambda c: c.data == "repeat_book")
def cb_repeat(call):
    bot.answer_callback_query(call.id)
    user_state[call.message.chat.id] = {"step": "date"}
    bot.send_message(call.message.chat.id, "Рады снова видеть вас! Выберите дату:",
                     reply_markup=date_picker_keyboard())


# ============================================================
#  РАСПИСАНИЕ (менеджер) — с быстрым подтверждением из дня
# ============================================================
def _get_overview_counts() -> dict:
    """Один запрос вместо 14 (7 для text + 7 для markup)."""
    days  = next_days(7)
    dates = [d.strftime("%d.%m.%Y") for d in days]
    placeholders = ",".join("?" * len(dates))
    with db() as conn:
        rows = conn.execute(
            "SELECT date, COUNT(*) FROM bookings"
            " WHERE date IN ({}) AND status IN ('confirmed','pending')"
            " GROUP BY date".format(placeholders),
            dates).fetchall()
    counts = {d: 0 for d in dates}
    for row in rows:
        counts[row[0]] = row[1]
    return counts

def overview_text():
    days   = next_days(7)
    counts = _get_overview_counts()
    text   = "Расписание на 7 дней:\n\n"
    for d in days:
        ds  = d.strftime("%d.%m.%Y")
        dn  = DAY_NAMES[d.weekday()]
        occ = counts.get(ds, 0)
        fr  = len(ALL_SLOTS) - occ
        if occ == 0:   status = "все свободны"
        elif fr == 0:  status = "полностью занят"
        else:          status = "занято {}/{}".format(occ, len(ALL_SLOTS))
        text += "{} {} — {}\n".format(dn, ds, status)
    text += "\nНажмите на день:"
    return text

def overview_markup():
    days   = next_days(7)
    counts = _get_overview_counts()
    markup = types.InlineKeyboardMarkup(row_width=2)
    today  = datetime.now().date()
    for d in days:
        ds   = d.strftime("%d.%m.%Y")
        dn   = DAY_NAMES[d.weekday()]
        occ  = counts.get(ds, 0)
        pref = "Сег " if d.date() == today else (
               "Завт " if d.date() == today + timedelta(days=1) else "")
        markup.add(types.InlineKeyboardButton(
            "{}{} {} ({}/{})".format(pref, dn, d.strftime("%d.%m"), occ, len(ALL_SLOTS)),
            callback_data="sched_{}".format(ds)))
    return markup

@bot.message_handler(func=lambda m: m.text == "Расписание" and is_admin(m.from_user.id))
def cmd_schedule(msg):
    bot.send_message(msg.chat.id, overview_text(), reply_markup=overview_markup())

@bot.callback_query_handler(func=lambda c: c.data.startswith("sched_") and c.data != "sched_back")
def cb_day(call):
    if not is_admin(call.from_user.id):
        return
    ds   = call.data[6:]
    rows = {b["time"]: b for b in get_active_bookings(ds)}
    try:
        dn = DAY_NAMES[datetime.strptime(ds, "%d.%m.%Y").weekday()]
    except Exception:
        dn = ""

    # Текст расписания
    text = "{} {} - детали:\n\n".format(dn, ds)
    pending_bids = []
    for slot in ALL_SLOTS:
        if slot in rows:
            b    = rows[slot]
            icon = "(ожид)" if b["status"] == "pending" else "(подтв)"
            resc = " ПЕРЕНОС" if b.get("is_reschedule") else ""
            comment = "  [{}]".format(b["comment"]) if b.get("comment") else ""
            text += "{}{} {} — {} {} | {} | #{}{}\n".format(
                icon, resc, slot, b["name"], b["phone"],
                b["service"], b["id"], comment)
            if b["status"] == "pending":
                pending_bids.append(b["id"])
        else:
            with db() as conn:
                bl = conn.execute(
                    "SELECT id FROM blocked_slots WHERE date=? AND time=?",
                    (ds, slot)).fetchone()
            text += "{} {} - {}\n".format(
                "ЗАБЛОК" if bl else "СВОБ", slot,
                "заблокировано" if bl else "свободно")

    occ = len(rows)
    text += "\nИтого: {} занято | {} свободно".format(occ, len(ALL_SLOTS) - occ)

    # Кнопки навигации
    markup = types.InlineKeyboardMarkup(row_width=2)
    # Быстрое подтверждение ожидающих записей прямо из расписания
    for bid in pending_bids:
        b = get_booking(bid)
        if b:
            markup.add(types.InlineKeyboardButton(
                "Подтвердить #{} ({} {})".format(bid, b["time"], b["name"]),
                callback_data="confirm_{}".format(bid)))
    # Кнопка закрытия подтверждённых визитов (для сегодняшнего дня)
    today = today_str()
    if ds == today:
        confirmed_today = [b for b in rows.values() if b["status"] == "confirmed"]
        for b in confirmed_today:
            bid = b["id"]
            markup.add(types.InlineKeyboardButton(
                "Закрыть #{} ({})".format(bid, b["time"]),
                callback_data="close_visit_{}".format(bid)))
    # Кнопка экспорта расписания
    markup.add(
        types.InlineKeyboardButton("Экспорт текстом", callback_data="export_{}".format(ds)),
        types.InlineKeyboardButton("Назад", callback_data="sched_back"))

    bot.answer_callback_query(call.id)
    try:
        bot.edit_message_text(text, call.message.chat.id, call.message.message_id, reply_markup=markup)
    except Exception:
        bot.send_message(call.message.chat.id, text, reply_markup=markup)

# Экспорт расписания дня
@bot.callback_query_handler(func=lambda c: c.data.startswith("export_"))
def cb_export(call):
    if not is_admin(call.from_user.id):
        return
    ds   = call.data[7:]
    rows = get_active_bookings(ds)
    try:
        dn = DAY_NAMES[datetime.strptime(ds, "%d.%m.%Y").weekday()]
    except Exception:
        dn = ""

    if not rows:
        bot.answer_callback_query(call.id, "На этот день нет записей.")
        return

    lines = ["{} - РАСПИСАНИЕ {}\n".format(BUSINESS_NAME, ds)]
    for b in rows:
        comment = " ({})" .format(b["comment"]) if b.get("comment") else ""
        lines.append("{} | {} | {} | {}{}".format(
            b["time"], b["name"], b["service"], b["master"], comment))
    lines.append("\nИтого: {} записей".format(len(rows)))

    export_text = "\n".join(lines)
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id,
        "Расписание {} {} для копирования:\n\n```\n{}\n```".format(dn, ds, export_text),
        parse_mode="Markdown")

@bot.callback_query_handler(func=lambda c: c.data == "sched_back")
def cb_sched_back(call):
    if not is_admin(call.from_user.id):
        return
    bot.answer_callback_query(call.id)
    try:
        bot.edit_message_text(overview_text(), call.message.chat.id, call.message.message_id,
                              reply_markup=overview_markup())
    except Exception:
        bot.send_message(call.message.chat.id, overview_text(), reply_markup=overview_markup())


# ============================================================
#  БЛОКИРОВКА ВРЕМЕНИ
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Закрыть время" and is_admin(m.from_user.id))
def cmd_block(msg):
    markup = types.InlineKeyboardMarkup(row_width=2)
    for d in next_days(7):
        ds = d.strftime("%d.%m.%Y")
        markup.add(types.InlineKeyboardButton(
            "{} {}".format(DAY_NAMES[d.weekday()], d.strftime("%d.%m")),
            callback_data="bday_{}".format(ds)))
    bot.send_message(msg.chat.id, "Выберите день:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("bday_"))
def cb_bday(call):
    if not is_admin(call.from_user.id): return
    ds     = call.data[5:]
    markup = types.InlineKeyboardMarkup(row_width=3)
    for s in free_slots(ds):
        markup.add(types.InlineKeyboardButton(s, callback_data="bslot_{}_{}".format(ds, s)))
    markup.add(
        types.InlineKeyboardButton("ВЕСЬ ДЕНЬ", callback_data="bfull_{}".format(ds)),
        types.InlineKeyboardButton("Назад",      callback_data="bback"))
    bot.answer_callback_query(call.id)
    bot.edit_message_text("{} - выберите время или весь день:".format(ds),
                          call.message.chat.id, call.message.message_id, reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("bslot_"))
def cb_bslot(call):
    if not is_admin(call.from_user.id): return
    parts = call.data[6:].split("_")
    ds, slot = parts[0], parts[1]
    block_slot(ds, slot)
    bot.answer_callback_query(call.id, "Заблокировано!")
    bot.edit_message_text("{} на {} заблокировано.".format(slot, ds),
                          call.message.chat.id, call.message.message_id)

@bot.callback_query_handler(func=lambda c: c.data.startswith("bfull_"))
def cb_bfull(call):
    if not is_admin(call.from_user.id): return
    ds = call.data[6:]
    block_day(ds)
    bot.answer_callback_query(call.id, "Весь день заблокирован!")
    bot.edit_message_text("{} - весь день заблокирован!".format(ds),
                          call.message.chat.id, call.message.message_id)

@bot.callback_query_handler(func=lambda c: c.data == "bback")
def cb_bback(call):
    if not is_admin(call.from_user.id): return
    markup = types.InlineKeyboardMarkup(row_width=2)
    for d in next_days(7):
        ds = d.strftime("%d.%m.%Y")
        markup.add(types.InlineKeyboardButton(
            "{} {}".format(DAY_NAMES[d.weekday()], d.strftime("%d.%m")),
            callback_data="bday_{}".format(ds)))
    bot.answer_callback_query(call.id)
    bot.edit_message_text("Выберите день:", call.message.chat.id,
                          call.message.message_id, reply_markup=markup)


# ============================================================
#  ОТКРЫТЬ ВРЕМЯ
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Открыть время" and is_admin(m.from_user.id))
def cmd_unblock(msg):
    with db() as conn:
        dates = [r[0] for r in conn.execute(
            "SELECT DISTINCT date FROM blocked_slots ORDER BY date").fetchall()]
    if not dates:
        bot.send_message(msg.chat.id, "Нет заблокированных слотов.", reply_markup=kb(msg.from_user.id))
        return
    markup = types.InlineKeyboardMarkup(row_width=2)
    for ds in dates:
        markup.add(types.InlineKeyboardButton(ds, callback_data="ubday_{}".format(ds)))
    bot.send_message(msg.chat.id, "Выберите день:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("ubday_"))
def cb_ubday(call):
    if not is_admin(call.from_user.id): return
    ds = call.data[6:]
    with db() as conn:
        slots = [r[0] for r in conn.execute(
            "SELECT time FROM blocked_slots WHERE date=?", (ds,)).fetchall()]
    markup = types.InlineKeyboardMarkup(row_width=3)
    for s in slots:
        markup.add(types.InlineKeyboardButton(s, callback_data="ubslot_{}_{}".format(ds, s)))
    markup.add(types.InlineKeyboardButton("ВЕСЬ ДЕНЬ", callback_data="ubfull_{}".format(ds)))
    bot.answer_callback_query(call.id)
    bot.edit_message_text("{} - выберите слот:".format(ds),
                          call.message.chat.id, call.message.message_id, reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("ubslot_"))
def cb_ubslot(call):
    if not is_admin(call.from_user.id): return
    parts = call.data[7:].split("_")
    ds, slot = parts[0], parts[1]
    unblock_slot(ds, slot)
    bot.answer_callback_query(call.id, "Разблокировано!")
    bot.edit_message_text("{} на {} открыто!".format(slot, ds),
                          call.message.chat.id, call.message.message_id)

@bot.callback_query_handler(func=lambda c: c.data.startswith("ubfull_"))
def cb_ubfull(call):
    if not is_admin(call.from_user.id): return
    ds = call.data[7:]
    unblock_day(ds)
    bot.answer_callback_query(call.id, "Весь день открыт!")
    bot.edit_message_text("{} - весь день открыт!".format(ds),
                          call.message.chat.id, call.message.message_id)


# ============================================================
#  ОТМЕНА ЗАПИСИ (менеджер)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Отменить запись" and is_admin(m.from_user.id))
def cmd_adm_cancel(msg):
    rows = get_active_bookings()
    if not rows:
        bot.send_message(msg.chat.id, "Нет активных записей.", reply_markup=kb(msg.from_user.id))
        return
    markup = types.InlineKeyboardMarkup(row_width=1)
    for b in sorted(rows, key=lambda x: (x["date"], x["time"]))[:15]:
        icon = "(ожид)" if b["status"] == "pending" else "(подтв)"
        resc = " ПЕРЕНОС" if b.get("is_reschedule") else ""
        markup.add(types.InlineKeyboardButton(
            "{}{} #{} - {} {} {} ({})".format(
                icon, resc, b["id"], b["date"], b["time"], b["name"], b["service"]),
            callback_data="acancel_{}".format(b["id"])))
    bot.send_message(msg.chat.id, "Выберите запись:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("acancel_"))
def cb_acancel(call):
    if not is_admin(call.from_user.id):
        bot.answer_callback_query(call.id, "Нет доступа.")
        return
    bid = int(call.data[8:])
    b   = get_booking(bid)
    if not b:
        bot.answer_callback_query(call.id, "Не найдена.")
        return
    update_status(bid, "cancelled")
    bot.answer_callback_query(call.id, "Отменено!")
    bot.edit_message_text("Запись #{} ({} {}) отменена.".format(bid, b["name"], b["time"]),
                          call.message.chat.id, call.message.message_id)
    try:
        bot.send_message(b["chat_id"],
            "Ваша запись #{} на {} ({}) отменена салоном.\n"
            "Запишитесь снова — нажмите Записаться\n"
            "Телефон: {}".format(bid, b["time"], b["date"], PHONE))
    except Exception:
        pass


# ============================================================
#  ПОИСК КЛИЕНТА
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Найти клиента" and is_admin(m.from_user.id))
def cmd_search(msg):
    user_state[msg.chat.id] = {"step": "searching"}
    bot.send_message(msg.chat.id, "Введите имя или телефон:",
                     reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "searching")
def step_search(msg):
    user_state.pop(msg.chat.id, None)
    results = search_client(msg.text)
    if not results:
        bot.send_message(msg.chat.id, "Клиент не найден.", reply_markup=kb(msg.from_user.id))
        return

    status_icons = {
        "pending":   "(ожид)",
        "confirmed": "(подтв)",
        "completed": "(завершён)",
        "cancelled": "(отменён)",
        "no_show":   "(не явился)",
    }
    text = "Результаты поиска по всем записям:\n\n"
    for b in results:
        icon   = status_icons.get(b["status"], "?")
        amount = "  {:,} сом".format(b["actual_amount"]) if b.get("actual_amount") else ""
        comment = " | {}".format(b["comment"]) if b.get("comment") else ""
        text += "{} #{} — {} {}\n{} {} | {}{}{}\n\n".format(
            icon, b["id"], b["name"], b["phone"],
            b["date"], b["time"], b["service"], amount, comment)
    # Постраничная отправка если длинно
    for i in range(0, len(text), 4000):
        bot.send_message(msg.chat.id, text[i:i+4000],
                         reply_markup=kb(msg.from_user.id) if i + 4000 >= len(text) else None)


# ============================================================
#  ОТЗЫВЫ
# ============================================================
@bot.callback_query_handler(func=lambda c: c.data.startswith("review_"))
def cb_review(call):
    parts  = call.data.split("_")
    bid    = int(parts[1])
    rating = int(parts[2])
    bot.answer_callback_query(call.id)
    try:
        bot.edit_message_reply_markup(call.message.chat.id, call.message.message_id, reply_markup=None)
    except Exception:
        pass
    user_state[call.message.chat.id] = {"step": "review_comment", "bid": bid, "rating": rating}
    bot.send_message(call.message.chat.id,
        "Спасибо за {} звезд!\n\n"
        "Оставьте комментарий или напишите нет:".format(rating))

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "review_comment")
def step_review(msg):
    state   = user_state.pop(msg.chat.id, {})
    bid     = state.get("bid")
    rating  = state.get("rating")
    comment = "" if msg.text.lower() in ("нет", "net", "no") else msg.text
    save_review(bid, msg.chat.id, rating, comment)
    bot.send_message(msg.chat.id,
        "Спасибо за отзыв!\n"
        "Будем рады видеть вас снова!{}".format(loyalty_info(msg.chat.id)),
        reply_markup=kb(msg.from_user.id))
    try:
        b = get_booking(bid)
        bot.send_message(ADMIN_CHAT_ID,
            "НОВЫЙ ОТЗЫВ\n\n"
            "{} | #{}\n{}\n"
            "Оценка: {} звезд\nКомментарий: {}".format(
                b["name"] if b else "?", bid,
                b["service"] if b else "?",
                rating, comment if comment else "-"))
    except Exception:
        pass


# ============================================================
#  АНАЛИТИКА — расширенная для владельца
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Аналитика" and is_owner(m.from_user.id))
def cmd_stats(msg):
    s = get_stats()

    # Выручка только по завершённым визитам (реальные деньги)
    rev7  = get_revenue(7)
    rev30 = get_revenue(30)
    rev90 = get_revenue(90)

    # Конверсия: завершённые / все заявки
    with db() as conn:
        total_all = conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
    conversion = "{:.0f}%".format(s["total"] / total_all * 100) if total_all else "—"

    # Топ мастеров
    master_stats = get_master_stats()
    masters_text = ""
    for ms in master_stats:
        avg_r   = "{:.1f}".format(ms["avg_r"]) if ms["avg_r"] else "нет"
        revenue = "  {:,} сом".format(ms["revenue"]) if ms.get("revenue") else ""
        masters_text += "  {} — {} виз.{} | рейтинг {}\n".format(
            ms["master"], ms["count"], revenue, avg_r)

    avg  = "{:.1f}".format(s["avg_r"]) if s["avg_r"] else "нет отзывов"
    tops = "\n".join("  {} - {} шт.".format(r[0], r[1]) for r in s["tops"]) if s["tops"] else "нет данных"

    # Waitlist и blacklist статистика (#3, #4)
    wl_stats = get_waitlist_stats()
    wl_text  = ""
    if wl_stats["total"] > 0:
        wl_text = "\nЛист ожидания: {} чел.\n".format(wl_stats["total"])
        for row in wl_stats["top_slots"]:
            wl_text += "  {} {} {} — {} чел.\n".format(
                row[0], row[1], row[2], row[3])
    bl_count = len(get_blacklist())
    bl_text  = "\nЧёрный список: {} клиентов\n".format(bl_count) if bl_count else ""

    text = (
        "Аналитика {}\n\n"
        "Клиентов: {} | Постоянных: {}\n"
        "Визитов сегодня: {} | За 7 дней: {}\n\n"
        "Статусы:\n"
        "  Завершено:    {}\n"
        "  Ожидает:      {}\n"
        "  Отменено:     {}\n"
        "  Не явились:   {}\n"
        "Конверсия: {}\n\n"
        "Выручка (только завершённые):\n"
        "  7 дней:  {:,} сом\n"
        "  30 дней: {:,} сом\n"
        "  90 дней: {:,} сом\n\n"
        "Топ услуги:\n{}\n\n"
        "Мастера:\n{}"
        "Средняя оценка: {}"
        "{}{}"
    ).format(
        BUSINESS_NAME,
        s["clients"], s["loyal"],
        s["today"], s["week"],
        s["total"], s["confirmed"], s["cancel"], s["no_show"],
        conversion,
        rev7, rev30, rev90,
        tops, masters_text, avg,
        wl_text, bl_text,
    )
    bot.send_message(msg.chat.id, text, reply_markup=kb(msg.from_user.id))


# ============================================================
#  ОТЗЫВЫ — просмотр с фильтрами
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Отзывы" and is_owner(m.from_user.id))
def cmd_reviews_menu(msg):
    markup = types.InlineKeyboardMarkup(row_width=1)
    markup.add(
        types.InlineKeyboardButton("Все отзывы",     callback_data="rev_filter_all"),
        types.InlineKeyboardButton("Только 5 звёзд", callback_data="rev_filter_5"),
        types.InlineKeyboardButton("Только 4+ звёзд",callback_data="rev_filter_4"),
    )
    # Добавляем фильтры по мастерам
    for mname in MASTERS.values():
        if mname != "Любой мастер":
            markup.add(types.InlineKeyboardButton(
                "Мастер: {}".format(mname),
                callback_data="rev_master_{}".format(mname)))
    bot.send_message(msg.chat.id, "Выберите фильтр отзывов:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("rev_filter_") or c.data.startswith("rev_master_"))
def cb_reviews_show(call):
    if not is_owner(call.from_user.id):
        return
    bot.answer_callback_query(call.id)

    if call.data.startswith("rev_master_"):
        master = call.data[11:]
        reviews = get_all_reviews_filtered(min_rating=1, master=master, limit=20)
        header  = "Отзывы мастера {}".format(master)
    elif call.data == "rev_filter_5":
        reviews = get_all_reviews_filtered(min_rating=5, limit=20)
        header  = "Отзывы 5 звёзд"
    elif call.data == "rev_filter_4":
        reviews = get_all_reviews_filtered(min_rating=4, limit=20)
        header  = "Отзывы 4+ звёзд"
    else:
        reviews = get_all_reviews_filtered(min_rating=1, limit=20)
        header  = "Все отзывы"

    if not reviews:
        bot.send_message(call.message.chat.id, "Отзывов не найдено.",
                         reply_markup=kb(call.from_user.id))
        return

    lines = ["{} ({})\n".format(header, len(reviews))]
    for r in reviews:
        stars   = r["rating"] * "*"
        comment = " — {}".format(r["comment"]) if r.get("comment") else ""
        lines.append("{} {} | {} | {}{}\n{}".format(
            stars, r.get("name", "?"), r.get("service", "?"),
            r.get("master", "?"), comment, r.get("created_at", "")))
        lines.append("---")

    text = "\n".join(lines)
    # Отправляем постранично если длинно
    for i in range(0, len(text), 4000):
        bot.send_message(call.message.chat.id, text[i:i+4000],
                         reply_markup=kb(call.from_user.id) if i + 4000 >= len(text) else None)


# ============================================================
#  ЭКСПОРТ CSV
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Экспорт" and is_owner(m.from_user.id))
def cmd_export_menu(msg):
    markup = types.InlineKeyboardMarkup(row_width=3)
    markup.add(
        types.InlineKeyboardButton("7 дней",  callback_data="csv_7"),
        types.InlineKeyboardButton("30 дней", callback_data="csv_30"),
        types.InlineKeyboardButton("90 дней", callback_data="csv_90"),
    )
    bot.send_message(msg.chat.id, "Выберите период для экспорта:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("csv_"))
def cb_export_csv(call):
    if not is_owner(call.from_user.id):
        return
    days   = int(call.data[4:])
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    bot.answer_callback_query(call.id, "Формирую CSV...")

    with db() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM bookings WHERE created_at >= ? ORDER BY date, time",
            (cutoff,)).fetchall()

    if not rows:
        bot.send_message(call.message.chat.id, "Нет данных за этот период.")
        return

    # Формируем CSV в памяти
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Дата", "Время", "Имя", "Телефон",
                     "Услуга", "Мастер", "Статус", "Сумма (сом)", "Комментарий", "Создано"])
    for r in rows:
        writer.writerow([
            r["id"], r["date"], r["time"], r["name"], r["phone"],
            r["service"], r["master"], r["status"],
            r["actual_amount"] or "", r["comment"] or "", r["created_at"],
        ])

    csv_bytes = output.getvalue().encode("utf-8-sig")  # utf-8-sig = Excel читает кириллицу
    filename  = "bookings_{}d_{}.csv".format(days, datetime.now().strftime("%d%m%Y"))

    bot.send_document(
        call.message.chat.id,
        (filename, csv_bytes),
        caption="Записи за {} дней: {} строк".format(days, len(rows)),
    )
# ============================================================
#  ЛИСТ ОЖИДАНИЯ — хендлеры
# ============================================================

# Клиент нажал «Уведомить если место освободится»
@bot.callback_query_handler(func=lambda c: c.data.startswith("wl_add_"))
def cb_wl_add(call):
    parts  = call.data[7:].split("_")
    date   = "{}.{}.{}".format(parts[0], parts[1], parts[2])
    master = " ".join(parts[3:]).replace("_", " ")
    client = get_client(call.message.chat.id)
    bot.answer_callback_query(call.id)
    # Если клиент уже известен — сразу показываем выбор времени
    if client:
        state   = user_state.get(call.message.chat.id, {})
        service = state.get("service", "")
        markup  = types.InlineKeyboardMarkup(row_width=3)
        for slot in ALL_SLOTS:
            markup.add(types.InlineKeyboardButton(
                slot,
                callback_data="wl_slot_{}_{}_{}".format(
                    date.replace(".", "_"),
                    slot.replace(":", "_"),
                    master.replace(" ", "_"))))
        bot.send_message(call.message.chat.id,
            "На какое время хотите встать в очередь?\n"
            "Мастер: {} | {}\n\n"
            "Выберите желаемый слот:".format(master, date),
            reply_markup=markup)
    else:
        # Новый клиент — спрашиваем имя и телефон
        user_state[call.message.chat.id] = {
            "step":       "wl_name",
            "wl_date":    date,
            "wl_master":  master,
        }
        bot.send_message(call.message.chat.id,
            "Введите ваше имя чтобы встать в лист ожидания:",
            reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "wl_name")
def step_wl_name(msg):
    if len(msg.text.strip()) < 2:
        bot.send_message(msg.chat.id, "Введите имя (минимум 2 символа).")
        return
    user_state[msg.chat.id].update({"wl_name": msg.text.strip(), "step": "wl_phone"})
    bot.send_message(msg.chat.id, "Введите номер телефона:")

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "wl_phone")
def step_wl_phone(msg):
    if not validate_phone(msg.text):
        bot.send_message(msg.chat.id,
            "Введите корректный номер. Пример: +996 700 123456")
        return
    state  = user_state.get(msg.chat.id, {})
    date   = state.get("wl_date", "")
    master = state.get("wl_master", "")
    name   = state.get("wl_name", "")
    phone  = msg.text.strip()
    # Показываем выбор времени
    markup = types.InlineKeyboardMarkup(row_width=3)
    for slot in ALL_SLOTS:
        markup.add(types.InlineKeyboardButton(
            slot,
            callback_data="wl_slot_{}_{}_{}".format(
                date.replace(".", "_"),
                slot.replace(":", "_"),
                master.replace(" ", "_"))))
    # Обновляем state с телефоном, не удаляем до выбора слота
    user_state[msg.chat.id] = {
        "step":      "wl_awaiting_slot",
        "wl_date":   date,
        "wl_master": master,
        "wl_name":   name,
        "wl_phone":  phone,
    }
    bot.send_message(msg.chat.id,
        "На какое время хотите встать в очередь?\n"
        "Мастер: {} | {}\n\n"
        "Выберите слот:".format(master, date),
        reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("wl_slot_"))
def cb_wl_slot(call):
    parts  = call.data[8:].split("_")
    date   = "{}.{}.{}".format(parts[0], parts[1], parts[2])
    time   = "{}:{}".format(parts[3], parts[4])
    master = " ".join(parts[5:]).replace("_", " ")
    # Данные клиента — из БД или из state (новый клиент)
    state  = user_state.pop(call.message.chat.id, {})
    client = get_client(call.message.chat.id)
    if state.get("wl_name"):
        name, phone = state["wl_name"], state["wl_phone"]
    elif client:
        name, phone = client["name"], client["phone"]
    else:
        bot.answer_callback_query(call.id, "Не удалось определить данные клиента.")
        return
    service = state.get("service", "")
    ok = add_to_waitlist(call.message.chat.id, name, phone, date, time, master, service)
    bot.answer_callback_query(call.id)
    if ok:
        bot.send_message(call.message.chat.id,
            "Вы в листе ожидания!\n\n"
            "{} {} | Мастер: {}\n\n"
            "Как только место освободится — мы сразу напишем.".format(
                date, time, master),
            reply_markup=kb(call.from_user.id))
    else:
        bot.send_message(call.message.chat.id,
            "Вы уже в листе ожидания на этот слот.",
            reply_markup=kb(call.from_user.id))

# Клиент получил уведомление и хочет записаться
@bot.callback_query_handler(func=lambda c: c.data.startswith("waitlist_book_"))
def cb_waitlist_book(call):
    parts  = call.data[14:].split("_")
    date   = "{}.{}.{}".format(parts[0], parts[1], parts[2])
    time   = "{}:{}".format(parts[3], parts[4])
    # Мастер закодирован начиная с parts[5] (может содержать пробелы)
    master = " ".join(parts[5:]).replace("_", " ") if len(parts) > 5 else "Любой мастер"
    bot.answer_callback_query(call.id)
    if is_slot_taken(date, time):
        bot.send_message(call.message.chat.id,
            "К сожалению, это время уже заняли.\n"
            "Запишитесь на другое время — нажмите «Записаться».",
            reply_markup=kb(call.from_user.id))
        return
    client = get_client(call.message.chat.id)
    if not client:
        user_state[call.message.chat.id] = {"step": "date"}
        bot.send_message(call.message.chat.id,
            "Записываемся!", reply_markup=date_picker_keyboard())
        return
    # Запускаем flow с шага услуги — имя, телефон, дата, время и мастер уже знаем
    user_state[call.message.chat.id] = {
        "step":   "service",
        "date":   date,
        "time":   time,
        "name":   client["name"],
        "phone":  client["phone"],
        "master": master,
    }
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    for s in SERVICES:
        m.add(s)
    bot.send_message(call.message.chat.id,
        "Место свободно! {} {} — {}\n\n"
        "Выберите услугу:".format(date, time, master),
        reply_markup=m)

# Клиент отказался от места в очереди
@bot.callback_query_handler(func=lambda c: c.data.startswith("waitlist_skip_"))
def cb_waitlist_skip(call):
    parts = call.data[14:].split("_")
    wl_id = int(parts[0])
    remove_from_waitlist(wl_id)
    bot.answer_callback_query(call.id, "Понято, место передадим следующему.")
    try:
        bot.edit_message_reply_markup(
            call.message.chat.id, call.message.message_id, reply_markup=None)
    except Exception:
        pass




# ============================================================
#  ЧЁРНЫЙ СПИСОК — хендлеры
# ============================================================

@bot.message_handler(func=lambda m: m.text == "Чёрный список" and is_admin(m.from_user.id))
@bot.message_handler(commands=["blacklist"])
def cmd_blacklist(msg):
    if not is_admin(msg.from_user.id):
        return
    bl = get_blacklist()
    if not bl:
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton(
            "Добавить клиента", callback_data="bl_add_start"))
        bot.send_message(msg.chat.id,
            "Чёрный список пуст.", reply_markup=markup)
        return
    markup = types.InlineKeyboardMarkup(row_width=1)
    lines  = ["Чёрный список ({}):\n".format(len(bl))]
    for c in bl:
        reason    = c["reason"] if c.get("reason") else "без причины"
        added_at  = c.get("added_at", "?")
        added_by  = c.get("added_by", 0)
        by_str    = " (admin {})".format(added_by) if added_by else ""
        lines.append("{} {}\nno_show: {} | {}\nДобавлен: {}{}\n".format(
            c["name"], c["phone"],
            c["no_show_count"], reason,
            added_at, by_str))
        markup.add(types.InlineKeyboardButton(
            "Разблокировать {}".format(c["name"]),
            callback_data="bl_remove_{}".format(c["chat_id"])))
    markup.add(types.InlineKeyboardButton(
        "Добавить клиента", callback_data="bl_add_start"))
    for chunk in ["\n".join(lines[i:i+20]) for i in range(0, len(lines), 20)]:
        bot.send_message(msg.chat.id, chunk, reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data == "bl_add_start")
def cb_bl_add_start(call):
    if not is_admin(call.from_user.id):
        return
    bot.answer_callback_query(call.id)
    user_state[call.message.chat.id] = {"step": "bl_search"}
    bot.send_message(call.message.chat.id,
        "Введите имя или телефон клиента для добавления в чёрный список:",
        reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "bl_search")
def step_bl_search(msg):
    user_state.pop(msg.chat.id, None)
    results = search_client(msg.text)
    if not results:
        bot.send_message(msg.chat.id, "Клиент не найден.", reply_markup=kb(msg.from_user.id))
        return
    # Показываем уникальных клиентов
    seen     = set()
    markup   = types.InlineKeyboardMarkup(row_width=1)
    for b in results:
        cid = b["chat_id"]
        # Пропускаем chat_id=0 (записи по звонку — нет Telegram-аккаунта)
        if cid == 0 or cid in seen:
            continue
        seen.add(cid)
        ns = get_client_no_show_count(cid)
        markup.add(types.InlineKeyboardButton(
            "{} {} | no_show: {}".format(b["name"], b["phone"], ns),
            callback_data="bl_confirm_{}".format(cid)))
    bot.send_message(msg.chat.id,
        "Выберите клиента для блокировки:", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("bl_confirm_"))
def cb_bl_confirm(call):
    if not is_admin(call.from_user.id):
        return
    target_cid = int(call.data[11:])
    # Получаем данные клиента из последней записи
    with db() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT name, phone FROM bookings WHERE chat_id=? ORDER BY id DESC LIMIT 1",
            (target_cid,)).fetchone()
    if not row:
        bot.answer_callback_query(call.id, "Клиент не найден.")
        return
    bot.answer_callback_query(call.id)
    user_state[call.from_user.id] = {
        "step":       "bl_reason",
        "target_cid": target_cid,
        "target_name": row["name"],
        "target_phone": row["phone"],
    }
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=1)
    markup.add("Систематические неявки", "Грубость", "Без причины")
    bot.send_message(call.message.chat.id,
        "Причина блокировки {} {}?\n"
        "Введите или выберите:".format(row["name"], row["phone"]),
        reply_markup=markup)

@bot.message_handler(func=lambda m: user_state.get(m.from_user.id, {}).get("step") == "bl_reason")
def step_bl_reason(msg):
    state = user_state.pop(msg.from_user.id, {})
    ns    = get_client_no_show_count(state["target_cid"])
    add_to_blacklist(
        state["target_cid"], state["target_name"], state["target_phone"],
        reason=msg.text, no_show_count=ns, added_by=msg.from_user.id)
    bot.send_message(msg.chat.id,
        "{} {} добавлен в чёрный список.\n"
        "Причина: {}".format(state["target_name"], state["target_phone"], msg.text),
        reply_markup=kb(msg.from_user.id))

@bot.callback_query_handler(func=lambda c: c.data.startswith("bl_remove_"))
def cb_bl_remove(call):
    if not is_admin(call.from_user.id):
        return
    target_cid = int(call.data[10:])
    remove_from_blacklist(target_cid)
    bot.answer_callback_query(call.id, "Клиент разблокирован.")
    try:
        bot.edit_message_text(
            "Клиент разблокирован.",
            call.message.chat.id, call.message.message_id)
    except Exception:
        pass


# ============================================================
#  ЗАПИСЬ ПО ЗВОНКУ — менеджер записывает клиента вручную
# ============================================================

@bot.message_handler(commands=["newbook"])
@bot.message_handler(func=lambda m: m.text == "Запись по звонку" and is_admin(m.from_user.id))
def cmd_newbook(msg):
    """Менеджер записывает клиента который позвонил."""
    if not is_admin(msg.from_user.id):
        return
    user_state[msg.chat.id] = {"step": "nb_name", "manual": True}
    bot.send_message(msg.chat.id,
        "Запись по звонку.\n\nШаг 1/6: Введите имя клиента:",
        reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_name")
def step_nb_name(msg):
    if len(msg.text.strip()) < 2:
        bot.send_message(msg.chat.id, "Введите имя (минимум 2 символа).")
        return
    user_state[msg.chat.id].update({"name": msg.text.strip(), "step": "nb_phone"})
    bot.send_message(msg.chat.id, "Шаг 2/6: Введите телефон:")

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_phone")
def step_nb_phone(msg):
    if not validate_phone(msg.text):
        bot.send_message(msg.chat.id,
            "Введите корректный номер. Пример: +996 700 123456")
        return
    user_state[msg.chat.id].update({"phone": msg.text.strip(), "step": "nb_date"})
    bot.send_message(msg.chat.id, "Шаг 3/6: Выберите дату:",
                     reply_markup=date_picker_keyboard())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_date")
def step_nb_date(msg):
    if msg.text == "Назад":
        user_state.pop(msg.chat.id, None)
        bot.send_message(msg.chat.id, "Отменено.", reply_markup=kb(msg.from_user.id))
        return
    try:
        raw = msg.text.replace("ДАТА ", "").strip().split(" ")[-1]
        sel = datetime.strptime(
            "{}.{}".format(raw, datetime.now().year), "%d.%m.%Y").strftime("%d.%m.%Y")
    except Exception:
        bot.send_message(msg.chat.id, "Выберите дату из списка.")
        return
    user_state[msg.chat.id].update({"date": sel, "step": "nb_master"})
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    for mname in MASTERS.values():
        m.add(mname)
    bot.send_message(msg.chat.id, "Шаг 4/6: Выберите мастера:", reply_markup=m)

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_master")
def step_nb_master(msg):
    if msg.text not in MASTERS.values():
        bot.send_message(msg.chat.id, "Выберите мастера из списка.")
        return
    date  = user_state[msg.chat.id]["date"]
    free  = free_slots(date, msg.text)
    if not free:
        bot.send_message(msg.chat.id,
            "У {} нет свободного времени. Выберите другого мастера.".format(msg.text))
        return
    user_state[msg.chat.id].update({"master": msg.text, "step": "nb_service"})
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    for s in SERVICES:
        m.add(s)
    bot.send_message(msg.chat.id, "Шаг 5/6: Выберите услугу:", reply_markup=m)

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_service")
def step_nb_service(msg):
    if msg.text not in SERVICES:
        bot.send_message(msg.chat.id, "Выберите из списка.")
        return
    date   = user_state[msg.chat.id]["date"]
    master = user_state[msg.chat.id]["master"]
    free   = free_slots(date, master)
    user_state[msg.chat.id].update({"service": msg.text, "step": "nb_time"})
    m = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=3)
    for s in free:
        m.add(s)
    bot.send_message(msg.chat.id, "Шаг 6/6: Выберите время:", reply_markup=m)

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_time")
def step_nb_time(msg):
    state  = user_state[msg.chat.id]
    date   = state["date"]
    master = state["master"]
    if msg.text not in free_slots(date, master):
        bot.send_message(msg.chat.id, "Это время занято. Выберите другое.")
        return
    user_state[msg.chat.id].update({"time": msg.text, "step": "nb_comment"})
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=1)
    markup.add("Без пожеланий")
    bot.send_message(msg.chat.id,
        "Время: {}\n\nПожелания клиента (или «Без пожеланий»):".format(msg.text),
        reply_markup=markup)

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "nb_comment")
def step_nb_comment(msg):
    state   = user_state.pop(msg.chat.id, {})
    comment = "" if msg.text == "Без пожеланий" else msg.text
    full_comment = "[Запись по звонку]" + (" " + comment if comment else "")
    bid = save_booking(
        state["name"], state["phone"], state["service"],
        state["master"], state["date"], state["time"],
        chat_id=0,
        comment=full_comment)
    update_status(bid, "confirmed")
    bot.send_message(msg.chat.id,
        "Запись создана и подтверждена!\n\n"
        "#{} | {} {}\n"
        "{} | Мастер: {}\n"
        "{} {}".format(
            bid, state["name"], state["phone"],
            state["service"], state["master"],
            state["date"], state["time"]),
        reply_markup=kb(msg.from_user.id))


# ============================================================
#  УПРАВЛЕНИЕ ФОТО МАСТЕРОВ
# ============================================================

@bot.message_handler(commands=["setmasterphoto"])
def cmd_setmasterphoto(msg):
    """Владелец устанавливает фото мастера."""
    if not is_owner(msg.from_user.id):
        return
    markup = types.InlineKeyboardMarkup(row_width=1)
    for mname in MASTER_PROFILES:
        markup.add(types.InlineKeyboardButton(
            mname, callback_data="smp_{}".format(mname)))
    bot.send_message(msg.chat.id,
        "Для какого мастера устанавливаем фото?", reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("smp_"))
def cb_smp_select(call):
    if not is_owner(call.from_user.id):
        return
    mname = call.data[4:]
    bot.answer_callback_query(call.id)
    user_state[call.message.chat.id] = {"step": "upload_master_photo", "master": mname}
    bot.send_message(call.message.chat.id,
        "Отправьте фото для мастера {}:".format(mname),
        reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(
    content_types=["photo"],
    func=lambda m: user_state.get(m.chat.id, {}).get("step") == "upload_master_photo")
def handle_master_photo(msg):
    state  = user_state.pop(msg.chat.id, None)
    mname  = state["master"] if state else None
    if not mname or mname not in MASTER_PROFILES:
        return
    file_id = msg.photo[-1].file_id
    save_master_photo(mname, file_id)
    MASTER_PROFILES[mname]["photo_id"] = file_id
    bot.send_message(msg.chat.id,
        "Фото мастера {} обновлено и сохранено!\n"
        "Теперь оно не потеряется при перезапуске бота.".format(mname),
        reply_markup=kb(msg.from_user.id))


# ============================================================
#  КНОПКИ МЕНЮ: Чёрный список (менеджер) — объединён с /blacklist выше
# ============================================================


# ============================================================
#  КНОПКА МЕНЮ: Мой лист ожидания (клиент) — #9
# ============================================================

@bot.message_handler(func=lambda m: m.text == "Мой лист ожидания")
def cmd_my_waitlist(msg):
    """Клиент смотрит на каких слотах стоит в очереди."""
    with db() as conn:
        conn.row_factory = sqlite3.Row
        rows = [dict(r) for r in conn.execute(
            "SELECT * FROM waitlist WHERE chat_id=? ORDER BY date, time",
            (msg.chat.id,)).fetchall()]
    if not rows:
        bot.send_message(msg.chat.id,
            "Вы не стоите ни в одном листе ожидания.",
            reply_markup=kb(msg.from_user.id))
        return
    markup = types.InlineKeyboardMarkup(row_width=1)
    lines  = ["Ваш лист ожидания:\n"]
    for r in rows:
        lines.append("{} {} | Мастер: {}".format(r["date"], r["time"], r["master"]))
        markup.add(types.InlineKeyboardButton(
            "Убрать из очереди: {} {}".format(r["date"], r["time"]),
            callback_data="wl_my_remove_{}_{}".format(
                r["date"].replace(".", "_"),
                r["time"].replace(":", "_"))))
    bot.send_message(msg.chat.id, "\n".join(lines), reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("wl_my_remove_"))
def cb_wl_my_remove(call):
    parts = call.data[13:].split("_")
    date  = "{}.{}.{}".format(parts[0], parts[1], parts[2])
    time  = "{}:{}".format(parts[3], parts[4])
    remove_client_from_waitlist(call.message.chat.id, date, time)
    bot.answer_callback_query(call.id, "Убрано из очереди.")
    try:
        bot.edit_message_text(
            "Вы убраны из очереди на {} {}.".format(date, time),
            call.message.chat.id, call.message.message_id)
    except Exception:
        pass


# ============================================================
#  КЛИЕНТ: Я ВЫЕЗЖАЮ (Уровень 1)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Я выезжаю")
def cmd_on_the_way(msg):
    """Клиент сообщает что выезжает - мастер получает уведомление."""
    today = today_str()
    with db() as conn:
        conn.row_factory = sqlite3.Row
        booking = conn.execute("""
            SELECT * FROM bookings 
            WHERE chat_id=? AND date=? AND status='confirmed'
        """, (msg.chat.id, today)).fetchone()
    
    if not booking:
        bot.send_message(msg.chat.id,
            "У вас нет подтверждённой записи на сегодня.",
            reply_markup=kb(msg.from_user.id))
        return
    
    booking = dict(booking)
    conn.execute("UPDATE bookings SET is_on_the_way=1 WHERE id=?", (booking["id"],))
    conn.commit()
    
    bot.send_message(msg.chat.id,
        "Отлично! Мы уведомили мастера {}.\n"
        "Ждём вас по адресу: {}".format(booking["master"], ADDRESS),
        reply_markup=kb(msg.from_user.id))
    
    try:
        bot.send_message(ADMIN_CHAT_ID,
            "🚗 КЛИЕНТ В ПУТИ\n\n"
            "{} выезжает на {} {} к мастеру {}\n"
            "Телефон: {}".format(
                booking["name"], booking["time"], booking["date"],
                booking["master"], booking["phone"]))
    except:
        pass


# ============================================================
#  ЧАТ С МЕНЕДЖЕРОМ (Уровень 2)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Написать менеджеру")
def cmd_chat_manager(msg):
    """Клиент начинает чат с менеджером."""
    user_state[msg.chat.id] = {"step": "chat_to_manager"}
    bot.send_message(msg.chat.id,
        "Напишите ваше сообщение для менеджера:",
        reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "chat_to_manager")
def handle_chat_to_manager(msg):
    """Пересылка сообщения менеджеру."""
    user_state.pop(msg.chat.id, None)
    
    # Форward менеджеру
    client = get_client(msg.chat.id)
    name = client["name"] if client else "Клиент"
    
    try:
        bot.send_message(ADMIN_CHAT_ID,
            "💬 СООБЩЕНИЕ ОТ КЛИЕНТА\n\n"
            "От: {} ({})\n\n"
            "Сообщение:\n{}".format(
                name, msg.chat.id, msg.text))
        
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton(
            "Ответить", callback_data="reply_client_{}".format(msg.chat.id)))
        
        bot.send_message(ADMIN_CHAT_ID,
            "Клиент ждёт ответа. Нажмите чтобы ответить:",
            reply_markup=markup)
    except:
        pass
    
    bot.send_message(msg.chat.id,
        "Сообщение отправлено менеджеру!\n"
        "Мы ответим вам в ближайшее время.",
        reply_markup=kb(msg.from_user.id))

@bot.message_handler(func=lambda m: m.text == "Написать клиенту" and is_admin(m.from_user.id))
def cmd_write_client(msg):
    """Менеджер начинает писать клиенту."""
    user_state[msg.chat.id] = {"step": "select_client_to_write"}
    bot.send_message(msg.chat.id,
        "Введите имя или телефон клиента:",
        reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "select_client_to_write")
def step_select_client_write(msg):
    """Выбор клиента для отправки сообщения."""
    user_state.pop(msg.chat.id, None)
    results = search_client(msg.text)
    
    if not results:
        bot.send_message(msg.chat.id, "Клиент не найден.",
                        reply_markup=kb(msg.from_user.id))
        return
    
    # Берём уникальных клиентов
    seen = set()
    markup = types.InlineKeyboardMarkup(row_width=1)
    for b in results:
        cid = b["chat_id"]
        if cid == 0 or cid in seen or not b.get("chat_id"):
            continue
        seen.add(cid)
        markup.add(types.InlineKeyboardButton(
            "{} {} ({})".format(b["name"], b["phone"], b.get("date", "")),
            callback_data="write_client_{}".format(cid)))
    
    bot.send_message(msg.chat.id,
        "Выберите кому отправить:",
        reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data.startswith("write_client_"))
def cb_write_client(call):
    cid = int(call.data[13:])
    client = get_client(cid)
    
    if not client:
        bot.answer_callback_query(call.id, "Клиент не найден")
        return
    
    bot.answer_callback_query(call.id)
    user_state[call.from_user.id] = {"step": "manager_msg_to_client", "target_cid": cid}
    bot.send_message(call.message.chat.id,
        "Сообщение для {} {}\n\nВведите текст:".format(
            client["name"], client["phone"]),
        reply_markup=types.ForceReply())

@bot.message_handler(func=lambda m: user_state.get(m.from_user.id, {}).get("step") == "manager_msg_to_client")
def step_manager_msg_to_client(msg):
    """Отправка сообщения клиенту."""
    state = user_state.pop(msg.from_user.id, {})
    target_cid = state.get("target_cid")
    
    if not target_cid:
        return
    
    try:
        bot.send_message(target_cid,
            "Сообщение от салона:\n\n{}".format(msg.text),
            reply_markup=kb(target_cid))
        bot.send_message(msg.chat.id,
            "Сообщение отправлено клиенту!",
            reply_markup=kb(msg.from_user.id))
    except Exception as e:
        bot.send_message(msg.chat.id,
            "Не удалось отправить. Возможно, клиент запретил боту писать.",
            reply_markup=kb(msg.from_user.id))


# ============================================================
#  МЕНЕДЖЕР: ДАШБОРД "КТО СЕГОДНЯ" (Уровень 1)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Кто сегодня" and is_admin(m.from_user.id))
def cmd_today_dashboard(msg):
    """Дашборд - кто придёт сегодня."""
    today = today_str()
    with db() as conn:
        conn.row_factory = sqlite3.Row
        rows = [dict(r) for r in conn.execute("""
            SELECT * FROM bookings 
            WHERE date=? AND status IN ('confirmed','pending')
            ORDER BY time
        """, (today,)).fetchall()]
    
    if not rows:
        bot.send_message(msg.chat.id, "На сегодня записей нет.",
                        reply_markup=kb(msg.from_user.id))
        return
    
    # Группируем по времени
    by_time = defaultdict(list)
    for b in rows:
        by_time[b["time"]].append(b)
    
    text = f"РАСПИСАНИЕ НА СЕГОДНЯ ({today})\n\n"
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    for time_slot in sorted(by_time.keys()):
        bookings = by_time[time_slot]
        text += f"🕐 {time_slot}\n"
        for b in bookings:
            icon = "⏳" if b["status"] == "pending" else "✅"
            way = "🚗" if b.get("is_on_the_way") else ""
            text += f"  {icon} {b['name']} | {b['service']} | {b['master']} {way}\n"
            markup.add(types.InlineKeyboardButton(
                f"Подтвердить {b['name']}",
                callback_data="quick_confirm_{}".format(b["id"])))
    
    text += f"\nИтого: {len(rows)} записей"
    
    # Кнопка подтвердить все
    markup.add(types.InlineKeyboardButton(
        "✅ Подтвердить все ожидающие",
        callback_data="confirm_all_pending"))
    
    bot.send_message(msg.chat.id, text, reply_markup=markup)

@bot.callback_query_handler(func=lambda c: c.data == "confirm_all_pending")
def cb_confirm_all_pending(call):
    """Bulk подтверждение всех ожидающих."""
    if not is_admin(call.from_user.id):
        return
    
    today = today_str()
    with db() as conn:
        conn.execute(
            "UPDATE bookings SET status='confirmed' WHERE date=? AND status='pending'",
            (today,))
        conn.commit()
        count = conn.execute(
            "SELECT COUNT(*) FROM bookings WHERE date=? AND status='confirmed'",
            (today,)).fetchone()[0]
    
    bot.answer_callback_query(call.id, "Подтверждено {} записей!".format(count))
    cmd_today_dashboard(call.message)

@bot.callback_query_handler(func=lambda c: c.data.startswith("quick_confirm_"))
def cb_quick_confirm(call):
    """Быстрое подтверждение из дашборда."""
    if not is_admin(call.from_user.id):
        return
    
    bid = int(call.data[15:])
    update_status(bid, "confirmed")
    bot.answer_callback_query(call.id, "Подтверждено!")
    cmd_today_dashboard(call.message)


# ============================================================
#  ЗАМЕТКИ НА КЛИЕНТА (Уровень 1)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Заметки о клиенте" and is_admin(m.from_user.id))
def cmd_client_notes(msg):
    """Просмотр/редактирование заметок о клиенте."""
    user_state[msg.chat.id] = {"step": "notes_find_client"}
    bot.send_message(msg.chat.id,
        "Введите имя или телефон клиента:",
        reply_markup=types.ReplyKeyboardRemove())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "notes_find_client")
def step_notes_find(msg):
    """Поиск клиента для заметок."""
    results = search_client(msg.text)
    if not results:
        bot.send_message(msg.chat.id, "Клиент не найден.",
                        reply_markup=kb(msg.from_user.id))
        user_state.pop(msg.chat.id, None)
        return
    
    seen = set()
    markup = types.InlineKeyboardMarkup(row_width=1)
    for b in results:
        cid = b["chat_id"]
        if cid == 0 or cid in seen:
            continue
        seen.add(cid)
        markup.add(types.InlineKeyboardButton(
            "{} {}".format(b["name"], b["phone"]),
            callback_data="edit_notes_{}".format(cid)))
    
    bot.send_message(msg.chat.id,
        "Выберите клиента:",
        reply_markup=markup)
    user_state.pop(msg.chat.id, None)

@bot.callback_query_handler(func=lambda c: c.data.startswith("edit_notes_"))
def cb_edit_notes(call):
    cid = int(call.data[11:])
    client = get_client(cid)
    
    if not client:
        bot.answer_callback_query(call.id, "Клиент не найден")
        return
    
    notes = client.get("notes", "") or ""
    
    user_state[call.from_user.id] = {"step": "save_notes", "target_cid": cid}
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id,
        "{} {}\n\nТекущие заметки:\n{}\n\n"
        "Введите новые заметки:".format(
            client["name"], client["phone"], notes or "(нет)"),
        reply_markup=types.ForceReply())

@bot.message_handler(func=lambda m: user_state.get(m.from_user.id, {}).get("step") == "save_notes")
def step_save_notes(msg):
    """Сохранение заметок."""
    state = user_state.pop(msg.from_user.id, {})
    cid = state.get("target_cid")
    
    if cid:
        update_client_notes(cid, msg.text)
        bot.send_message(msg.chat.id,
            "Заметки сохранены!",
            reply_markup=kb(msg.from_user.id))


# ============================================================
#  ШАБЛОНЫ ОТВЕТОВ (Уровень 2)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Шаблоны" and is_admin(m.from_user.id))
def cmd_templates(msg):
    """Список шаблонов для быстрых ответов."""
    markup = types.InlineKeyboardMarkup(row_width=1)
    for name, text in RESPONSE_TEMPLATES.items():
        short = text[:40] + "..." if len(text) > 40 else text
        markup.add(types.InlineKeyboardButton(
            f"{name}: {short}",
            callback_data="use_template_{}".format(name)))
    
    bot.send_message(msg.chat.id,
        "Выберите шаблон для отправки последнему клиенту\n"
        "(или используйте /send_template <имя>):",
        reply_markup=markup)

@bot.message_handler(commands=["send_template"])
def cmd_send_template(msg):
    """Отправка шаблона: /send_template welcome"""
    if not is_admin(msg.from_user.id):
        return
    
    parts = msg.text.split()
    if len(parts) < 2:
        bot.send_message(msg.chat.id,
            "Использование: /send_template <имя_шаблона>\n"
            "Доступные: " + ", ".join(RESPONSE_TEMPLATES.keys()))
        return
    
    template_name = parts[1]
    if template_name not in RESPONSE_TEMPLATES:
        bot.send_message(msg.chat.id, "Шаблон не найден.")
        return
    
    # Просим ввести телефон клиента
    user_state[msg.chat.id] = {"step": "template_phone", "template": template_name}
    bot.send_message(msg.chat.id,
        "Введите телефон клиента:",
        reply_markup=types.ForceReply())

@bot.message_handler(func=lambda m: user_state.get(m.chat.id, {}).get("step") == "template_phone")
def step_template_phone(msg):
    """Поиск клиента для шаблона."""
    state = user_state.pop(msg.chat.id, {})
    template_name = state.get("template")
    
    # Ищем клиента по телефону
    with db() as conn:
        row = conn.execute(
            "SELECT chat_id, name FROM clients WHERE phone LIKE ?",
            ("%{}%".format(msg.text),)).fetchone()
    
    if not row:
        bot.send_message(msg.chat.id,
            "Клиент не найден.",
            reply_markup=kb(msg.from_user.id))
        return
    
    cid, name = row[0], row[1]
    template = RESPONSE_TEMPLATES[template_name].format(BUSINESS_NAME)
    
    try:
        bot.send_message(cid, template)
        bot.send_message(msg.chat.id,
            "Шаблон отправлен клиенту {}!".format(name),
            reply_markup=kb(msg.from_user.id))
    except Exception as e:
        bot.send_message(msg.chat.id,
            "Не удалось отправить: {}".format(e),
            reply_markup=kb(msg.from_user.id))


# ============================================================
#  ПРИЧИНЫ ОТМЕНЫ (Уровень 2)
# ============================================================
def get_cancel_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    for reason in CANCEL_REASONS:
        markup.add(types.InlineKeyboardButton(reason, callback_data="cancel_reason_" + reason))
    return markup

@bot.callback_query_handler(func=lambda c: c.data.startswith("cancel_reason_"))
def cb_cancel_reason(call):
    """Выбор причины отмены."""
    bid = int(call.data.split("_")[-1]) if "_" in call.data else 0
    if not bid:
        return
    
    reason = call.data.replace("cancel_reason_", "")
    
    with db() as conn:
        conn.execute(
            "UPDATE bookings SET cancel_reason=? WHERE id=?",
            (reason, bid))
        conn.commit()
    
    bot.answer_callback_query(call.id, "Причина сохранена!")
    cb_decline(call) if call.data.find("decline_") > -1 else None


# ============================================================
#  KPI МАСТЕРОВ (Уровень 2)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "KPI мастеров" and is_owner(m.from_user.id))
def cmd_master_kpi(msg):
    text = get_master_kpi_text()
    bot.send_message(msg.chat.id, text, reply_markup=kb(msg.from_user.id))


# ============================================================
#  ПРОГНОЗ ВЫРУЧКИ (Уровень 2)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "Прогноз" and is_owner(m.from_user.id))
def cmd_forecast(msg):
    text = get_forecast_text()
    bot.send_message(msg.chat.id, text, reply_markup=kb(msg.from_user.id))


# ============================================================
#  RFM АНАЛИТИКА (Уровень 1)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "RFM" and is_owner(m.from_user.id))
def cmd_rfm(msg):
    text = get_rfm_report()
    bot.send_message(msg.chat.id, text, reply_markup=kb(msg.from_user.id))


# ============================================================
#  EMAIL ОТЧЁТ (Уровень 1)
# ============================================================
@bot.message_handler(func=lambda m: m.text == "EMAIL отчёт" and is_owner(m.from_user.id))
def cmd_email_report(msg):
    if not EMAIL_SMTP_HOST:
        bot.send_message(msg.chat.id,
            "Email не настроен. Добавьте в .env:\n"
            "EMAIL_SMTP_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_TO",
            reply_markup=kb(msg.from_user.id))
        return
    
    if send_daily_email():
        bot.send_message(msg.chat.id,
            "✅ Отчёт отправлен на email!",
            reply_markup=kb(msg.from_user.id))
    else:
        bot.send_message(msg.chat.id,
            "❌ Ошибка отправки. Проверьте настройки.",
            reply_markup=kb(msg.from_user.id))


# ============================================================
#  АНАЛИТИКА WAITLIST В ДАЙДЖЕСТЕ — #3
# (данные о листе ожидания в get_stats для владельца)
# ============================================================

def get_waitlist_stats() -> dict:
    """Статистика листа ожидания — самые желанные слоты."""
    with db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM waitlist").fetchone()[0]
        top_slots = conn.execute(
            "SELECT date, time, master, COUNT(*) cnt FROM waitlist"
            " GROUP BY date, time, master ORDER BY cnt DESC LIMIT 3").fetchall()
    return {"total": total, "top_slots": top_slots}

# ============================================================
#  ЗАПУСК
# ============================================================
if __name__ == "__main__":
    logger.info("Инициализация базы данных (%s)...", DB_FILE)
    init_db()
    migrate_db()
    logger.info("БД готова (версия %d)", DB_VERSION)
    load_master_photos()  # загружаем фото мастеров из БД в память
    logger.info("Запуск планировщика напоминаний...")
    threading.Thread(target=run_reminders, daemon=True).start()
    logger.info("Бот '%s' v12.0 запущен. Ctrl+C для остановки.", BUSINESS_NAME)
    bot.infinity_polling()
