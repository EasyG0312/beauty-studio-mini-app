# 📋 ПОЛНОЦЕННЫЙ ПЛАН РАЗРАБОТКИ
## Beauty Studio Telegram Mini App

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ (MVP завершён)

### ✅ Реализовано
- [x] Backend API (FastAPI) — 15+ endpoints
- [x] Frontend (React + TypeScript) — 10 страниц
- [x] База данных (SQLite) — 8 таблиц
- [x] Telegram WebApp интеграция
- [x] JWT аутентификация
- [x] Ролевая модель (client/manager/owner)

---

## 🎯 ЭТАП 1: ЗАВЕРШЕНИЕ БАЗОВОГО ФУНКЦИОНАЛА (1-2 недели)

### 1.1 Исправление и доработка существующих функций

#### Backend
- [ ] **1.1.1** Добавить валидацию phone в BookingCreate (regex +996)
- [ ] **1.1.2** Добавить проверку CANCEL_HOURS (нельзя отменить менее чем за 5 часов)
- [ ] **1.1.3** Реализовать LOYALTY систему (автоматическое начисление после 5 визитов)
- [ ] **1.1.4** Добавить endpoint для переноса записи (reschedule)
- [ ] **1.1.5** Реализовать проверку BLACKLIST при создании записи
- [ ] **1.1.6** Добавить сортировку и фильтрацию в GET /api/bookings
- [ ] **1.1.7** Оптимизировать RFM-расчёт (кэширование, пересчёт раз в сутки)

#### Frontend
- [ ] **1.1.8** Добавить валидацию телефона (+996 XXX XXXXXX)
- [ ] **1.1.9** Реализовать перенос записи (кнопка в MyBookingsPage)
- [ ] **1.1.10** Добавить отображение статуса лояльности в профиле
- [ ] **1.1.11** Улучшить UI страницы отзывов (пагинация, фильтр по рейтингу)
- [ ] **1.1.12** Добавить поиск по клиентам в ManagerDashboard
- [ ] **1.1.13** Реализовать подтверждение действия при отмене записи

#### Схемы (schemas.py)
```python
# Добавить новые схемы:
class BookingReschedule(BaseModel):
    booking_id: int
    new_date: str
    new_time: str
    reason: Optional[str] = ""

class PhoneValidate(BaseModel):
    phone: str = Field(pattern=r'^\+996\d{9}$')

class LoyaltyStatus(BaseModel):
    chat_id: int
    visit_count: int
    is_loyal: bool
    discount_percent: int
    next_reward_at: int  # через сколько визитов
```

---

### 1.2 Напоминания и уведомления

#### Backend
- [ ] **1.2.1** Создать таблицу `notifications` (id, chat_id, message, send_at, sent, type)
- [ ] **1.2.2** Добавить endpoint GET /api/notifications/pending
- [ ] **1.2.3** Реализовать POST /api/notifications/send (интеграция с Telegram Bot API)
- [ ] **1.2.4** Создать фоновую задачу (APScheduler) для проверки напоминаний
- [ ] **1.2.5** Настроить расписание:
  - За 3 дня (reminded_3d)
  - За 1 день (reminded_1d)
  - За 1 час (reminded_1h)

#### Frontend
- [ ] **1.2.6** Добавить отображение статуса напоминаний в BookingResponse
- [ ] **1.2.7** Страница истории уведомлений (опционально)

#### Схемы
```python
class NotificationType(str, Enum):
    REMINDER_3D = "reminder_3d"
    REMINDER_1D = "reminder_1d"
    REMINDER_1H = "reminder_1h"
    CONFIRMATION = "confirmation"
    WAITLIST = "waitlist"
    LOYALTY = "loyalty"

class NotificationCreate(BaseModel):
    chat_id: int
    type: NotificationType
    message: str
    send_at: datetime

class NotificationResponse(BaseModel):
    id: int
    chat_id: int
    type: str
    message: str
    send_at: str
    sent: bool
    sent_at: Optional[str]
```

---

### 1.3 Портфолио и фото мастеров

#### Backend
- [ ] **1.3.1** Добавить endpoint POST /api/portfolio/upload (приём file_id из Telegram)
- [ ] **1.3.2** Реализовать загрузку через Telegram Bot API (get_file + download)
- [ ] **1.3.3** Добавить категорию фото (услуга: стрижка, маникюр, etc.)
- [ ] **1.3.4** Endpoint GET /api/portfolio/by-service/{service}
- [ ] **1.3.5** Реализовать мастер-фото (POST /api/masters/{master_id}/photo)

