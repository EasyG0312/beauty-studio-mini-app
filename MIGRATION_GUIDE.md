# Mini App Migration Guide

## ✅ Перенесённые функции из старого бота в Mini App

### Backend (FastAPI)

#### Новые API Endpoints

**Reviews (Отзывы):**
- `GET /api/reviews` - Получить отзывы
- `POST /api/reviews` - Создать отзыв

**Waitlist (Лист ожидания):**
- `GET /api/waitlist` - Получить лист ожидания
- `POST /api/waitlist` - Добавить в лист ожидания
- `DELETE /api/waitlist/{id}` - Удалить из листа ожидания

**Blacklist (Чёрный список):**
- `GET /api/blacklist` - Получить чёрный список
- `POST /api/blacklist` - Добавить в чёрный список
- `DELETE /api/blacklist/{chat_id}` - Удалить из чёрного списка

**Portfolio (Портфолио):**
- `GET /api/portfolio` - Получить портфолио
- `POST /api/portfolio` - Добавить фото
- `DELETE /api/portfolio/{id}` - Удалить фото

**Chat Messages (Чат):**
- `GET /api/chat/{chat_id}` - История чата
- `POST /api/chat` - Отправить сообщение

**Client Management (Управление клиентами):**
- `GET /api/clients` - Все клиенты
- `GET /api/clients/{chat_id}` - Информация о клиенте
- `PUT /api/clients/{chat_id}` - Обновить заметки

**Enhanced Analytics (Расширенная аналитика):**
- `GET /api/analytics/kpi` - KPI мастеров
- `GET /api/analytics/rfm` - RFM-сегментация
- `GET /api/analytics/forecast` - Прогноз выручки

#### Новые модели данных
- `ChatMessage` - сообщения чата
- `Blacklist` - чёрный список клиентов
- `Portfolio` - портфолио работ
- Расширены `Booking` (reminded_1d, reminded_3d, cancel_reason, is_on_the_way)

---

### Frontend (React + TypeScript)

#### Новые страницы

| Страница | Путь | Описание |
|----------|------|----------|
| ReviewsPage | `/reviews` | Отзывы и рейтинги |
| PortfolioPage | `/portfolio` | Портфолио работ |
| FAQPage | `/faq` | Частые вопросы |
| WaitlistPage | `/waitlist` | Лист ожидания |
| ChatPage | `/chat` | Чат с менеджером |

#### Обновлённые страницы

**ManagerDashboardPage:**
- ✅ Bulk-подтверждение записей
- ✅ Вкладка "Лист ожидания"
- ✅ Вкладка "Клиенты" с заметками
- ✅ Кнопка "Я выезжаю" (is_on_the_way)
- ✅ Причины отмены записи (dropdown)
- ✅ Переход в чат

**OwnerAnalyticsPage:**
- ✅ KPI мастеров (выручка, рейтинг, конверсия, средний чек)
- ✅ RFM-сегментация клиентов (Champions, Loyal, At Risk, Lost)
- ✅ Прогноз выручки на 7/30 дней
- ✅ Вкладки: Обзор / KPI / RFM

**HomePage:**
- ✅ Ссылки на все новые страницы
- ✅ Контакты салона
- ✅ Быстрые действия для менеджера/владельца

**Navigation:**
- ✅ Добавлены иконки: Отзывы, Работы, FAQ

#### Новые типы данных (types/index.ts)
```typescript
Review, Waitlist, Blacklist, Portfolio, ChatMessage
ClientRFM, RevenueForecast, MasterKPI
CANCEL_REASONS, FAQ_ITEMS
```

#### Обновлённые типы
- `Booking` - добавлены поля: reminded_1d, reminded_3d, review_sent, cancel_reason

---

## 📁 Структура проекта

