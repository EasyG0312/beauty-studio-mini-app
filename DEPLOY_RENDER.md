# 🚀 Развёртывание Backend на Render (Бесплатно)

## 📋 Что такое Render

Render — бесплатная платформа для хостинга веб-приложений с поддержкой Python/FastAPI.

**Преимущества:**
- ✅ Бесплатный тариф (Web Service)
- ✅ Автоматический HTTPS
- ✅ Деплой из GitHub
- ✅ Переменные окружения
- ⚠️ Засыпает через 15 минут бездействия (первый запрос будет медленным)

---

## 🔧 Пошаговая инструкция

### Шаг 1: Подготовьте GitHub репозиторий

```bash
cd C:\Users\HOME\Desktop\telega bot

# Инициализируйте Git если ещё не инициализирован
git init

# Создайте .gitignore (уже есть)
# Добавьте файлы

git add .
git commit -m "Initial commit: Beauty Studio Mini App"

# Создайте репозиторий на GitHub и запушьте
git remote add origin https://github.com/YOUR_USERNAME/beauty-studio-bot.git
git push -u origin main
```

### Шаг 2: Зарегистрируйтесь на Render

1. Откройте https://render.com
2. Нажмите **Get Started for Free**
3. Войдите через GitHub (рекомендуется) или email

### Шаг 3: Создайте Web Service

1. Нажмите **New +** → **Web Service**
2. Выберите **Connect a repository**
3. Найдите ваш репозиторий `beauty-studio-bot`
4. Настройте:

| Поле | Значение |
|------|----------|
| **Name** | `beauty-studio-api` |
| **Region** | `Frankfurt, Germany` (ближе к Киргизии) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements-prod.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Шаг 4: Настройте переменные окружения

В разделе **Environment** добавьте:

```
BOT_TOKEN=8699202257:AAHRGrMOSA7JczE7Jb0F_2vOFRvXV2BQoIM
ADMIN_CHAT_ID=338067005
ADMIN_IDS=338067005
OWNER_IDS=338067005
BUSINESS_NAME=Beauty Studio Bishkek
PHONE=+996 707 001112
ADDRESS=г. Бишкек, ул. Ахунбаева, 1
WORKING_HOURS=Пн-Сб: 09:00 - 20:00
DATABASE_URL=sqlite+aiosqlite:///./salon.db
JWT_SECRET=your-super-secret-key-change-this-now-12345
JWT_ALGORITHM=HS256
CORS_ORIGINS=https://frontend-five-drab-47.vercel.app
```

### Шаг 5: Создайте базу данных

**Вариант A: SQLite (просто, но ненадёжно)**
- Файл `salon.db` будет создан автоматически
- ⚠️ Данные могут потеряться при перезапуске

**Вариант B: PostgreSQL (рекомендуется)**

1. В Render нажмите **New +** → **PostgreSQL**
2. Выберите **Free** тариф
3. После создания скопируйте **Internal Database URL**
4. Добавьте в переменные окружения:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

### Шаг 6: Запустите сервис

1. Нажмите **Create Web Service**
2. Подождите 2-5 минут пока идёт деплой
3. Проверьте логи в разделе **Logs**
4. Откройте URL вида `https://beauty-studio-api.onrender.com`

### Шаг 7: Проверьте API

Откройте в браузере:
```
https://beauty-studio-api.onrender.com/docs
```

Должен открыться Swagger UI с доступными endpoints.

### Шаг 8: Обновите Frontend

1. Откройте `frontend/.env`:
   ```env
   VITE_API_URL=https://beauty-studio-api.onrender.com/api
   ```

2. Пересоберите и задеплойте:
   ```bash
   cd frontend
   npm run build
   npx vercel --prod
   ```

### Шаг 9: Обновите CORS на backend

В `backend/.env.prod` добавьте новый URL:
```
CORS_ORIGINS=https://frontend-five-drab-47.vercel.app,https://beauty-studio-api.onrender.com
```

Закоммитьте и запушьте изменения:
```bash
cd backend
git add .
git commit -m "Update CORS for production"
git push
```

Render автоматически пересоберёт проект.

---

## 🎁 Альтернативные бесплатные хостинги

### 1. Railway (https://railway.app)
- ✅ $5 кредитов в месяц бесплатно
- ✅ Автоматический деплой из GitHub
- ✅ PostgreSQL включён
- ⚠️ Требует карту для регистрации

### 2. Koyeb (https://www.koyeb.com)
- ✅ Бесплатный тариф навсегда
- ✅ Автоматический HTTPS
- ✅ Деплой из GitHub
- ⚠️ Ограниченная производительность

### 3. Fly.io
- ✅ 3 бесплатных VM (256MB RAM)
- ✅ Глобальная сеть
- ⚠️ Требует карту
- ⚠️ Сложнее в настройке

### 4. PythonAnywhere (https://www.pythonanywhere.com)
- ✅ Бесплатный тариф
- ✅ Простая настройка
- ⚠️ Ограниченный функционал
- ⚠️ Нет автоматического деплоя

---

## 🐛 Возможные проблемы

### Ошибка: "Build failed"

**Решение:**
1. Проверьте что `requirements-prod.txt` в папке `backend`
2. Проверьте логи сборки в Render
3. Убедитесь что `Start Command` правильный

### Ошибка: "CORS policy"

**Решение:**
1. Добавьте URL frontend в `CORS_ORIGINS`
2. Пересоберите backend
3. Очистите кэш браузера

### Ошибка: "Database not found"

**Решение:**
1. Проверьте `DATABASE_URL` в переменных окружения
2. Для SQLite убедитесь что путь `./salon.db`
3. Для PostgreSQL проверьте что БД активна

### API медленно отвечает после простоя

**Это нормально для бесплатного тарифа!**

Render "засыпает" сервис через 15 минут бездействия. Первый запрос будет выполняться 30-50 секунд пока сервис "проснётся".

**Решение:** Перейти на платный тариф ($7/мес) или использовать Railway/Koyeb.

---

## 📊 Итоговая архитектура

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Telegram      │────▶│   Frontend       │────▶│   Backend       │
│   Mini App      │     │   (Vercel)       │     │   (Render)      │
│                 │     │                  │     │                 │
│   @your_bot     │     │  https://...     │     │  https://...    │
│                 │     │  vercel.app      │     │  onrender.com   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────────┐
                                          │   Database       │
                                          │   (SQLite/PG)    │
                                          └──────────────────┘
```

---

## ✅ Чеклист после развёртывания

- [ ] Backend доступен по HTTPS
- [ ] Swagger UI открывается (`/docs`)
- [ ] Frontend подключён к production API
- [ ] CORS настроен правильно
- [ ] База данных создана
- [ ] Тестовая запись создаётся
- [ ] Telegram бот использует новый URL

---

## 📞 Поддержка

- [Render Documentation](https://render.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vercel Documentation](https://vercel.com/docs)
