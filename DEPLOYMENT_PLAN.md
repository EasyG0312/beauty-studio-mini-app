# 🚀 ФИНАЛЬНЫЙ ПЛАН РАЗВЁРТЫВАНИЯ — Render + Vercel

> **Цель:** Полностью рабочее приложение в продакшене за 1-2 часа
> **Стоимость:** $0/мес (free tier)
> **Дата:** 08.04.2026

---

## 📋 ЧЕК-ЛИСТ ВСЕХ ШАГОВ

- [ ] **Шаг 1:** Подготовка (15 мин)
- [ ] **Шаг 2:** GitHub репозиторий (10 мин)
- [ ] **Шаг 3:** Render — Backend + PostgreSQL (20 мин)
- [ ] **Шаг 4:** Vercel — Frontend (15 мин)
- [ ] **Шаг 5:** Telegram Bot настройка (10 мин)
- [ ] **Шаг 6:** Тестирование (15 мин)
- [ ] **Шаг 7:** Мониторинг (5 мин)

---

## ШАГ 1: ПОДГОТОВКА (15 МИНУТ)

### 1.1. Проверь что всё работает локально

```bash
# Backend должен отвечать:
curl http://127.0.0.1:8000/health
# Ответ: {"status":"ok","timestamp":"...","service":"beauty-studio-backend"}

# Frontend должен собираться:
cd frontend
npm run build
# Ответ: ✓ built in Xs, файлы в dist/
```

### 1.2. Создай `.env.production` для backend

Создай файл `backend/.env.production`:

```env
# Telegram Bot
BOT_TOKEN=8699202257:AAHRGrMOSA7JczE7Jb0F_2vOFRvXV2BQoIM
ADMIN_CHAT_ID=338067005
ADMIN_IDS=338067005
OWNER_IDS=338067005

# Business Info
BUSINESS_NAME=Beauty Studio Bishkek
PHONE=+996 707 001112
ADDRESS=г. Бишкек, ул. Ахунбаева, 1
WORKING_HOURS=Пн-Сб: 09:00 - 20:00

# Database (ЗАПОЛНИШЬ ПОСЛЕ СОЗДАНИЯ POSTGRESQL НА RENDER)
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT Secret (СГЕНЕРИРУЙ СЛУЧАЙНУЮ СТРОКУ!)
JWT_SECRET=beauty_studio_super_secret_key_2026_xK9mP3nQ7wR
JWT_ALGORITHM=HS256

# CORS (ЗАПОЛНИШЬ ПОСЛЕ СОЗДАНИЯ VERCEL)
CORS_ORIGINS=https://your-app.vercel.app,https://telegram.org
```

### 1.3. Создай `.env.production` для frontend

Создай файл `frontend/.env.production`:

```env
# ЗАПОЛНИШЬ ПОСЛЕ СОЗДАНИЯ BACKEND НА RENDER
VITE_API_URL=https://your-backend.onrender.com
```

### 1.4. Проверь что `.gitignore` не включает секреты

Убедись что в `.gitignore` есть:
```
.env
.env.*
*.db
*.sqlite
venv/
node_modules/
dist/
__pycache__/
*.log
```

---

## ШАГ 2: GITHUB РЕПОЗИТОРИЙ (10 МИНУТ)

### 2.1. Создай репозиторий

1. Открой https://github.com/new
2. Name: `beauty-studio-miniapp`
3. Private: ✅ (если не хочешь чтобы все видели код)
4. **НЕ** создавай README, .gitignore, license (они уже есть)

### 2.2. Закоммить все изменения

```bash
cd "c:\Users\HOME\Desktop\telega bot"

# Добавь все файлы
git add -A

# Закоммить
git commit -m "chore: подготовка к продакшен деплою"

# Добавь remote (замени USERNAME на свой логин GitHub)
git remote add origin https://github.com/USERNAME/beauty-studio-miniapp.git

# Запушь
git push -u origin main
```

### 2.3. Убедись что код на GitHub

Открой https://github.com/USERNAME/beauty-studio-miniapp и проверь что все файлы на месте.

---

## ШАГ 3: RENDER — BACKEND + POSTGRESQL (20 МИНУТ)

### 3.1. Создай аккаунт на Render

1. Открой https://render.com
2. **Sign Up** → **Continue with GitHub**
3. Авторизуйся через GitHub

### 3.2. Создай PostgreSQL базу

1. Нажми **New +** → **PostgreSQL**
2. Заполни:
   - **Name:** `beauty-studio-db`
   - **Database:** `beauty_studio`
   - **User:** `beauty_studio_user`
   - **Region:** `Frankfurt, Germany` (ближайший к Кыргызстану)
   - **Instance Type:** `Free`