#### Frontend
- [ ] **1.3.6** Фильтр портфолио по услугам
- [ ] **1.3.7** Отображение фото мастеров при выборе в BookingPage
- [ ] **1.3.8** Lightbox для просмотра фото (modal на весь экран)

#### Схемы
```python
class PortfolioCategory(str, Enum):
    HAIRCUT = "haircut"
    MANICURE = "manicure"
    MAKEUP = "makeup"
    MASSAGE = "massage"
    COLORING = "coloring"

class PortfolioCreate(BaseModel):
    file_id: str
    category: PortfolioCategory
    description: Optional[str] = ""

class PortfolioWithUrl(PortfolioResponse):
    url: str  # публичный URL фото
    category: str
    description: Optional[str]

class MasterPhotoCreate(BaseModel):
    master: str
    file_id: str

class MasterWithPhoto(BaseModel):
    id: str
    name: str
    spec: str
    photo_url: Optional[str]
    rating: float
    completed_bookings: int
```

---

## 🚀 ЭТАП 2: ПРОДВИНУТЫЕ ФУНКЦИИ (2-3 недели)

### 2.1 Чат и коммуникация

#### Backend
- [ ] **2.1.1** WebSocket endpoint для real-time чата
- [ ] **2.1.2** История сообщений с пагинацией
- [ ] **2.1.3** Статус "печатает..."
- [ ] **2.1.4** Уведомления о новых сообщениях (push через Telegram)
- [ ] **2.1.5** Шаблоны ответов для менеджера (6 готовых)
- [ ] **2.1.6** Прикрепление фото к сообщению

#### Frontend
- [ ] **2.1.7** Real-time обновления чата (WebSocket)
- [ ] **2.1.8** Индикатор набора текста
- [ ] **2.1.9** Быстрые ответы (templates) для менеджера
- [ ] **2.1.10** Отображение статуса "онлайн"

#### Схемы
```python
class ChatTemplate(BaseModel):
    id: int
    name: str
    text: str
    category: str  # greeting, confirmation, cancellation

class MessageCreate(BaseModel):
    chat_id: int
    message: str
    file_id: Optional[str] = None
    template_id: Optional[int] = None

class MessageResponse(ChatMessageResponse):
    file_url: Optional[str] = None

class TypingStatus(BaseModel):
    chat_id: int
    is_typing: bool
```

---

### 2.2 Аналитика и отчётность

#### Backend
- [ ] **2.2.1** Экспорт аналитики в CSV/Excel
- [ ] **2.2.2** Email-отчёты владельцу (еженедельно)
- [ ] **2.2.3** Детализация KPI по периодам
- [ ] **2.2.4** Воронка конверсии (pending → confirmed → completed)
- [ ] **2.2.5** Коэффициент оттока клиентов (churn rate)
- [ ] **2.2.6** LTV клиента (lifetime value)
- [ ] **2.2.7** Тепловая карта загруженности (дни/время)

#### Frontend
- [ ] **2.2.8** Графики и диаграммы (Chart.js / Recharts)
- [ ] **2.2.9** Фильтры периодов для аналитики
- [ ] **2.2.10** Страница детальных отчётов
- [ ] **2.2.11** Сравнение периодов (WoW, MoM)

#### Схемы
```python
class ExportFormat(str, Enum):
    CSV = "csv"
    XLSX = "xlsx"

class ExportRequest(BaseModel):
    entity: str  # bookings, clients, revenue
    start_date: str
    end_date: str
    format: ExportFormat

class FunnelStats(BaseModel):
    total: int
    pending: int
    confirmed: int
    completed: int
    cancelled: int
    no_show: int
    conversion_rate: float

class ChurnRate(BaseModel):
    period_days: int
    total_clients: int
    churned_clients: int
    churn_rate: float

class LTVStats(BaseModel):
    avg_ltv: float
    median_ltv: float
    top_10_percent_ltv: float

class HeatmapData(BaseModel):
    day_of_week: int  # 0-6
    hour: str  # "09:00"
    bookings_count: int
    utilization_percent: float
```

---

### 2.3 Управление клиентами (CRM)

#### Backend
- [ ] **2.3.1** Сегментация клиентов (RFM уже есть, добавить теги)
- [ ] **2.3.2** Теги клиентов ("аллергия", "постоянный", "VIP")
- [ ] **2.3.3** История всех взаимодействий (записи + чат + отзывы)
- [ ] **2.3.4** Дни рождения клиентов (таблица client_profiles)
- [ ] **2.3.5** Автоматические поздравления со скидкой
- [ ] **2.3.6** Реактивация "уснувших" клиентов (не были 60+ дней)

