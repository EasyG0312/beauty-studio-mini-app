# 🚀 БЕСПЛАТНЫЙ ДЕПЛОЙ - Beauty Studio Mini App
## Полная инструкция по развёртыванию на бесплатных платформах

---

## 📊 АРХИТЕКТУРА (Бесплатно)

```
┌─────────────────────────────────────────────────┐
│              Cloudflare (CDN + HTTPS)           │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│   Vercel       │   │   Render.com    │
│   (Frontend)   │   │   (Backend)     │
│   БЕСПЛАТНО    │   │   БЕСПЛАТНО      │
└────────────────┘   └────────┬────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Render PostgreSQL│
                    │   БЕСПЛАТНО (90дн) │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Telegram Bot    │
                    │   БЕСПЛАТНО       │
                    └───────────────────┘
```

---

## 📋 ЧТО БУДЕМ ИСПОЛЬЗОВАТЬ

| Компонент | Платформа | Тариф | Ограничения |
|-----------|-----------|-------|-------------|
| **Frontend** | Vercel | Hobby (Free) | 100 GB трафик/мес |
| **Backend** | Render.com | Free | 750 часов/мес |
| **База данных** | Render PostgreSQL | Free | 90 дней, 1 GB |
| **Telegram Bot** | Telegram API | Free | Безлимитно |
| **Домен** | Vercel.app + onrender.com | Free | Поддомены |

**Итого:** $0/мес ✅

---

## 🎯 ЭТАП 1: Подготовка (15 минут)

### 1.1 GitHub Репозиторий

**Если ещё нет:**
```bash
# В корне проекта
git init
git add .
git commit -m "Initial commit"

# Создать репозиторий на GitHub
# https://github.com/new

# Добавить remote
git remote add origin https://github.com/YOUR_USERNAME/beauty-studio-mini-app.git
git push -u origin main
```

**Структура репозитория:**
```
beauty-studio-mini-app/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── telegram_bot/
│   └── bot.py
└── README.md
```

---

### 1.2 Telegram Bot

**Создание бота:**
1. Откройте @BotFather в Telegram
2. Отправьте `/newbot`
3. Придумайте имя (например: `Beauty Studio Bishkek`)
4. Придумайте username (например: `beauty_studio_bot`)
5. **Скопируйте токен** (выглядит как: `1234567890:AAFZs...`)

**Настройка WebApp:**
1. В @BotFather отправьте `/mybots`
2. Выберите вашего бота
3. Bot Settings → Menu Button
4. Отправьте URL (пока заглушку, потом обновим)
5. Введите название кнопки (например: "Записаться")

**Сохраните:**
- `BOT_TOKEN=1234567890:AAFZs...`
- `ADMIN_CHAT_ID=ваш_chat_id` (узнать через @userinfobot)

---

## 🎯 ЭТАП 2: Backend на Render.com (20 минут)

### 2.1 Регистрация на Render

1. Перейдите на https://render.com
2. Sign Up через GitHub
3. Подтвердите email

---

### 2.2 Создание PostgreSQL БД

**Важно:** Free тариф на 90 дней, потом нужно продлить или создать новую.

1. В Dashboard нажмите **New** → **PostgreSQL**
2. Заполните:
   ```
   Name: beauty-studio-db
   Database: beauty_studio
   User: beautystudio
   Password: [сложный пароль, сохраните!]
   Region: Frankfurt (Germany) - ближе к КР
   Plan: Free
   ```
3. Нажмите **Create Database**
4. **Сохраните Connection String** (внешний URL):
   ```
   postgresql://beautystudio:PASSWORD@host:5432/beauty_studio
   ```

---

### 2.3 Создание Web Service (Backend)

1. В Dashboard нажмите **New** → **Web Service**
2. Выберите ваш GitHub репозиторий
3. Заполните:
   ```
   Name: beauty-studio-backend
   Region: Frankfurt (Germany)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port 10000
   ```

4. **Plan: Free**

5. **Environment Variables** (добавьте все):
   ```
   DATABASE_URL=postgresql://beautystudio:PASSWORD@host:5432/beauty_studio
   BOT_TOKEN=1234567890:AAFZs...
   ADMIN_CHAT_ID=338067005
   ADMIN_IDS=338067005
   OWNER_IDS=338067005
   JWT_SECRET=your_secret_key_here_12345
   JWT_ALGORITHM=HS256
  # CORS_ORIGINS: comma-separated allowed origins for the frontend.
  # Use your Vercel app URL here. Example:
  CORS_ORIGINS=https://beauty-studio-mini-app.vercel.app,https://telegram.org
  # For quick testing you can set CORS_ORIGINS=* (wildcard). Note: when '*' is used
  # the backend will automatically disable credentials (cookies/allow-credentials)
  # to comply with browser rules. Avoid '*' in production.
   ```