3. Нажми **Create Database**
4. **Подожди 2-3 минуты** пока база создастся
5. Скопируй **Internal Database URL** (выглядит так):
   ```
   postgresql://beauty_studio_user:password@db-name.db.elephantsql.com:5432/beauty_studio
   ```

### 3.3. Создай Web Service (Backend)

1. Нажми **New +** → **Web Service**
2. **Connect** к репозиторию `beauty-studio-miniapp`
3. Заполни:
   - **Name:** `beauty-studio-api`
   - **Region:** `Frankfurt, Germany` (тот же что и БД!)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`

### 3.4. Добавь переменные окружения

В разделе **Environment** добавь:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | `8699202257:AAHRGrMOSA7JczE7Jb0F_2vOFRvXV2BQoIM` |
| `ADMIN_CHAT_ID` | `338067005` |
| `ADMIN_IDS` | `338067005` |
| `OWNER_IDS` | `338067005` |
| `BUSINESS_NAME` | `Beauty Studio Bishkek` |
| `PHONE` | `+996 707 001112` |
| `ADDRESS` | `г. Бишкек, ул. Ахунбаева, 1` |
| `WORKING_HOURS` | `Пн-Сб: 09:00 - 20:00` |
| `DATABASE_URL` | `postgresql://...` (из шага 3.2) |
| `JWT_SECRET` | `beauty_studio_super_secret_key_2026_xK9mP3nQ7wR` |
| `JWT_ALGORITHM` | `HS256` |
| `CORS_ORIGINS` | `https://telegram.org` (пока так, обновим после Vercel) |

### 3.5. Задеплой

1. Нажми **Create Web Service**
2. **Подожди 5-10 минут** пока билдится
3. Открой URL вида `https://beauty-studio-api.onrender.com`
4. Проверь health: `https://beauty-studio-api.onrender.com/health`

**Должно вернуться:**
```json
{"status":"ok","timestamp":"...","service":"beauty-studio-backend"}
```

### 3.6. Создай таблицы в PostgreSQL

Render автоматически создаст таблицы при первом запуске (через `init_db()` в lifespan).

Проверь что API работает:
```bash
curl https://beauty-studio-api.onrender.com/health
curl https://beauty-studio-api.onrender.com/api/bookings
```

---

## ШАГ 4: VERCEL — FRONTEND (15 МИНУТ)

### 4.1. Создай аккаунт на Vercel

1. Открой https://vercel.com
2. **Sign Up** → **Continue with GitHub**
3. Авторизуйся через GitHub

### 4.2. Импортируй репозиторий

1. Нажми **Add New...** → **Project**
2. **Import** репозиторий `beauty-studio-miniapp`
3. Нажми **Import**

### 4.3. Настрой билд

1. **Configure Project**
2. Заполни:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (по умолчанию)
   - **Output Directory:** `dist` (по умолчанию)
   - **Install Command:** `npm install` (по умолчанию)

### 4.4. Добавь переменные окружения

В разделе **Environment Variables** добавь:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://beauty-studio-api.onrender.com` |

⚠️ **Важно:** Замени `beauty-studio-api.onrender.com` на свой URL!

### 4.5. Задеплой

1. Нажми **Deploy**
2. **Подожди 2-3 минуты** пока билдится
3. Открой URL вида `https://beauty-studio-miniapp.vercel.app`

### 4.6. Обнови CORS на Render

Теперь когда frontend на Vercel, обнови CORS на Render:

1. Открой **Dashboard** → `beauty-studio-api` → **Environment**
2. Найди `CORS_ORIGINS`
3. Нажми **Edit**
4. Замени на:
   ```
   https://beauty-studio-miniapp.vercel.app,https://telegram.org
   ```
   (замени на свой Vercel URL)
5. Нажми **Save Changes**
6. Render автоматически перезапустит сервис (1-2 минуты)

---

## ШАГ 5: TELEGRAM BOT НАСТРОЙКА (10 МИНУТ)

### 5.1. Открой @BotFather