#### Frontend
- [ ] **2.3.7** Карточка клиента с полной историей
- [ ] **2.3.8** Управление тегами
- [ ] **2.3.9** Фильтр клиентов по сегментам
- [ ] **2.3.10** Список дней рождений на месяц

#### Схемы
```python
class ClientTag(BaseModel):
    id: int
    name: str
    color: str  # hex color

class ClientTagAssign(BaseModel):
    chat_id: int
    tag_id: int

class ClientProfile(BaseModel):
    chat_id: int
    birthday: Optional[str]  # DD.MM
    preferred_master: Optional[str]
    preferred_time: Optional[str]
    allergies: Optional[str]
    notes: str

class ClientHistory(BaseModel):
    chat_id: int
    total_bookings: int
    total_spent: float
    first_visit: str
    last_visit: str
    avg_rating: float
    tags: List[str]
    reviews_count: int

class BirthdayClient(BaseModel):
    chat_id: int
    name: str
    phone: str
    birthday: str  # DD.MM
    days_until: int
    visit_count: int
```

---

## 💼 ЭТАП 3: БИЗНЕС-ФУНКЦИИ (2-3 недели)

### 3.1 Финансы и оплата

#### Backend
- [ ] **3.1.1** Интеграция платёжной системы (Stripe / CloudPayments / Кассирка)
- [ ] **3.1.2** Предоплата при записи (10-20%)
- [ ] **3.1.3** Возврат предоплаты при отмене
- [ ] **3.1.4** Таблица transactions
- [ ] **3.1.5** P&L отчёт (profit and loss)
- [ ] **3.1.6** Учёт расходов (аренда, зарплата, материалы)
- [ ] **3.1.7** Расчёт чистой прибыли

#### Frontend
- [ ] **3.1.8** Страница оплаты (интеграция виджета)
- [ ] **3.1.9** История платежей клиента
- [ ] **3.1.10** P&L дашборд для владельца
- [ ] **3.1.11** Учёт расходов (CRUD)

#### Схемы
```python
class PaymentMethod(str, Enum):
    CARD = "card"
    CASH = "cash"
    ONLINE = "online"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    REFUNDED = "refunded"
    FAILED = "failed"

class PaymentCreate(BaseModel):
    booking_id: int
    amount: float
    method: PaymentMethod
    is_prepayment: bool = False

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    method: str
    status: str
    created_at: str
    transaction_id: Optional[str]

class ExpenseCategory(str, Enum):
    RENT = "rent"
    SALARY = "salary"
    MATERIALS = "materials"
    TAXES = "taxes"
    MARKETING = "marketing"
    OTHER = "other"

class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: float
    description: str
    date: str

class PnLReport(BaseModel):
    period: str
    revenue: float
    expenses: float
    gross_profit: float
    net_profit: float
    margin_percent: float
```

---

### 3.2 Маркетинг и лояльность

#### Backend
- [ ] **3.2.1** Реферальная программа (приведи друга — скидка 10%)
- [ ] **3.2.2** Промокоды и скидки
- [ ] **3.2.3** Накопительная система баллов
- [ ] **3.2.4** Email/SMS рассылка по сегментам
- [ ] **3.2.5** Опросы и обратная связь
- [ ] **3.2.6** Программа "Приведи друга" (трекинг рефералов)

#### Frontend
- [ ] **3.2.7** Страница "Приведи друга" (реферальная ссылка)
- [ ] **3.2.8** Ввод промокода при записи
- [ ] **3.2.9** Баланс бонусных баллов
- [ ] **3.2.10** История начислений/списаний баллов

#### Схемы
```python
class Referral(BaseModel):
    id: int
    referrer_chat_id: int
    referred_chat_id: int
    bonus_earned: float
    created_at: str

class PromoCode(BaseModel):
    code: str
    discount_percent: int
    discount_amount: Optional[float]
    min_booking_amount: float
    valid_from: str
    valid_until: str
    usage_limit: int
    usage_count: int

class PromoCodeApply(BaseModel):
    code: str
    booking_id: int

class BonusBalance(BaseModel):
    chat_id: int
    balance: float
    earned_total: float
    spent_total: float

class BonusTransaction(BaseModel):
    chat_id: int
    amount: float  # + или -
    type: str  # earned, spent, expired
    reason: str
    booking_id: Optional[int]
    created_at: str
```

---

### 3.3 Расписание и управление слотами

#### Backend
- [ ] **3.3.1** Индивидуальное расписание мастеров (смены)
- [ ] **3.3.2** Выходные и праздники
- [ ] **3.3.3** Отпуска/больничные мастеров
- [ ] **3.3.4** Динамическое ценообразование (часы пик)
- [ ] **3.3.5** Длительность услуг (30/60/90 мин)
- [ ] **3.3.6** Буфер между записями (15 мин)