6. Нажмите **Create Web Service**

**Статус:**
- Building... (2-5 минут)
- Deploying...
- **Live** ✅

**URL:** `https://beauty-studio-backend.onrender.com`

---

### 2.4 Проверка Backend

**Тестовые запросы:**
```bash
# Проверка что работает
curl https://beauty-studio-backend.onrender.com/api/analytics/summary

# Должен вернуть JSON с аналитикой
```

**Если ошибка 500:**
- Проверьте логи в Render Dashboard
- Проверьте DATABASE_URL
- Проверьте что все миграции прошли

---

## 🎯 ЭТАП 3: Frontend на Vercel (10 минут)

### 3.1 Регистрация на Vercel

1. Перейдите на https://vercel.com
2. Sign Up через GitHub
3. Подтвердите email

---

### 3.2 Создание .env.local

**Файл:** `frontend/.env.local`
```env
VITE_API_URL=https://beauty-studio-backend.onrender.com/api
```

---

### 3.3 Деплой Frontend

**Через Vercel Dashboard:**

1. Нажмите **Add New Project**
2. Импортируйте GitHub репозиторий
3. Заполните:
   ```
   Project Name: beauty-studio-mini-app
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables:**
   ```
   VITE_API_URL=https://beauty-studio-backend.onrender.com/api
   ```

5. Нажмите **Deploy**

**Статус:**
- Building... (2-3 минуты)
- **Ready** ✅

**URL:** `https://beauty-studio-mini-app.vercel.app`

---

### 3.4 Проверка Frontend

1. Откройте `https://beauty-studio-mini-app.vercel.app`
2. Должна загрузиться главная страница
3. Попробуйте записаться

**Если ошибка:**
- Откройте Console (F12)
- Проверьте что API_URL правильный
- Проверьте CORS в backend

### CORS quick tips
- If you see "No 'Access-Control-Allow-Origin' header" in the console, make sure `CORS_ORIGINS` in backend contains your Vercel origin (e.g. `https://your-app.vercel.app`).
- For temporary open testing you can use `CORS_ORIGINS=*`, but the backend will disable credentials when `*` is used — this is OK for simple public testing but not for production where auth tokens or cookies are required.
- After changing `CORS_ORIGINS`, redeploy the backend service on Render.

---

## 🎯 ЭТАП 4: Настройка Telegram Bot (5 минут)

### 4.1 Обновление Menu Button

**В @BotFather:**
1. `/mybots` → выберите бота
2. Bot Settings → Menu Button
3. **Configure Menu Button**
4. Отправьте URL: `https://beauty-studio-mini-app.vercel.app`
5. Введите название: "Записаться"

---

### 4.2 Проверка бота

1. Откройте вашего бота в Telegram
2. Нажмите **Menu Button** (слева от input)
3. Должно открыться Mini App

---

## 🎯 ЭТАП 5: Продление БД (каждые 90 дней)

### Вариант 1: Продлить существующую

**За 5 дней до истечения:**
1. Render Dashboard → Database
2. Settings → **Extend Trial**
3. Подтвердите

**Или создайте новую:**
1. New → PostgreSQL
2. Экспортируйте данные (pg_dump)
3. Импортируйте в новую БД

### Вариант 2: Альтернативы

**Neon.tech** (бесплатно, безлимитно):
```
1. https://neon.tech
2. Sign Up через GitHub
3. New Project
4. Connection String → скопируйте
5. Обновите DATABASE_URL в Render
```

**Supabase** (бесплатно, 500 MB):
```
1. https://supabase.com
2. New Project
3. Database → Connection String
4. Обновите DATABASE_URL
```

---

## 🎯 ЭТАП 6: Мониторинг и Поддержка

### 6.1 Логи

**Backend (Render):**
```
Dashboard → Web Service → Logs
```

**Frontend (Vercel):**
```
Dashboard → Project → Deployments → Logs
```

---

### 6.2 Uptime Мониторинг

**UptimeRobot (бесплатно):**
```
1. https://uptimerobot.com
2. Sign Up
3. Add New Monitor
4. URL: https://beauty-studio-backend.onrender.com/api/analytics/summary
5. Interval: 5 minutes
6. Email alerts
```

**Статус:**
- Backend: ✅ Работает
- Frontend: ✅ Работает
- Bot: ✅ Работает

---

### 6.3 Автоматическое продление

**Render Free тариф:**
- 750 часов/мес = ~31 день
- Service засыпает через 15 мин бездействия
- **Решение:** UptimeRobot пингует каждые 5 мин

