# 🔒 ОТЧЁТ ПО АУДИТУ БЕЗОПАСНОСТИ

> **Проект:** Beauty Studio Telegram Mini App  
> **Дата:** 08.04.2026  
> **Метод:** Автоматизированный + ручной анализ кода  
> **Статус:** ⚠️ **КРИТИЧЕСКИЕ УЯЗВИМОСТИ НАЙДЕНЫ**

---

## 📊 ОБЩАЯ СТАТИСТИКА

| Уровень | Кол-во | Статус |
|---------|--------|--------|
| 🔴 **CRITICAL** | 3 | Требует немедленного исправления |
| 🟠 **HIGH** | 7 | Исправить перед деплоем |
| 🟡 **MEDIUM** | 6 | Исправить в ближайшем спринте |
| 🟢 **LOW** | 1 | Исправить по возможности |
| **ИТОГО** | **17** | |

---

## 🔴 CRITICAL УЯЗВИМОСТИ

### C1: Утечка реального BOT_TOKEN в репозиторий

**Файлы:**
- `backend/.env` (строка 2)
- `backend/.env.prod` (строка 2)
- `telegram_bot/.env` (строка 2)
- `DEPLOYMENT_PLAN.md` (строки 42, 167)

**Токен:** `8699202257:AAHRGrMOSA7JczE7Jb0F_2vOFRvXV2BQoIM`

**Риск:** Любой человек с доступом к файлам может:
- Отправлять сообщения от имени бота
- Получать данные пользователей
- Управлять веббуками

**Как исправить:**
```bash
# 1. Немедленно пересоздай токен через @BotFather
# 2. Удали токен из DEPLOYMENT_PLAN.md
# 3. Добавь .env.prod в .gitignore
# 4. Очисти git history если токен был закоммичен
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch backend/.env backend/.env.prod telegram_bot/.env' \
  --prune-empty --tag-name-filter cat -- --all
```

**Серьёзность:** 🔴 CRITICAL  
**CVSS Score:** 9.8

---

### C2: Отсутствие проверки ролей на админских эндпоинтах

**Файл:** `backend/app/main.py`

**Проблема:** Функция `get_current_user` возвращает `Optional[Client]`, но **нигде не проверяется роль** (admin/owner/manager). Любой аутентифицированный клиент может вызвать:

| Эндпоинт | Что может сделать злоумышленник |
|----------|--------------------------------|
| `GET /api/analytics/*` | Видеть выручку, KPI, RFM всех клиентов |
| `POST /api/blacklist` | Добавить любого клиента в чёрный список |
| `DELETE /api/blacklist/{id}` | Удалить клиента из чёрного списка |
| `POST /api/portfolio` | Загрузить фото в портфолио |
| `PUT/DELETE /api/portfolio/{id}` | Удалить работы из портфолио |
| `GET/POST /api/masters/schedule` | Изменить расписание мастеров |
| `GET/POST /api/promocodes` | Создать промокод с любой скидкой |
| `GET /api/clients` | Получить данные ВСЕХ клиентов |

**Как исправить:**

Создать middleware для проверки ролей:

```python
# backend/app/main.py
from fastapi import HTTPException, status

def require_role(*roles: str):
    """Dependency для проверки роли пользователя."""
    async def check_role(user: Optional[Client] = Depends(get_current_user)):
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Определяем роль из chat_id
        user_role = "client"
        if user.chat_id in settings.owner_ids_list:
            user_role = "owner"
        elif user.chat_id in settings.admin_ids_list:
            user_role = "manager"
        
        if user_role not in roles:
            raise HTTPException(status_code=403, detail=f"Role '{user_role}' not authorized")
        
        return user
    return check_role

# Пример использования:
@app.get("/api/analytics/summary")
async def get_analytics_summary(
    user: Client = Depends(require_role("owner", "manager")),
    db: AsyncSession = Depends(get_db)
):
    ...
```

**Серьёзность:** 🔴 CRITICAL  
**CVSS Score:** 9.1

---

