# 🚀 БЫСТРЫЙ СТАРТ - Деплой за 30 минут

## 📋 ЧЕК-ЛИСТ (пошагово)

### ✅ ШАГ 1: GitHub (5 мин)

```bash
# В корне проекта
git init
git add .
git commit -m "Ready for deploy"

# Создайте репозиторий на GitHub и запушьте:
git remote add origin https://github.com/YOUR_USERNAME/beauty-studio.git
git push -u origin main
```

---

### ✅ ШАГ 2: Telegram Bot (5 мин)

1. Откройте @BotFather
2. `/newbot` → имя → username
3. **Скопируйте токен**
4. @userinfobot → узнайте свой chat_id
5. Сохраните:
   ```
   BOT_TOKEN=1234567890:AAFZs...
   ADMIN_CHAT_ID=ваш_id
   ```

---

### ✅ ШАГ 3: Render.com Backend (10 мин)

1. **Регистрация:** https://render.com → Sign Up (GitHub)

2. **Создайте БД:**
   - New → PostgreSQL
   - Name: `beauty-studio-db`
   - Plan: **Free**
   - Region: Frankfurt
   - **Сохраните Connection String!**

3. **Создайте Web Service:**
   - New → Web Service
   - Connect GitHub репозиторий
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
   - Plan: **Free**

4. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://... (из БД)
   BOT_TOKEN=1234567890:AAFZs...
   ADMIN_CHAT_ID=ваш_id
   ADMIN_IDS=ваш_id
   OWNER_IDS=ваш_id
   JWT_SECRET=any_secret_string
   CORS_ORIGINS=https://telegram.org
   ```

5. **Deploy!** (ждите 3-5 мин)
   - URL: `https://beauty-studio.onrender.com`

---

### ✅ ШАГ 4: Vercel Frontend (5 мин)

1. **Регистрация:** https://vercel.com → Sign Up (GitHub)

2. **Создайте .env.local:**
   ```bash
   cd frontend
   echo "VITE_API_URL=https://beauty-studio.onrender.com/api" > .env.local
   ```

3. **Деплой:**
   - Add New Project
   - Import GitHub репозиторий
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment: `VITE_API_URL=https://...onrender.com/api`

4. **Deploy!** (ждите 2-3 мин)
   - URL: `https://beauty-studio.vercel.app`

---

### ✅ ШАГ 5: Настройка бота (3 мин)

1. @BotFather → `/mybots`
2. Выберите бота
3. Bot Settings → Menu Button
4. Configure Menu Button
5. URL: `https://beauty-studio.vercel.app`
6. Name: "Записаться"

---

### ✅ ШАГ 6: Проверка (2 мин)

**Проверьте:**
1. Откройте бота в Telegram
2. Нажмите Menu Button
3. Должно открыться Mini App
4. Попробуйте записаться
5. Проверьте что запись появилась в базе

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Backend не деплоится
```
→ Проверьте логи в Render Dashboard
→ Проверьте requirements.txt
→ Убедитесь что DATABASE_URL правильный
```

### Frontend не грузится
```
→ Откройте Console (F12)
→ Проверьте VITE_API_URL
→ Проверьте что backend работает
```

### CORS ошибки
```
→ Добавьте URL frontend в CORS_ORIGINS
→ Перезапустите backend в Render
```

### Бот не открывается
```
→ Проверьте что URL правильный (https://...)
→ Проверьте что frontend деплоится успешно
```

---

## 📊 МОНИТОРИНГ

### Логи
- **Backend:** Render Dashboard → Web Service → Logs
- **Frontend:** Vercel Dashboard → Deployments → Logs

### Uptime
- Зарегистрируйтесь на https://uptimerobot.com
- Добавьте мониторинг backend URL
- Пинг каждые 5 мин (не даст backend уснуть)

---

## 💰 СТОИМОСТЬ

| Сервис | Тариф | Цена |
|--------|-------|------|
| GitHub | Free | $0 |
| Render | Free | $0 (750 часов/мес) |
| Vercel | Hobby | $0 (100 GB/мес) |
| Telegram | Free | $0 |
| **ИТОГО** | | **$0/мес** ✅ |

---

## 🔗 ПОЛНАЯ ИНСТРУКЦИЯ

См. [`FREE_DEPLOY_GUIDE.md`](FREE_DEPLOY_GUIDE.md)

---

## 🎉 ГОТОВО!

**Ваше Mini App работает!**

- Frontend: `https://beauty-studio.vercel.app`
- Backend: `https://beauty-studio.onrender.com`
- Bot: @your_bot

**Успехов!** 🚀