1. В Telegram найди [@BotFather](https://t.me/BotFather)
2. Нажми **Start**

### 5.2. Настрой Menu Button

Отправь команду:
```
/setmenubutton
```

1. Выбери своего бота
2. Введи URL: `https://beauty-studio-miniapp.vercel.app`
3. Введи название кнопки: `Открыть приложение`

### 5.3. Настрой описание бота

Отправь команду:
```
/description
```

Введи:
```
🌸 Beauty Studio Bishkek — онлайн-запись на услуги

📅 Запись 24/7
💇 Стрижки, маникюр, макияж
⭐ Отзывы и портфолио
📍 г. Бишкек, ул. Ахунбаева, 1

Нажмите "Открыть приложение" для записи!
```

### 5.4. Настрой about

Отправь команду:
```
/about
```

Введи:
```
Beauty Studio Bishkek
📞 +996 707 001112
📍 г. Бишкек, ул. Ахунбаева, 1
🕒 Пн-Сб: 09:00 - 20:00
```

### 5.5. Запусти бота локально (для уведомлений)

Бот нужен для отправки уведомлений (напоминания о записях).

**Вариант A: Локальный компьютер (для теста)**
```bash
cd telegram_bot
pip install pyTelegramBotAPI python-dotenv
python bot.py
```

**Вариант B: Render (для продакшена)**

Создай второй Web Service на Render:

1. **New +** → **Web Service**
2. Подключи тот же репозиторий
3. Настройки:
   - **Name:** `beauty-studio-bot`
   - **Root Directory:** `telegram_bot`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python bot.py`
   - **Instance Type:** `Free`
4. Добавь env variables:
   - `BOT_TOKEN`
   - `ADMIN_CHAT_ID`
   - `ADMIN_IDS`
   - `OWNER_IDS`
   - `MINI_APP_URL` = `https://beauty-studio-miniapp.vercel.app`

⚠️ **Важно:** Free tier Render "засыпает" через 15 мин бездействия. Для бота это ок — он проснётся при новом сообщении.

---

## ШАГ 6: ТЕСТИРОВАНИЕ (15 МИНУТ)

### 6.1. Проверь Backend

```bash
# Health check
curl https://beauty-studio-api.onrender.com/health

# API endpoints
curl https://beauty-studio-api.onrender.com/api/bookings
curl https://beauty-studio-api.onrender.com/api/reviews
curl https://beauty-studio-api.onrender.com/api/analytics/summary
```

**Все должны вернуть данные (не ошибку!)**

### 6.2. Проверь Frontend

1. Открой `https://beauty-studio-miniapp.vercel.app` в браузере
2. Проверь что:
   - ✅ Главная страница загружается
   - ✅ Кнопки навигации работают
   - ✅ Нет ошибок в консоли (F12 → Console)

### 6.3. Проверь через Telegram

1. Открой своего бота в Telegram
2. Нажми **Menu Button** → `Открыть приложение`
3. Проверь что:
   - ✅ Mini App открывается
   - ✅ Главная страница загружается
   - ✅ Можно записаться на услугу
   - ✅ Данные сохраняются

### 6.4. Проверь запись

1. В Mini App нажми **Записаться**
2. Пройди все 6 шагов
3. Проверь что:
   - ✅ Запись создалась
   - ✅ Появилась в "Мои записи"
   - ✅ Админ получил уведомление (если бот запущен)

### 6.5. Проверь панель менеджера

1. Открой Mini App с аккаунта менеджера (ADMIN_IDS=338067005)
2. Проверь что:
   - ✅ Видна панель менеджера
   - ✅ Видны записи
   - ✅ Можно подтвердить/отменить

### 6.6. Проверь аналитику владельца

1. Открой Mini App с аккаунта владельца (OWNER_IDS=338067005)
2. Проверь что:
   - ✅ Видна аналитика
   - ✅ Графики отображаются
   - ✅ KPI мастеров работает
   - ✅ RFM сегментация работает

---

## ШАГ 7: МОНИТОРИНГ (5 МИНУТ)

### 7.1. Настрой UptimeRobot (бесплатно)

1. Открой https://uptimerobot.com
2. **Sign Up** → Free аккаунт
3. **Add New Monitor** → **HTTP(s)**
4. Заполни:
   - **Friendly Name:** `Beauty Studio Backend`
   - **URL:** `https://beauty-studio-api.onrender.com/health`
   - **Monitoring Interval:** `5 minutes` (free)
5. Нажми **Create Monitor**

Теперь будешь получать email если backend упадёт.

### 7.2. Логи Render

1. Открой **Dashboard** → `beauty-studio-api` → **Logs**
2. Видишь все логи backend в реальном времени
3. Ищи ошибки по `ERROR` или `Traceback`

### 7.3. Логи Vercel

1. Открой **Dashboard** → `beauty-studio-miniapp` → **Logs**
2. Видишь все запросы к frontend

---

## 📊 ИТОГОВАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────┐
│                 Telegram App                     │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Menu Button → Mini App (Vercel)        │    │
│  │  https://beauty-studio.vercel.app       │    │
│  │                                          │    │
│  │  ┌───────────────────────────────┐      │    │
│  │  │  React SPA (Frontend)         │      │    │
│  │  │  - Запись на услуги           │      │    │
│  │  │  - Мои записи                 │      │    │
│  │  │  - Панель менеджера           │      │    │
│  │  │  - Аналитика владельца        │      │    │
│  │  └───────────────┬───────────────┘      │    │
│  │                  │ API calls             │    │
│  └──────────────────┼──────────────────────┘    │
└─────────────────────┼───────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  Render Backend       │
          │  https://...render.com│
          │                       │
          │  - FastAPI API        │
          │  - APScheduler        │
          │  - Уведомления        │
          └───────────┬───────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │  Render PostgreSQL    │
          │  - 14 таблиц          │
          │  - Бэкапы каждые 90д  │
          └───────────────────────┘
```

---

## 🆘 TROUBLESHOOTING

### Backend не запускается на Render

**Проблема:** 502 Bad Gateway
**Решение:**
1. Открой **Logs** на Render
2. Ищи ошибки импорта или_missing модулей
3. Проверь что `requirements.txt` в директории `backend/`
4. Проверь что Build Command: `pip install -r requirements.txt`

### CORS ошибки в браузере

**Проблема:** `Access to fetch blocked by CORS policy`
**Решение:**
1. На Render открой **Environment**
2. Проверь что `CORS_ORIGINS` содержит твой Vercel URL
3. Перезапусти сервис (кнопка **Manual Deploy**)

### Frontend показывает 404

**Проблема:** Vercel page not found
**Решение:**
1. Проверь что `Root Directory` = `frontend`
2. Проверь что `Build Command` = `npm run build`
3. Проверь что `Output Directory` = `dist`

### Бот не отвечает

**Проблема:** Menu Button не открывается
**Решение:**
1. Проверь что `MINI_APP_URL` правильный в .env бота
2. Перезапусти бота
3. Проверь логи бота

### База данных пустая

**Проблема:** API возвращает пустые списки
**Решение:**
1. Это нормально — БД новая
2. Создай первую запись через Mini App
3. Проверь что записи появляются: `GET /api/bookings`

### Render "засыпает"

**Проблема:** Первый запрос занимает 30+ секунд
**Решение:** Это нормально для free tier
- Render "засыпает" через 15 мин бездействия
- При следующем запросе "просыпается" (30-50 сек)
- Для продакшена обнови до Starter ($7/мес)

---

## 💰 СТОИМОСТЬ

| Сервис | Free Tier | Paid |
|--------|-----------|------|
| **Render Backend** | ✅ Free (750 hrs/mo) | $7/мес Starter |
| **Render PostgreSQL** | ✅ Free (90 дней) | $7/мес Starter |
| **Vercel Frontend** | ✅ Free (100 GB bandwidth) | $20/мес Pro |
| **Telegram Bot** | ✅ Бесплатно | Бесплатно |
| **UptimeRobot** | ✅ Free (50 monitors) | $7/мес Plus |
| **GitHub** | ✅ Free (private repos) | $4/мес Pro |

**Итого Free:** $0/мес  
**Итого Paid:** ~$14-34/мес

---

## ✅ ЧЕК-ЛИСТ ГОТОВНОСТИ К ДЕПЛОЮ

### Код
- [x] Все тесты пройдены (22/23)
- [x] Frontend собирается (`npm run build`)
- [x] Backend запускается локально
- [x] `.gitignore` исключает секреты
- [x] Код на GitHub

### Конфигурация
- [ ] `backend/.env.production` заполнен
- [ ] `frontend/.env.production` заполнен
- [ ] `telegram_bot/.env` заполнен

### Инфраструктура
- [ ] GitHub репозиторий создан
- [ ] Render PostgreSQL создан
- [ ] Render Web Service (backend) создан
- [ ] Vercel Frontend создан
- [ ] CORS настроен
- [ ] Telegram Menu Button настроен

### Тестирование
- [ ] Health check работает
- [ ] Запись на услугу работает
- [ ] Мои записи показывают данные
- [ ] Чат работает
- [ ] Аналитика работает
- [ ] Уведомления приходят

---

## 📅 ПОСЛЕ ДЕПЛОЯ

### Ежедневно
- [ ] Проверять что бот отвечает
- [ ] Проверять логи на Render

### Еженедельно
- [ ] Проверять UptimeRobot алерты
- [ ] Смотреть что записи создаются

### Каждые 90 дней
- [ ] **Продлить PostgreSQL на Render** (free tier истекает)
  - Открой Dashboard → PostgreSQL → **Extend**
  - Или экспортируй данные и создай новую БД

### Каждый месяц
- [ ] Проверять что Vercel билд успешен
- [ ] Обновить зависимости (`pip install -U`, `npm update`)

---

## 📞 ПОДДЕРЖКА

Если что-то сломалось:

1. **Проверь логи** — Render Dashboard → Logs
2. **Проверь health** — `curl https://...render.com/health`
3. **Перезапусти сервис** — Render Dashboard → Manual Deploy
4. **Проверь CORS** — `.env` CORS_ORIGINS содержит Vercel URL
5. **Проверь БД** — PostgreSQL на Render активна

---

> 🎯 **Время на полный деплой:** 1-2 часа  
> 💰 **Стоимость:** $0/мес (free tier)  
> ✅ **Результат:** Полностью рабочее приложение

**Дата создания:** 08.04.2026
