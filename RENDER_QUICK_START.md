# 🚀 Быстрый старт на Render

## ✅ Шаг 1: Запушите проект на GitHub

```bash
# Создайте новый репозиторий на GitHub (например: beauty-studio-bot)
# Затем выполните:

cd C:\Users\HOME\Desktop\telega bot
git remote add origin https://github.com/YOUR_USERNAME/beauty-studio-bot.git
git branch -M main
git push -u origin main
```

**Или через GitHub Desktop:**
1. Откройте GitHub Desktop
2. File → Add Local Repository → Выберите `C:\Users\HOME\Desktop\telega bot`
3. Publish repository → Назовите `beauty-studio-bot`

---

## ✅ Шаг 2: Зарегистрируйтесь на Render

1. Откройте https://render.com
2. Нажмите **Get Started for Free**
3. Войдите через GitHub (рекомендуется)

---

## ✅ Шаг 3: Создайте Web Service

1. Нажмите **New +** → **Web Service**
2. **Connect a repository** → Выберите ваш репозиторий `beauty-studio-bot`
3. Заполните настройки:

| Поле | Значение |
|------|----------|
| **Name** | `beauty-studio-api` |
| **Region** | `Frankfurt, Germany` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements-prod.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

---

## ✅ Шаг 4: Добавьте переменные окружения

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
JWT_SECRET=super-secret-key-12345-change-it
JWT_ALGORITHM=HS256
CORS_ORIGINS=https://frontend-five-drab-47.vercel.app
```

---

## ✅ Шаг 5: Запустите

1. Нажмите **Create Web Service**
2. Подождите 2-5 минут
3. Откройте URL вида: `https://beauty-studio-api.onrender.com/docs`

---

## ✅ Шаг 6: Обновите Frontend

1. Откройте `frontend/.env`:
   ```env
   VITE_API_URL=https://beauty-studio-api.onrender.com/api
   ```

2. Пересоберите:
   ```bash
   cd frontend
   npm run build
   npx vercel --prod
   ```

---

## 🎉 Готово!

Проверьте что всё работает:

1. ✅ Backend: https://beauty-studio-api.onrender.com/docs
2. ✅ Frontend: https://frontend-five-drab-47.vercel.app
3. ✅ Telegram Mini App: Откройте бота и нажмите Menu Button

---

## 📞 Если что-то не так

- Проверьте логи в Render (**Logs** tab)
- Проверьте CORS в браузере (F12 → Console)
- Убедитесь что BOT_TOKEN правильный
