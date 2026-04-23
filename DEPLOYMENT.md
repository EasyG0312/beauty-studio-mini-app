# Информация о деплое

> Актуальная информация о развёртывании приложения
> Последнее обновление: 23.04.2026

---

## 🌐 Актуальные URL

### Frontend (Vercel)
- **Production:** `https://frontend-gamma-livid-32.vercel.app`
- **Preview:** `https://frontend-h2p16dqh4-easyg0312s-projects.vercel.app`
- **Inspect:** https://vercel.com/easyg0312s-projects/frontend

### Backend (Render)
- **API URL:** `https://beauty-studio-api.onrender.com`
- **API Docs:** `https://beauty-studio-api.onrender.com/docs`

### Telegram Bot
- **Bot:** @beauty_studio_booking_bot
- **Mini App URL в BotFather:** `https://frontend-gamma-livid-32.vercel.app`

---

## 🚀 Команды для деплоя

### Frontend
```bash
cd frontend
npm install
vercel --prod
```

### Backend
Автоматический деплой из GitHub на Render.

---

## 📝 История деплоев

| Дата | Версия | URL | Примечание |
|------|--------|-----|------------|
| 23.04.2026 | 2.1.5 | frontend-gamma-livid-32.vercel.app | Новый деплой после 404 ошибки |
| 22.04.2026 | 2.1.4 | frontend-five-drab-47.vercel.app | Удалён |
| 22.04.2026 | 2.1.3 | beauty-studio-mini-app.vercel.app | Старый, не работает |

---

## 🔧 Настройка в BotFather

```
/myapps
→ Выберите приложение
/seturl
→ https://frontend-gamma-livid-32.vercel.app
```

**Важно:** URL должен быть:
- С `https://`
- БЕЗ слеша `/` в конце
- Точно такой как указано выше

---

## ⚠️ Известные проблемы и решения

### Проблема: 404 DEPLOYMENT_NOT_FOUND
**Причина:** Vercel удалил старый деплой
**Решение:** Создать новый деплой через `vercel --prod` и обновить URL в BotFather

### Проблема: Приложение не открывается в Telegram
**Причина:** Неправильный URL в BotFather или CORS
**Решение:** 
1. Проверить URL в BotFather
2. Убедиться что backend CORS разрешает запросы
3. Проверить через `/telegram-debug` страницу

---

## 🧪 Тестирование

### Быстрая проверка
```
https://frontend-gamma-livid-32.vercel.app/telegram-debug
```

### Проверка API
```bash
curl https://beauty-studio-api.onrender.com/api/health
```

---

## 📞 Контакты

- Разработчик: @BenedictCumberbatch_1
- Проект: EasyG0312/beauty-studio-mini-app