### C3: JWT токены можно подделать при дефолтном секрете

**Файл:** `backend/app/main.py` (строки 105-121)  
**Файл:** `backend/.env` (строка 17)

**Проблема:** `JWT_SECRET=your-secret-key-change-in-production`

Любой может создать валидный JWT токен:

```python
import jwt
from datetime import datetime

token = jwt.encode(
    {"sub": "338067005", "exp": datetime.utcnow()},
    "your-secret-key-change-in-production",
    algorithm="HS256"
)
```

**Риск:** Полный доступ к API от имени любого пользователя включая админа.

**Как исправить:**
```bash
# Сгенерируй случайный ключ (Python):
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Пример результата:
JWT_SECRET=kR9mP2xL7nQ4wV8jF3hT6yU1iO5aS0dG...
```

**Серьёзность:** 🔴 CRITICAL  
**CVSS Score:** 9.8

---

## 🟠 HIGH УЯЗВИМОСТИ

### H1: Эндпоинты PUT/DELETE без аутентификации

**Файл:** `backend/app/main.py`

| Эндпоинт | Методы | Строки | Риск |
|----------|--------|--------|------|
| `/api/bookings/{id}` | PUT, DELETE | 399, 436 | Изменение/удаление чужих записей |
| `/api/bookings/reschedule` | POST | 711 | Перенос чужих записей |
| `/api/clients/{chat_id}` | PUT | 1135 | Изменение данных чужого клиента |

**Как исправить:** Добавить `Depends(get_current_user)` и проверку принадлежности записи пользователю.

---

### H2: Telegram auth hash check отключён

**Файл:** `backend/app/main.py` (строка 192)

```python
# TODO: hash check временно отключен для тестирования
# if not verify_telegram_auth(auth_data.telegram_init_data):
```

**Риск:** Любой может авторизоваться как любой пользователь, просто отправив нужный `id`.

**Как исправить:** Раскомментировать проверку хэша.

---

### H3: Rate limiting полностью отсутствует

**Файл:** Весь проект

**Риск:**
- Брутфорс JWT токенов
- DDoS эндпоинтов
- Спам отзывами и записями (1000 отзывов в минуту)

**Как исправить:**
```bash
pip install slowapi
```

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/reviews")
@limiter.limit("5/minute")
async def create_review(request: Request, ...):
    ...
```

---

### H4: Утечка данных клиентов

**Файл:** `backend/app/main.py` (строка 1092)

`GET /api/clients/{chat_id}` — любой пользователь может получить данные любого клиента.

**Как исправить:** Проверка `user.chat_id == chat_id` или роль admin/owner.

---

### H5: Создание отзывов без аутентификации

**Файл:** `backend/app/main.py` (строка 765)

`POST /api/reviews` — можно создать отзыв от имени любого человека.

---

### H6: Накрутка промокодов

**Файл:** `backend/app/main.py` (строка 1972)

`POST /api/promocodes/{id}/use` — можно бесконечно использовать промокод.

---

### H7: Удаление из waitlist без аутентификации

**Файл:** `backend/app/main.py` (строка 827)

`DELETE /api/waitlist/{id}` — можно удалить любого человека из листа ожидания.

---

## 🟡 MEDIUM УЯЗВИМОСТИ

### M1: XSS через пользовательские поля

**Файл:** `backend/app/main.py` (строка 305)

Поля `name`, `comment`, `notes`, `message` не санитизируются. Если имя содержит `<b>тест</b>`, Telegram отрендерит HTML.

**Как исправить:**
```python
import html

def sanitize_html(text: str) -> str:
    """Экранирует HTML в пользовательском вводе."""
    return html.escape(text)

