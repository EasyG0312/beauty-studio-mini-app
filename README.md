# Beauty Studio Telegram Mini App

**Version: 2.1.5**
**Production URL:** `https://frontend-gamma-livid-32.vercel.app`
**Backend URL:** `https://beauty-studio-api.onrender.com`
**Last Update:** 23.04.2026

Telegram Mini App для онлайн-записи в салон красоты с полной миграцией функционала бота.

## 📁 Структура проекта

```
telega-bot/
├── backend/           # FastAPI сервер
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── api/
│   │   └── services/
│   ├── requirements.txt
│   └── .env
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
└── telegram_bot/      # Обновлённый бот (оболочка)
    └── bot.py
```

## 🚀 Быстрый старт

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Telegram Bot

```bash
cd telegram_bot
pip install -r requirements.txt
python bot.py
```

## 📦 Деплой

### Frontend → Vercel

```bash
cd frontend
npm run build
vercel deploy
```

### Backend → Vercel / VPS

Следуйте инструкции в `backend/README.md`

## 🔧 Настройка Telegram

1. Откройте @BotFather
2. `/newapp` или редактируйте существующего бота
3. Укажите URL вашего приложения (Vercel)
4. Включите Menu Button

## 📋 Функционал

### Клиент
- ✅ Запись на услугу
- ✅ Выбор мастера и времени
- ✅ Мои записи
- ✅ Перенос/отмена
- ✅ Лист ожидания
- ✅ Отзывы

### Менеджер
- ✅ Дашборд "Кто сегодня"
- ✅ Подтверждение записей
- ✅ Bulk-операции
- ✅ Чат с клиентами
- ✅ Заметки о клиентах

### Владелец
- ✅ Аналитика выручки
- ✅ KPI мастеров
- ✅ RFM-сегментация
- ✅ Прогноз выручки
- ✅ Экспорт данных

## 🛠 Стек

- **Frontend**: React 18, TypeScript, Vite, Telegram WebApp SDK
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Deploy**: Vercel (frontend + serverless backend)
