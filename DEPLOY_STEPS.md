# 🚀 ДЕПЛОЙ — ПОШАГОВАЯ ИНСТРУКЦИЯ

> **GitHub репозиторий:** https://github.com/EasyG0312/beauty-studio-mini-app
> **Дата:** 08.04.2026

---

## ЧАСТЬ 1: VERCEL — FRONTEND (5 минут)

### Шаг 1.1: Открой Vercel

1. Открой https://vercel.com/new
2. Нажми **Continue with GitHub**
3. Разреши доступ к репозиторию

### Шаг 1.2: Импортируй репозиторий

1. Найди репозиторий: **beauty-studio-mini-app**
2. Нажми **Import**

### Шаг 1.3: Настрой проект

Заполни точно так:

| Поле | Значение |
|------|----------|
| **Project Name** | `beauty-studio-frontend` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Шаг 1.4: Добавь Environment Variable

Нажми **Environment Variables** и добавь:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://beauty-studio-api.onrender.com` |

⚠️ **Важно:** Замени `beauty-studio-api` на имя которое дашь на Render.

### Шаг 1.5: Деплой

1. Нажми **Deploy**
2. Подожди **2-3 минуты**
3. Получишь URL вида: `https://beauty-studio-frontend.vercel.app`

**Скопируй этот URL!** Он нужен для Render CORS.

---

## ЧАСТЬ 2: RENDER — BACKEND + POSTGRESQL (10 минут)

### Шаг 2.1: Создай PostgreSQL базу

1. Открой https://dashboard.render.com/new
2. Выбери **PostgreSQL**
3. Заполни:

| Поле | Значение |
|------|----------|
| **Name** | `beauty-studio-db` |
| **Database** | `beauty_studio` |
| **User** | `beauty_studio_user` |
| **Region** | `Frankfurt, Germany` |
| **Instance Type** | `Free` |

4. Нажми **Create Database**
5. **Подожди 2-3 минуты**
6. Скопируй **Internal Database URL** (выглядит так):
   ```
   postgresql://beauty_studio_user:password@db-xxxxx.db.render.com:5432/beauty_studio
   ```

### Шаг 2.2: Создай Web Service

1. Открой https://dashboard.render.com/new
2. Выбери **Web Service**
3. Подключи **beauty-studio-mini-app** репозиторий
4. Заполни:

| Поле | Значение |
|------|----------|
| **Name** | `beauty-studio-api` |
| **Region** | `Frankfurt, Germany` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Шаг 2.3: Добавь Environment Variables

Нажми **Advanced** → **Add Environment Variable**:

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
| `DATABASE_URL` | `postgresql://...` (из шага 2.1) |
| `JWT_SECRET` | `beauty_studio_super_secret_key_2026_xK9mP3nQ7wR` |
| `JWT_ALGORITHM` | `HS256` |
| `CORS_ORIGINS` | `https://beauty-studio-frontend.vercel.app,https://telegram.org` |

⚠️ **Замени** `beauty-studio-frontend.vercel.app` на свой Vercel URL!

### Шаг 2.4: Деплой

1. Нажми **Create Web Service**
2. Подожди **5-10 минут**
3. Получишь URL вида: `https://beauty-studio-api.onrender.com`

### Шаг 2.5: Проверь

Открой: `https://beauty-studio-api.onrender.com/health`

Должно вернуться:
```json
{"status":"ok","timestamp":"...","service":"beauty-studio-backend"}
```

---

## ЧАСТЬ 3: TELEGRAM BOT (5 минут)

### Шаг 3.1: Открой @BotFather

1. В Telegram найди **@BotFather**
2. Нажми **Start**

### Шаг 3.2: Настрой Menu Button

Отправь по очереди:

```
/setmenubutton
```
→ Выбери своего бота
→ URL: `https://beauty-studio-frontend.vercel.app`
→ Название: `Открыть приложение`

```
/description
```
→ Beauty Studio Bishkek — онлайн-запись на услуги. Нажмите "Открыть приложение"!

```
/about
```
→ Beauty Studio Bishkek | 📞 +996 707 001112 | 📍 г. Бишкек, ул. Ахунбаева, 1

---

## ЧАСТЬ 4: ПРОВЕРКА (5 минут)

### 4.1: Backend

```bash
curl https://beauty-studio-api.onrender.com/health
curl https://beauty-studio-api.onrender.com/api/bookings
```

### 4.2: Frontend

Открой `https://beauty-studio-frontend.vercel.app` в браузере

### 4.3: Telegram

1. Открой своего бота
2. Нажми Menu Button
3. Mini App должен открыться

---

## 🆀 ЕСЛИ ЧТО-ТО СЛОМАЛОСЬ

### Vercel: 500 Error
- Проверь логи: Dashboard → Logs
- Проверь VITE_API_URL в Environment Variables

### Render: 502 Bad Gateway
- Проверь логи: Dashboard → Logs
- Проверь DATABASE_URL
- Проверь что Build Command: `pip install -r requirements.txt`

### CORS ошибки
- Проверь CORS_ORIGINS на Render содержит Vercel URL
- Перезапусти сервис: Dashboard → Manual Deploy

### Menu Button не работает
- Проверь URL в BotFather (должен быть https://)
- Попробуй удалить и создать заново

---

## 📊 ИТОГОВЫЙ РЕЗУЛЬТАТ

| Сервис | URL | Статус |
|--------|-----|--------|
| **Frontend** | `https://beauty-studio-frontend.vercel.app` | ⏳ Ожидает |
| **Backend** | `https://beauty-studio-api.onrender.com` | ⏳ Ожидает |
| **Bot** | `@YourBotName` | ⏳ Ожидает |

---

> 💰 **Стоимость:** $0/мес (free tier)
> ⏱️ **Время:** 15-20 минут
> ✅ **Результат:** Полностью рабочее приложение