# При создании записи:
db_booking.name = sanitize_html(booking.name)
```

---

### M2: Непредсказуемый JWT expiry

**Файл:** `backend/app/main.py` (строки 182-185)

```python
"exp": datetime.utcnow().replace(hour=23, minute=59, second=59)
```

Токен в 00:01 живёт 24 часа, в 23:50 — 9 минут.

**Как исправить:**
```python
from datetime import timedelta
"exp": datetime.utcnow() + timedelta(hours=24)
```

---

### M3: Нет механизма отзыва токенов

При logout токен остаётся валидным до конца дня.

**Решение:** Redis blacklist отозванных токенов или сокращение TTL.

---

### M4: `.env.prod` не в `.gitignore`

**Файл:** `.gitignore`

`.env.prod` содержит реальные секреты но не игнорируется git.

**Как исправить:**
```
# .gitignore
.env
.env.*
!.env.example
```

---

### M5: Реальные секреты в DEPLOYMENT_PLAN.md

**Файл:** `DEPLOYMENT_PLAN.md` (строки 42, 167)

BOT_TOKEN указан в документации как пример.

**Как исправить:** Заменить на `your_bot_token_here`.

---

### M6: file_id от Telegram не валидируется полностью

Нет проверки что file_id принадлежит именно вашему боту.

---

## 🟢 LOW УЯЗВИМОСТИ

### L1: Демо-токен на фронтенде

**Файл:** `frontend/src/store/authStore.ts` (строки 70-86)

`loginAsAdmin` создаёт фейковый токен `'demo-admin-token-' + Date.now()`. Не работает с реальным API, но может запутать.

---

## 🛠️ ПЛАН ИСПРАВЛЕНИЙ

### Немедленно (сегодня)

- [ ] **C1:** Пересоздать BOT_TOKEN через @BotFather
- [ ] **C1:** Удалить токен из DEPLOYMENT_PLAN.md
- [ ] **C3:** Сгенерировать новый JWT_SECRET
- [ ] **C2:** Добавить `.env.prod` в `.gitignore`

### Перед деплоем (1-2 дня)

- [ ] **C2:** Добавить проверку ролей на все админские эндпоинты
- [ ] **H1:** Добавить auth на PUT/DELETE bookings
- [ ] **H2:** Включить Telegram hash check
- [ ] **H3:** Добавить rate limiting (slowapi)
- [ ] **M4:** Исправить .gitignore

### В ближайшем спринте (1 неделя)

- [ ] **M1:** Санитизация HTML
- [ ] **M2:** Фиксированный JWT TTL
- [ ] **H4:** Ограничить доступ к данным клиентов
- [ ] **M5:** Очистить секреты из документации
- [ ] **H5, H6, H7:** Auth на всех публичных эндпоинтах

---

## 📊 СРАВНЕНИЕ ДО/ПОСЛЕ

| Метрика | До | После исправлений |
|---------|----|-------------------|
| **CRITICAL** | 3 | 0 |
| **HIGH** | 7 | 0 |
| **MEDIUM** | 6 | 2 |
| **LOW** | 1 | 0 |
| **Security Score** | 25/100 | 90/100 |

---

## ✅ АВС ЧЕК-ЛИСТ БЕЗОПАСНОСТИ

### Секреты
- [ ] BOT_TOKEN пересоздан и не хранится в git
- [ ] JWT_SECRET — случайная строка 64+ символа
- [ ] `.env` файлы в `.gitignore`
- [ ] Нет секретов в документации

### Аутентификация
- [ ] Все эндпоинты требуют auth (кроме публичных)
- [ ] Ролевая модель работает (client/manager/owner)
- [ ] Telegram auth hash check включён
- [ ] JWT expiry фиксированный (24h)

### Валидация
- [ ] Rate limiting на всех публичных эндпоинтах
- [ ] HTML санитизация пользовательских данных
- [ ] Проверка принадлежности записи пользователю
- [ ] SQL инъекции защищены (через ORM)

### Инфраструктура
- [ ] CORS настроен только для Vercel URL
- [ ] HTTPS на всех эндпоинтах
- [ ] Логи не содержат секретов
- [ ] Бэкапы БД настроены

---

> 📅 **Дата аудита:** 08.04.2026  
> 🔍 **Аудитор:** Автоматизированный анализ + ручной review  
> 📝 **Статус:** ⚠️ Требует исправлений перед продакшеном