**Настройка UptimeRobot:**
```
Monitor Type: HTTP(s)
URL: https://beauty-studio-backend.onrender.com/api/analytics/summary
Monitoring Interval: 5 minutes
Alert Contact: ваш email
```

---

## 📊 СТОИМОСТЬ

| Сервис | Тариф | Стоимость |
|--------|-------|-----------|
| GitHub | Free | $0 |
| Vercel | Hobby | $0 |
| Render.com | Free | $0 |
| Render PostgreSQL | Free (90дн) | $0 |
| Telegram Bot | Free | $0 |
| UptimeRobot | Free (50 мониторов) | $0 |
| **ИТОГО** | | **$0/мес** ✅ |

---

## 🔧 КОНФИГУРАЦИОННЫЕ ФАЙЛЫ

### backend/.env (для локальной разработки)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/beauty_studio
BOT_TOKEN=1234567890:AAFZs...
ADMIN_CHAT_ID=338067005
ADMIN_IDS=338067005
OWNER_IDS=338067005
JWT_SECRET=local_secret_key
JWT_ALGORITHM=HS256
CORS_ORIGINS=http://localhost:5173,https://telegram.org
# For quick local testing you can use CORS_ORIGINS=* but note that using '*' disables credentials.
```

### frontend/.env.local
```env
VITE_API_URL=https://beauty-studio-backend.onrender.com/api
```

### vercel.json (уже есть)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### render.yaml (создать в корне backend)
```yaml
services:
  - type: web
    name: beauty-studio-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port 10000
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: beauty-studio-db
          property: connectionString
      - key: BOT_TOKEN
        sync: false
      - key: ADMIN_CHAT_ID
        sync: false
      - key: JWT_SECRET
        generateValue: true

databases:
  - name: beauty-studio-db
    databaseName: beauty_studio
    user: beautystudio
```

---

## 🐛 ТИПИЧНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### 1. Backend не деплоится

**Ошибка:** `Build failed`
```
Решение:
1. Проверьте requirements.txt
2. Проверьте Python version (3.11)
3. Посмотрите логи в Render
```

### 2. CORS ошибки

**Ошибка:** `Access-Control-Allow-Origin`
```
Решение:
1. Проверьте CORS_ORIGINS в .env
2. Добавьте https://beauty-studio-mini-app.vercel.app
3. Перезапустите backend
```

### 3. База данных не подключается

**Ошибка:** `Connection refused`
```
Решение:
1. Проверьте DATABASE_URL
2. Проверьте что БД активна (не истекла)
3. Проверьте firewall (должен быть открыт)
```

### 4. Telegram Bot не работает

**Ошибка:** `Unauthorized`
```
Решение:
1. Проверьте BOT_TOKEN
2. Проверьте что бот не заблокирован
3. Проверьте chat_id
```

### 5. Frontend не загружается

**Ошибка:** `Failed to fetch`
```
Решение:
1. Проверьте VITE_API_URL
2. Проверьте что backend работает
3. Проверьте Console (F12)
```

---

## ✅ ЧЕК-ЛИСТ ЗАПУСКА

- [ ] GitHub репозиторий создан
- [ ] Telegram Bot создан, токен получен
- [ ] Render аккаунт создан
- [ ] PostgreSQL БД создана
- [ ] Backend Web Service создан
- [ ] Environment Variables добавлены
- [ ] Backend деплоится (статус: Live)
- [ ] Vercel аккаунт создан
- [ ] Frontend деплоен (статус: Ready)
- [ ] Menu Button настроен в @BotFather
- [ ] Тестовая запись создана
- [ ] Telegram уведомление пришло
- [ ] UptimeRobot настроен
- [ ] Логи проверяются

---

## 📝 ССЫЛКИ

**Платформы:**
- [Render.com](https://render.com)
- [Vercel](https://vercel.com)
- [Neon.tech](https://neon.tech) (альтернатива БД)
- [Supabase](https://supabase.com) (альтернатива БД)

**Инструменты:**
- [UptimeRobot](https://uptimerobot.com)
- @BotFather (Telegram)
- @userinfobot (узнать chat_id)

**Документация:**
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

## 🎉 ИТОГ

**Время развёртывания:** 45-60 минут
**Стоимость:** $0/мес
**Срок работы:** 90 дней (БД), потом продление

**После развёртывания:**
- ✅ Frontend: https://your-app.vercel.app
- ✅ Backend: https://your-service.onrender.com
- ✅ Bot: @your_bot
- ✅ БД: PostgreSQL (Render)

**Успешного запуска!** 🚀
