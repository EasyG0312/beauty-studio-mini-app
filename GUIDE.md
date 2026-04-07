# 📖 Beauty Studio — Полная Документация

> Telegram Mini App для салона красоты "Beauty Studio Bishkek" (г. Бишкек, Кыргызстан)
> Онлайн-запись, CRM, аналитика, программа лояльности

---

## 📑 ОГЛАВЛЕНИЕ

1. [Описание проекта](#описание-проекта)
2. [Стек технологий](#стек-технологий)
3. [Структура проекта](#структура-проекта)
4. [Быстрый старт](#быстрый-старт)
5. [Деплой (Production)](#деплой-production)
6. [Функционал по ролям](#функционал-по-ролям)
7. [API Endpoints](#api-endpoints)
8. [База данных](#база-данных)
9. [Дизайн-система](#дизайн-система)
10. [История разработки](#история-разработки)
11. [Чек-лист запуска](#чек-лист-запуска)
12. [Тестирование](#тестирование)
13. [Troubleshooting](#troubleshooting)

---

## ОПИСАНИЕ ПРОЕКТА

**Beauty Studio** — это Telegram Mini App (WebApp) для управления салоном красоты.

**Возможности:**
- 📅 Онлайн-запись на услуги (мастер, дата, время)
- 💬 Чат с менеджером
- ⭐ Отзывы и портфолио работ
- 📋 Лист ожидания
- 👑 Программа лояльности (5 визитов = скидка 10%)
- 📊 Аналитика для владельца (KPI, RFM, тепловая карта)
- 🎫 Промокоды
- 🔔 Напоминания о записях (3 дня, 1 день, 1 час)

---

## СТЕК ТЕХНОЛОГИЙ

| Компонент | Технологии |
|-----------|-----------|
| **Backend** | FastAPI, SQLAlchemy (async), APScheduler, PyJWT |
| **Frontend** | React 18, TypeScript, Vite, Zustand, Recharts |
| **Telegram** | pyTelegramBotAPI, Telegram WebApp SDK |
| **База данных** | SQLite (dev) / PostgreSQL (prod) |
| **Деплой** | Render (backend), Vercel (frontend) |

---

## СТРУКТУРА ПРОЕКТА

```
telega bot/
├── backend/                    # FastAPI REST API
│   ├── app/
│   │   ├── main.py            # Все API эндпоинты (~2000 строк)
│   │   ├── models.py          # SQLAlchemy модели (14 таблиц)
│   │   ├── schemas.py         # Pydantic схемы
│   │   ├── config.py          # Настройки (.env)
│   │   ├── database.py        # Async SQLAlchemy engine
│   │   └── services/
│   │       ├── notification_service.py   # Telegram уведомления
│   │       ├── scheduler.py              # APScheduler задачи
│   │       └── telegram_file_service.py  # Загрузка фото
│   ├── .env                   # Переменные окружения
│   ├── requirements.txt       # Python зависимости
│   └── salon.db               # SQLite база (авто-создаётся)
│
├── frontend/                   # React SPA (Telegram WebApp)
│   ├── src/
│   │   ├── App.tsx            # Роутинг (17 страниц)
│   │   ├── pages/             # Страницы приложения
│   │   ├── components/        # UI компоненты (7 шт)
│   │   ├── services/api.ts    # API клиент (axios)
│   │   ├── store/             # Zustand stores (auth, booking)
│   │   ├── types/             # TypeScript интерфейсы
│   │   └── index.css          # Дизайн-система (~800 строк)
│   ├── package.json
│   └── vercel.json            # Vercel конфиг
│
├── telegram_bot/               # Бот-оболочка для Mini App
│   ├── bot.py                 # pyTelegramBotAPI
│   ├── .env                   # Токен бота
│   └── requirements.txt
│
├── tools/                      # Утилиты
│   ├── run_tests.py           # Автотесты API (23 теста)
│   ├── test_db.py             # Тест БД
│   ├── migrate_db.py          # Миграция БД
│   ├── debug_bookings.py      # Отладка записей
│   ├── health_check.py        # Проверка прода
│   └── TEST_REPORT.md         # Отчёт тестирования
│
├── ROLES_AND_FUNCTIONS.md      # Полное описание ролей с UI мокапами
├── DEVELOPMENT_PLAN.md         # План разработки (8 этапов)
├── FINAL_CHECKLIST.md          # Чек-лист запуска
└── RELEASE_NOTES.md            # История релизов
```

---

## БЫСТРЫЙ СТАРТ

### 1. Backend

```bash
cd backend
# Создание виртуального окружения (рекомендуется):
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt

# Создание .env (скопируйте .env.example и заполните):
copy .env.example .env

# Запуск:
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Откроется на http://localhost:5173
```

### 3. Telegram Bot

```bash
cd telegram_bot
pip install -r requirements.txt

# Создание .env (скопируйте .env.example и заполните):
copy .env.example .env

# Запуск:
python bot.py
```

### 4. Настройка Telegram

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите `BOT_TOKEN`
3. Установите Menu Button:
   ```
   /setmenubutton @YourBotName https://your-frontend-url.vercel.app Открыть приложение
   ```

---

## ДЕПЛОЙ (PRODUCTION)

### Backend — Render.com

1. Создайте аккаунт на [Render.com](https://render.com)
2. Подключите GitHub репозиторий
3. Создайте **Web Service**:
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Добавьте **PostgreSQL** базу (free tier)
5. Установите переменные окружения:
   ```
   BOT_TOKEN=your_bot_token
   ADMIN_CHAT_ID=your_chat_id
   ADMIN_IDS=338067005
   OWNER_IDS=338067005
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=random_secret_string_here
   JWT_ALGORITHM=HS256
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

### Frontend — Vercel

1. Установите Vercel CLI: `npm i -g vercel`
2. В директории frontend: `vercel`
3. Установите env variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

### Альтернативы

| Хостинг | Backend | Frontend |
|---------|---------|----------|
| **Render** | ✅ Free tier | ❌ |
| **Railway** | ✅ $5/mo | ❌ |
| **Koyeb** | ✅ Free tier | ❌ |
| **Fly.io** | ✅ 3 VM free | ❌ |
| **Vercel** | ❌ | ✅ Free |
| **Netlify** | ❌ | ✅ Free |
| **GitHub Pages** | ❌ | ✅ Free |

---

## ФУНКЦИОНАЛ ПО РОЛЯМ

### 🙍‍♀️ КЛИЕНТ (11 функций)

| Функция | Описание |
|---------|----------|
| 📅 Запись на услугу | 6 шагов: дата → мастер → услуга → время → данные → подтверждение |
| 📋 Мои записи | Активные + история, перенос/отмена |
| 💇 Услуги и цены | Прайс-лист по категориям |
| ⭐ Отзывы | Просмотр, фильтрация, создание |
| 📸 Портфолио | Фото работ с категориями |
| ❓ FAQ | Частые вопросы |
| 📋 Лист ожидания | Уведомление при освобождении слота |
| 💬 Чат с менеджером | Двусторонняя связь |
| 👑 Лояльность | 5 визитов = скидка 10% |
| 🔔 Уведомления | Напоминания о записях |
| 📞 Контакты | Адрес, телефон, часы работы |

### 👨‍💼 МЕНЕДЖЕР (7 функций)

| Функция | Описание |
|---------|----------|
| 📊 Дашборд | Записи на сегодня, статистика |
| ✅ Подтверждение | Подтвердить/отменить/перенести |
| 👥 Клиенты | Список, заметки, история |
| 💬 Чат | Ответы клиентам + шаблоны |
| 📋 Лист ожидания | Управление очередью |
| 📝 Завершение визита | Ввод суммы чека |
| 🚫 Чёрный список | Блокировка клиентов |

### 👑 ВЛАДЕЛЕЦ (6 функций)

| Функция | Описание |
|---------|----------|
| 📊 Аналитика | Выручка, конверсия, средний чек |
| 🏆 KPI мастеров | Рейтинг, конверсия, отмены |
| 📈 RFM сегментация | Champions, Loyal, At Risk, Lost |
| 🗺️ Тепловая карта | Загруженность по дням/часам |
| 💰 Прогноз выручки | На 7/30 дней |
| 📥 Экспорт CSV | Все данные за период |

---

## API ENDPOINTS

### Auth
- `POST /api/auth/telegram` — Telegram WebApp auth

### Bookings
- `GET /api/bookings` — Список записей (фильтры: status, date, master, service)
- `GET /api/bookings/{id}` — Конкретная запись
- `POST /api/bookings` — Создать запись
- `PUT /api/bookings/{id}` — Обновить запись
- `DELETE /api/bookings/{id}` — Отменить запись

### Slots
- `GET /api/slots/{date}` — Доступные слоты на дату

### Clients
- `GET /api/clients` — Все клиенты
- `GET /api/clients/{chat_id}` — Конкретный клиент
- `PUT /api/clients/{chat_id}` — Обновить клиента
- `GET /api/clients/{chat_id}/loyalty` — Статус лояльности

### Reviews
- `GET /api/reviews` — Список отзывов
- `POST /api/reviews` — Создать отзыв

### Portfolio
- `GET /api/portfolio` — Все работы
- `GET /api/portfolio/by-service/{service}` — По категории
- `POST /api/portfolio` — Добавить работу

### Analytics
- `GET /api/analytics/summary` — Сводка
- `GET /api/analytics/dashboard` — Дашборд
- `GET /api/analytics/kpi` — KPI мастеров
- `GET /api/analytics/rfm` — RFM сегментация
- `GET /api/analytics/forecast` — Прогноз выручки
- `GET /api/analytics/funnel` — Воронка конверсии
- `GET /api/analytics/heatmap` — Тепловая карта
- `GET /api/analytics/comparison` — Сравнение периодов
- `GET /api/analytics/export/csv` — Экспорт данных

### Chat
- `GET /api/chat/{chat_id}` — История чата
- `POST /api/chat` — Отправить сообщение

### Waitlist
- `GET /api/waitlist` — Лист ожидания
- `POST /api/waitlist` — Добавить в лист
- `DELETE /api/waitlist/{id}` — Удалить из листа

### Blacklist
- `GET /api/blacklist` — Чёрный список
- `POST /api/blacklist` — Добавить
- `DELETE /api/blacklist/{chat_id}` — Удалить

### Promocodes
- `GET /api/promocodes` — Список промокодов
- `POST /api/promocodes` — Создать
- `POST /api/promocodes/validate` — Валидация
- `PUT /api/promocodes/{id}` — Обновить
- `DELETE /api/promocodes/{id}` — Удалить

### Master Schedule
- `GET /api/masters/schedule` — Расписание мастеров
- `POST /api/masters/schedule` — Создать расписание
- `PUT /api/masters/schedule/{id}` — Обновить
- `DELETE /api/masters/schedule/{id}` — Удалить
- `GET /api/masters/time-off` — Периоды отсутствия
- `POST /api/masters/time-off` — Добавить отсутствие
- `GET /api/masters/{master}/availability` — Доступность мастера

---

## БАЗА ДАННЫХ

### 14 таблиц

| Таблица | Описание |
|---------|----------|
| `bookings` | Записи клиентов (20+ полей) |
| `clients` | Профили клиентов + RFM + лояльность |
| `reviews` | Отзывы с рейтингом |
| `portfolio` | Фото работ с категориями |
| `master_photos` | Фото мастеров |
| `waitlist` | Лист ожидания |
| `blacklist` | Чёрный список |
| `chat_messages` | Сообщения чата |
| `notifications` | Уведомления/напоминания |
| `blocked_slots` | Заблокированные слоты |
| `master_schedules` | Расписание мастеров |
| `master_time_off` | Отпуска/больничные |
| `bot_settings` | Настройки бота |
| `promo_codes` | Промокоды |

### Миграции

При обновлении модели запустите:
```bash
python tools/migrate_db.py
```

---

## ДИЗАЙН-СИСТЕМА

### Цвета

```css
--primary: #E91E8C;        /* Pink — основной */
--primary-light: #F472B6;
--primary-dark: #BE185D;
--accent: #8B5CF6;         /* Purple — акцент */
--gold: #F59E0B;           /* Gold — премиум */
--success: #10B981;        /* Emerald — успех */
--danger: #EF4444;         /* Red — ошибка */
```

### Компоненты

- **Button**: primary, secondary, danger, ghost
- **Card**: interactive, elevated, bordered
- **Input**: с иконками, ошибками
- **Badge**: pending/confirmed/cancelled/completed
- **EmptyState**: для пустых страниц
- **Loading**: спиннер

### Стиль

- Glassmorphism (backdrop-filter blur)
- Градиенты (pink → purple)
- Spring-анимации
- Apple-style минимализм
- Dark theme поддержка

### Просмотр дизайна

1. Откройте `frontend/design-preview.html` в браузере
2. Запустите `npm run dev` и откройте http://localhost:5173
3. Откройте через Telegram WebApp

---

## ИСТОРИЯ РАЗРАБОТКИ

### ✅ Завершённые этапы

| Этап | Что сделано |
|------|-------------|
| **1.1** | Валидация телефона, лояльность, перенос записи, blacklist, сортировка |
| **1.2** | APScheduler, уведомления (3d/1d/1h), фоновые задачи |
| **1.3** | Портфолио с категориями, загрузка фото, lightbox |
| **2.2** | Аналитика (6 графиков), воронка, тепловая карта, экспорт CSV, RFM |
| **3.3** | Расписание мастеров, периоды отсутствия, календарь доступности |

### 📅 Roadmap

| Этап | План |
|------|------|
| **4.0** | Mobile app (React Native / Flutter) |
| **5.0** | Интеграция с Google Calendar |
| **6.0** | Онлайн-оплата (Visa, Элкарт) |
| **7.0** | AI рекомендации услуг |

---

## ЧЕК-ЛИСТ ЗАПУСКА

### Пред-деплой
- [ ] Все тесты пройдены (`python tools/run_tests.py`)
- [ ] Миграции БД применены
- [ ] `.env` файлы заполнены
- [ ] Frontend собран (`npm run build`)

### Деплой
- [ ] Backend на Render (health check: `/health`)
- [ ] Frontend на Vercel
- [ ] Telegram Bot запущен
- [ ] Menu Button настроен через @BotFather

### Тестирование
- [ ] Запись на услугу работает
- [ ] Уведомления приходят
- [ ] Чат работает
- [ ] Аналитика показывает данные

### Пост-деплой
- [ ] UptimeRobot мониторинг настроен
- [ ] Логи проверяются
- [ ] Бэкапы БД настроены

---

## ТЕСТИРОВАНИЕ

### Запуск автотестов

```bash
# Убедитесь что backend запущен на :8000
python tools/run_tests.py
```

### Результат последнего теста

| Метрика | Значение |
|---------|----------|
| **Всего тестов** | 23 |
| **✅ Пройдено** | 22 (95.7%) |
| **⚠️ Предупреждения** | 1 (409 Conflict — норма) |
| **❌ Критических** | 0 |

### Что тестируется

- Health check, API docs
- CRUD записей
- Клиенты, отзывы, портфолио
- Лист ожидания, чат, лояльность
- Аналитика (KPI, RFM, heatmap, forecast)
- Расписание мастеров

---

## TROUBLESHOOTING

### Backend не запускается

```bash
# Проверите что порт свободен
netstat -ano | findstr :8000

# Проверите .env файл
type backend\.env

# Проверите БД
python tools/test_db.py
```

### 500 Internal Server Error

```bash
# Запустите миграцию БД
python tools/migrate_db.py

# Проверите таблицы
python tools/debug_bookings.py
```

### Frontend не подключается к API

```bash
# Проверите .env
type frontend\.env

# Должно быть: VITE_API_URL=https://your-backend.onrender.com
```

### Telegram Bot не отвечает

```bash
# Проверите токен в .env
type telegram_bot\.env

# Проверите логи
type telegram_bot\bot.log
```

### CORS ошибки

```
# В backend/.env установите:
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
```

---

## РЕЛИЗЫ

### v1.0 — Текущая версия

**Новое:**
- ✅ Telegram-уведомления
- ✅ Загрузка реальных фото мастеров
- ✅ Промокоды
- ✅ RFM-сегментация
- ✅ Тепловая карта загруженности
- ✅ Прогноз выручки

**Известные проблемы:**
- Нет онлайн-оплаты
- Нет push-уведомлений вне Telegram

---

## КОНТАКТЫ

- **Адрес:** г. Бишкек, ул. Ахунбаева, 1
- **Телефон:** +996 707 001112
- **Часы:** Пн-Сб: 09:00 - 20:00

---

> 📅 **Дата обновления:** 08.04.2026
> 📝 **Версия документа:** 2.0 (консолидированная)
