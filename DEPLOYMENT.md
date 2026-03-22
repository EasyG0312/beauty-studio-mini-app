# Telegram Mini App для салона красоты

## 📋 Обзор

Это Telegram Mini App (TMA) для онлайн-записи в салон красоты с полной миграцией функционала существующего бота.

## 🏗 Архитектура

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Telegram      │────▶│   Frontend       │────▶│   Backend       │
│   Mini App      │     │   (React + TS)   │     │   (FastAPI)     │
│   (Webview)     │◀────│   Vite           │◀────│   SQLAlchemy    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                         ┌──────────────────┐     ┌─────────────────┐
                         │   Vercel         │     │   SQLite/       │
                         │   (Hosting)      │     │   PostgreSQL    │
                         └──────────────────┘     └─────────────────┘
```

## 🚀 Быстрый старт

### 1. Настройка бэкенда

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac
```

Отредактируйте `.env`:
- `BOT_TOKEN` — токен от @BotFather
- `ADMIN_CHAT_ID`, `ADMIN_IDS`, `OWNER_IDS` — ваши ID
- `JWT_SECRET` — любой секретный ключ

Запуск:
```bash
uvicorn app.main:app --reload
```

### 2. Настройка фронтенда

```bash
cd frontend
npm install
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac
```

Запуск dev-сервера:
```bash
npm run dev
```

### 3. Деплой на Vercel

```bash
cd frontend

# Установите Vercel CLI
npm install -g vercel

# Логин
vercel login

# Деплой
vercel --prod
```

После деплоя Vercel выдаст URL вида `https://your-app.vercel.app`.

### 4. Интеграция с Telegram

1. Откройте @BotFather
2. Отправьте `/mybots` → выберите вашего бота
3. Bot Settings → Menu Button → Configure Menu Button
4. Отправьте URL вашего приложения (из Vercel)
5. Введите название кнопки, например "Записаться"

Или создайте новое Mini App:
```
/newapp
```

## 📱 Функционал

### Для клиентов
- ✅ Запись на услугу (6 шагов)
- ✅ Выбор даты, мастера, времени
- ✅ Просмотр активных записей
- ✅ История визитов
- ✅ Отмена/перенос записи
- ✅ Услуги и цены

### Для менеджеров
- ✅ Дашборд "Кто сегодня"
- ✅ Подтверждение записей
- ✅ Bulk-операции
- ✅ Завершение визита (ввод суммы)
- ✅ Отметка no-show

### Для владельцев
- ✅ Аналитика выручки (7/30 дней)
- ✅ Статистика по клиентам
- ✅ Рейтинг салона
- ✅ KPI мастеров (в разработке)
- ✅ RFM-сегментация (в разработке)

## 🔐 Авторизация

Приложение использует Telegram WebApp initData для авторизации:

1. Пользователь открывает Mini App
2. Фронтенд получает `initData` от Telegram
3. Отправляет данные на бэкенд
4. Бэкенд проверяет hash через токен бота
5. Возвращает JWT токен
6. Токен сохраняется в localStorage

## 🗂 Структура проекта

```
telega-bot/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI приложение
│   │   ├── config.py        # Настройки
│   │   ├── database.py      # DB подключение
│   │   ├── models.py        # SQLAlchemy модели
│   │   ├── schemas.py       # Pydantic схемы
│   │   └── ...
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Главный компонент
│   │   ├── main.tsx         # Точка входа
│   │   ├── components/      # UI компоненты
│   │   ├── pages/           # Страницы
│   │   ├── services/        # API клиент
│   │   ├── store/           # Zustand store
│   │   └── types/           # TypeScript типы
│   ├── package.json
│   └── vercel.json
│
├── telegram_bot/            # Старый бот (можно удалить)
│   └── telegram_bot_v12.py
│
├── salon.db                 # База данных
└── README.md
```

## 🛠 Стек технологий

| Компонент | Технология |
|-----------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | Telegram WebApp SDK, кастомные стили |
| State | Zustand |
| Routing | React Router v6 |
| Backend | FastAPI, Python 3.10+ |
| ORM | SQLAlchemy (async) |
| Validation | Pydantic v2 |
| Auth | JWT, Telegram initData |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Deploy | Vercel |

## 📊 API Endpoints

### Auth
- `POST /api/auth/telegram` — авторизация через Telegram

### Bookings
- `GET /api/bookings` — список записей
- `GET /api/bookings/{id}` — конкретная запись
- `POST /api/bookings` — создать запись
- `PUT /api/bookings/{id}` — обновить запись
- `DELETE /api/bookings/{id}` — удалить запись

### Slots
- `GET /api/slots/{date}` — доступные слоты

### Analytics
- `GET /api/analytics/summary` — сводная аналитика

## 🔧 Миграция данных из старого бота

Данные из `salon.db` совместимы. Просто скопируйте файл базы данных в папку backend.

## 🚧 В разработке

- [ ] KPI мастеров (детальный отчёт)
- [ ] RFM-сегментация клиентов
- [ ] Чат с менеджером
- [ ] Лист ожидания
- [ ] Push-уведомления
- [ ] Экспорт в CSV
- [ ] Шаблоны ответов
- [ ] Заметки о клиентах

## 🐛 Известные ограничения

1. **Безопасность**: JWT токен хранится в localStorage (уязвимо для XSS)
2. **БД**: SQLite не подходит для продакшена с высокой нагрузкой
3. **Файлы**: Загрузка фото не реализована в Mini App
4. **Напоминания**: Требуют отдельного воркера

## 📝 Лицензия

MIT