#### Frontend
- [ ] **3.3.7** Календарь смен мастеров
- [ ] **3.3.8** Отображение длительности услуги при записи
- [ ] **3.3.9** Учёт буферного времени
- [ ] **3.3.10** Календарь отпусков

#### Схемы
```python
class MasterSchedule(BaseModel):
    master: str
    day_of_week: int  # 0-6
    start_time: str  # "09:00"
    end_time: str  # "20:00"
    is_working: bool

class MasterTimeOff(BaseModel):
    master: str
    start_date: str
    end_date: str
    reason: str  # vacation, sick, personal

class ServiceDuration(BaseModel):
    service: str
    duration_minutes: int  # 30, 60, 90

class DynamicPricing(BaseModel):
    day_of_week: int
    hour: str
    multiplier: float  # 1.0, 1.2, 0.8

class BookingWithDuration(BaseModel):
    ...  # наследуется от BookingCreate
    duration_minutes: int
    buffer_minutes: int = 15
```

---

## 🔐 ЭТАП 4: БЕЗОПАСНОСТЬ И ПРОИЗВОДИТЕЛЬНОСТЬ (1-2 недели)

### 4.1 Безопасность

- [ ] **4.1.1** Rate limiting для API (Throttling)
- [ ] **4.1.2** CORS настройка для продакшена
- [ ] **4.1.3** HTTPS принудительно
- [ ] **4.1.4** Валидация всех входных данных
- [ ] **4.1.5** SQL injection защита (ORM уже использует)
- [ ] **4.1.6** XSS защита (sanitize input)
- [ ] **4.1.7** Secure JWT (rotation, refresh tokens)
- [ ] **4.1.8** Логирование подозрительной активности
- [ ] **4.1.9** GDPR compliance (удаление данных по запросу)

### 4.2 Производительность

- [ ] **4.2.1** Кэширование (Redis) для частых запросов
- [ ] **4.2.2** Индексы БД для всех фильтров
- [ ] **4.2.3** Lazy loading для больших списков
- [ ] **4.2.4** Пагинация всех list endpoints
- [ ] **4.2.5** Оптимизация изображений (сжатие)
- [ ] **4.2.6** CDN для статики
- [ ] **4.2.7** Database connection pooling
- [ ] **4.2.8** Асинхронные запросы к БД (уже используется)
- [ ] **4.2.9** Monitoring (Prometheus + Grafana)
- [ ] **4.2.10** Load testing (k6, Apache Bench)

### 4.3 Надёжность

- [ ] **4.3.1** Автоматические бэкапы БД (ежедневно)
- [ ] **4.3.2** Point-in-time recovery
- [ ] **4.3.3** Health check endpoints
- [ ] **4.3.4** Graceful shutdown
- [ ] **4.3.5** Retry logic для внешних API
- [ ] **4.3.6** Circuit breaker pattern
- [ ] **4.3.7** Error tracking (Sentry)
- [ ] **4.3.8** Uptime monitoring

---

## 📱 ЭТАП 5: МОБИЛЬНОЕ ПРИЛОЖЕНИЕ (опционально, 4-6 недель)

### 5.1 React Native приложение

- [ ] **5.1.1** Настройка React Native проекта
- [ ] **5.1.2** Интеграция с тем же API
- [ ] **5.1.3** Push уведомления (Firebase)
- [ ] **5.1.4** Биометрическая аутентификация
- [ ] **5.1.5** Offline режим (кэширование)
- [ ] **5.1.6** Deep linking
- [ ] **5.1.7** Публикация в App Store
- [ ] **5.1.8** Публикация в Google Play

---

## 🧪 ЭТАП 6: ТЕСТИРОВАНИЕ (постоянно)

### 6.1 Backend тесты

```bash
# Структура тестов
backend/tests/
├── conftest.py
├── test_auth.py
├── test_bookings.py
├── test_clients.py
├── test_analytics.py
├── test_chat.py
└── test_waitlist.py
```

- [ ] **6.1.1** Unit тесты для сервисов
- [ ] **6.1.2** Integration тесты для API endpoints
- [ ] **6.1.3** E2E тесты критических путей
- [ ] **6.1.4** Coverage > 80%
- [ ] **6.1.5** CI/CD пайплайн (GitHub Actions)

### 6.2 Frontend тесты

```bash
# Структура тестов
frontend/src/__tests__/
├── components/
├── pages/
├── services/
└── store/
```

