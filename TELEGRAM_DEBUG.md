# Отладка Telegram Mini App

## Проблема: Работает в браузере, не работает в Telegram

## Шаг 1: Проверить URL в BotFather

Откройте @BotFather, отправьте:
```
/myapps
```

Выберите ваше приложение → проверьте URL:

**Должно быть:**
- `https://beauty-studio-mini-app.vercel.app` ✅

**НЕ должно быть:**
- `http://...` ❌
- `...vercel.app/` (со слешем) ❌
- `...vercel.app` (без https) ❌

## Шаг 2: Обновить URL (если нужно)

В @BotFather:
```
/seturl
Выберите приложение
Отправьте новый URL
```

## Шаг 3: Проверить через телефон

1. Откройте Telegram на телефоне
2. Найдите бота
3. Нажмите кнопку "Записаться онлайн"
4. Проверьте консоль (если есть debug mode)

## Шаг 4: Проверить Web App вручную

Откройте в браузере:
```
https://beauty-studio-mini-app.vercel.app?tgWebAppStartParam=test
```

Должно открыться без ошибок.

## Шаг 5: Проверить консоль ошибок

В Telegram Desktop:
1. Откройте Mini App
2. Нажмите F12 (или Ctrl+Shift+I)
3. Посмотрите консоль на ошибки

## Частые ошибки:

### Ошибка: "Bot domain invalid"
- URL не совпадает с доменом, указанным при создании приложения
- Решение: пересоздать приложение в BotFather с правильным доменом

### Ошибка: " initiData check failed"
- Проблема с валидацией Telegram auth
- В backend нужно отключить проверку hash для теста

### Ошибка: CORS
- Backend не разрешает запросы с фронтенда
- Проверьте настройки CORS в backend/app/main.py

## Тестовые команды:

Проверить инициализацию:
```javascript
// В консоли Telegram WebView
window.Telegram.WebApp.initData
```

Должно вернуть строку (не пустую).