```
telega-bot/
├── backend/
│   ├── app/
│   │   ├── main.py          # ✅ Обновлён: новые endpoints
│   │   ├── models.py        # ✅ Обновлена: ChatMessage модель
│   │   ├── schemas.py       # ✅ Обновлены: новые схемы
│   │   ├── database.py
│   │   └── config.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ReviewsPage.tsx      # ✨ Новый
│   │   │   ├── PortfolioPage.tsx    # ✨ Новый
│   │   │   ├── FAQPage.tsx          # ✨ Новый
│   │   │   ├── WaitlistPage.tsx     # ✨ Новый
│   │   │   ├── ChatPage.tsx         # ✨ Новый
│   │   │   ├── ManagerDashboardPage.tsx  # ✅ Обновлён
│   │   │   ├── OwnerAnalyticsPage.tsx    # ✅ Обновлён
│   │   │   ├── HomePage.tsx              # ✅ Обновлён
│   │   │   ├── BookingPage.tsx           # ✅ Обновлён
│   │   │   └── ...
│   │   ├── components/
│   │   │   └── Navigation.tsx       # ✅ Обновлён
│   │   ├── services/
│   │   │   └── api.ts               # ✅ Обновлён: новые API функции
│   │   ├── types/
│   │   │   └── index.ts             # ✅ Обновлены: новые типы
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── bookingStore.ts
│   │   └── App.tsx                  # ✅ Обновлён: новые роуты
│   └── package.json
│
└── telegram_bot/
    └── bot.py                       # ✅ Обновлён: Mini App интеграция
```

---

## 🚀 Запуск проекта

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Копируем .env.example и настраиваем
cp .env.example .env

# Запускаем
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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

---

## 🔧 Настройка Telegram Mini App

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots` и выберите вашего бота
3. Выберите `Bot Settings` → `Menu Button` → `Configure Menu Button`
4. Отправьте URL вашего приложения (например, `https://your-app.vercel.app`)
5. Введите название кнопки (например, "Записаться")

Или через API:
```python
bot.set_chat_menu_button(
    menu_button=types.MenuButtonWebApp(
        text="🚀 Записаться",
        web_app=types.WebAppInfo(url="https://your-app.vercel.app")
    )
)
```

---

## 📋 Чек-лист перенесённых функций

### Клиент
- ✅ Запись на услугу (6 шагов)
- ✅ Выбор мастера и времени
- ✅ Мои записи (активные/история)
- ✅ Перенос/отмена записи
- ✅ Причины отмены (dropdown)
- ✅ Лист ожидания
- ✅ Отзывы и рейтинг
- ✅ Портфолио работ
- ✅ FAQ
- ✅ Чат с менеджером
- ✅ Кнопка "Я выезжаю"

### Менеджер
- ✅ Дашборд "Кто сегодня"
- ✅ Bulk-подтверждение записей
- ✅ Вкладка клиентов с заметками
- ✅ Подтверждение/отмена/завершение записей
- ✅ Чат с клиентами
- ✅ Лист ожидания
- ✅ Отметка "Не явился"

### Владелец
- ✅ Аналитика выручки (7/30 дней)
- ✅ Прогноз выручки
- ✅ KPI мастеров (рейтинг, конверсия, средний чек)
- ✅ RFM-сегментация клиентов
- ✅ Статистика записей
- ✅ Доступ к панели менеджера

---

## 🎨 UI Компоненты

Все компоненты используют CSS переменные Telegram темы:
- `--tg-theme-bg-color`
- `--tg-theme-text-color`
- `--tg-theme-button-color`
- `--tg-theme-button-text-color`
- `--tg-theme-secondary-bg-color`
- `--tg-theme-hint-color`
- `--tg-theme-link-color`

---

## 📝 Следующие шаги

1. **Настроить базу данных** (SQLite → PostgreSQL для продакшена)
2. **Задеплоить backend** (Vercel / VPS)
3. **Задеплоить frontend** (Vercel)
4. **Настроить Telegram WebApp URL**
5. **Протестировать все функции**
6. **Добавить реальную отправку уведомлений** (email/push)

---

## 🐛 Известные ограничения

1. **Портфолио**: Фото отображаются как заглушки (нужно настроить загрузку через bot API)
2. **Чат**: Нет real-time обновлений (нужен WebSocket)
3. **Напоминания**: Требуется фоновая задача для отправки
4. **Telegram Auth**: Работает только внутри Telegram WebApp

---

## 📞 Контакты

Если возникли вопросы по миграции, обратитесь к документации:
- [Telegram WebApp API](https://core.telegram.org/bots/webapps)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