- [ ] **6.2.1** Unit тесты компонентов (Jest + React Testing Library)
- [ ] **6.2.2** E2E тесты (Playwright / Cypress)
- [ ] **6.2.3** Visual regression тесты
- [ ] **6.2.4** Lighthouse audit > 90

---

## 📦 ЭТАП 7: ДЕПЛОЙ И ИНФРАСТРУКТУРА

### 7.1 Инфраструктура

```
┌─────────────────────────────────────────────┐
│              Cloudflare CDN                 │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│   Vercel       │   │   VPS / Render  │
│   (Frontend)   │   │   (Backend)     │
└────────────────┘   └────────┬────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL      │
                    │   (Managed DB)    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Redis           │
                    │   (Cache)         │
                    └───────────────────┘
```

- [ ] **7.1.1** Docker контейнеризация
- [ ] **7.1.2** Docker Compose для локальной разработки
- [ ] **7.1.3** Kubernetes манифесты (опционально)
- [ ] **7.1.4** CI/CD пайплайн
- [ ] **7.1.5** Staging окружение
- [ ] **7.1.6** Production окружение
- [ ] **7.1.7** Blue-green deployment
- [ ] **7.1.8** Rollback стратегия

### 7.2 Мониторинг

- [ ] **7.2.1** Логирование (ELK Stack / Papertrail)
- [ ] **7.2.2** Метрики (Prometheus + Grafana)
- [ ] **7.2.3** Alerting (PagerDuty / Telegram)
- [ ] **7.2.4** APM (New Relic / DataDog)
- [ ] **7.2.5** Uptime мониторинг (UptimeRobot)

---

## 📈 ЭТАП 8: МАСШТАБИРОВАНИЕ (будущее)

### 8.1 Мульти-салон

- [ ] **8.1.1** Поддержка нескольких салонов
- [ ] **8.1.2** Роли для сотрудников салонов
- [ ] **8.1.3** Общий пул клиентов
- [ ] **8.1.4** Кросс-салонная аналитика

### 8.2 Франшиза

- [ ] **8.2.1** White-label решение
- [ ] **8.2.2** Кастомизация бренда
- [ ] **8.2.3** Отдельные БД для клиентов
- [ ] **8.2.4** Централизованный биллинг

### 8.3 AI/ML фичи

- [ ] **8.3.1** Рекомендация услуг на основе истории
- [ ] **8.3.2** Предсказание no-show
- [ ] **8.3.3** Оптимальное ценообразование
- [ ] **8.3.4** Чат-бот для FAQ

---

## 📊 ПРИОРИТЕТЫ (ROADMAP)

### Месяц 1-2: Стабильность MVP
```
Приоритет 1 (критично):
├── 1.1 Валидация данных
├── 1.2 Напоминания
├── 1.3 Портфолио с фото
└── 6.1 Тесты backend

Приоритет 2 (важно):
├── 2.1 WebSocket чат
├── 2.3 CRM (карточка клиента)
└── 7.1 Docker + CI/CD
```

### Месяц 3-4: Рост
```
Приоритет 1:
├── 2.2 Аналитика (графики)
├── 3.2 Маркетинг (промокоды)
└── 3.3 Расписание (длительность)

Приоритет 2:
├── 3.1 Платежи
└── 4.1 Безопасность
```

### Месяц 5-6: Масштабирование
```
Приоритет 1:
├── 4.2 Производительность
├── 7.2 Мониторинг
└── 8.1 Мульти-салон

Приоритет 3:
└── 5.1 Mobile app
```

---

## 🎯 KRIs (Key Result Indicators)

| Метрика | Цель | Срок |
|---------|------|------|
| Uptime | > 99.5% | Постоянно |
| API Response Time | < 200ms | Месяц 2 |
| Page Load Time | < 2s | Месяц 2 |
| Test Coverage | > 80% | Месяц 3 |
| Active Users | 1000+ | Месяц 6 |
| Revenue | $10k/мес | Месяц 12 |

---

## 📝 ЗАКЛЮЧЕНИЕ

Этот план охватывает полный цикл разработки от MVP до масштабируемого продукта.

**Рекомендуемый подход:**
1. Начать с Этапа 1 (завершение базового функционала)
2. Параллельно писать тесты (Этап 6)
3. После стабилизации — Этап 2 (продвинутые функции)
4. Для продакшена обязателен Этап 4 (безопасность)
5. Этапы 5 и 8 — по мере роста бизнеса

**Оценка времени:**
- MVP готово ✅
- Этап 1-2: 1-2 месяца
- Этап 3-4: 2-3 месяца
- Этап 5+: по необходимости

**Команда:**
- 1 Backend разработчик
- 1 Frontend разработчик
- 1 QA инженер (part-time)
- 1 DevOps (part-time)
