# 🎨 BEAUTY STUDIO - MODERN DESIGN SYSTEM

## ✨ ОБЗОР

Современная, красивая дизайн-система с полной кастомизацией для Beauty Studio Mini App.

**Особенности:**
- 🎨 Градиенты и тени для глубины
- 🌈 Бренд-цвета (Pink/Purple)
- 🌓 Авто-темная тема
- 📱 Адаптивность под iOS/Android
- ⚡ Плавные анимации
- 🧩 Модульные компоненты

---

## 🎨 ЦВЕТОВАЯ ПАЛИТРА

### Бренд-цвета
```css
--brand-primary: #E91E8C        /* Pink - основной */
--brand-primary-light: #F472B6
--brand-primary-dark: #C2185B
--brand-gradient: linear-gradient(135deg, #E91E8C, #EC469D)

--brand-accent: #9C27B0          /* Purple - акцент */
```

### Семантические цвета
```css
--color-success: #10B981  /* Зелёный */
--color-warning: #F59E0B  /* Оранжевый */
--color-danger: #EF4444   /* Красный */
--color-info: #3B82F6     /* Синий */
```

### Нейтральные (Grays)
```css
--gray-50: #F9FAFB  до --gray-900: #111827
```

---

## 🧩 КОМПОНЕНТЫ

### Button

**Базовое использование:**
```tsx
<Button>Нажми меня</Button>
```

**Варианты:**
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
<Button variant="ghost">Ghost</Button>
```

**Размеры:**
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

**С иконками:**
```tsx
<Button leftIcon="📅">Записаться</Button>
<Button rightIcon="➤">Далее</Button>
```

**С загрузкой:**
```tsx
<Button loading>Загрузка...</Button>
```

**Полная ширина:**
```tsx
<Button fullWidth>На всю ширину</Button>
```

---

### Card

**Базовый:**
```tsx
<Card>
  <h3>Заголовок</h3>
  <p>Содержимое</p>
</Card>
```

**С тенью (Elevated):**
```tsx
<Card elevated>
  Контент с тенью
</Card>
```

**Интерактивный:**
```tsx
<Card interactive onClick={handleClick}>
  Кликабельная карточка
</Card>
```

**С рамкой (Bordered):**
```tsx
<Card bordered>
  Карточка с рамкой
</Card>
```

---

### Input

**Базовый:**
```tsx
<Input placeholder="Введите имя" />
```

**С лейблом:**
```tsx
<Input label="Имя" placeholder="Ваше имя" />
```

**С иконкой:**
```tsx
<Input 
  label="Телефон"
  leftIcon="📞"
  placeholder="+996 XXX XXXXXX"
/>
```

**С ошибкой:**
```tsx
<Input 
  label="Email"
  error="Неверный формат email"
  type="email"
/>
```

---

### EmptyState

**Базовый:**
```tsx
<EmptyState
  icon="📭"
  title="Пусто"
  description="Здесь пока ничего нет"
/>
```

**С действием:**
```tsx
<EmptyState
  icon="📅"
  title="Нет записей"
  description="Запишитесь на удобное время"
  action={
    <Button onClick={handleBook}>
      Записаться
    </Button>
  }
/>
```

---

### Badge

**Статусы:**
```tsx
<Badge status="pending">Ожидает</Badge>
<Badge status="confirmed">Подтверждено</Badge>
<Badge status="completed">Завершено</Badge>
<Badge status="cancelled">Отменено</Badge>
<Badge status="no_show">Не явился</Badge>
```

---

## 📐 СЕТКА И МАКЕТ

### Grid
```tsx
<div className="grid grid-cols-2" style={{ gap: '12px' }}>
  <Card>1</Card>
  <Card>2</Card>
</div>
```

### Flex
```tsx
<div className="flex items-center gap-2">
  <span>Текст</span>
  <Button>Действие</Button>
</div>
```

---

## 🎭 АНИМАЦИИ

### Переходы
```css
--transition-fast: 150ms
--transition-normal: 200ms
--transition-slow: 300ms
--transition-bounce: 500ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

### Эффекты
- Кнопки: scale(0.97) при нажатии
- Карточки: translateY(-2px) при hover
- Модальные окна: slideUp + fadeIn

---

## 🌗 ТЁМНАЯ ТЕМА

Автоматически определяется через `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  --tg-theme-bg-color: #000000;
  --tg-theme-text-color: #ffffff;
  /* ... */
}
```

**Ручное переключение:** (опционально)
```tsx
// Можно добавить через Telegram WebApp themeParams
```

---

## 📱 АДАПТИВНОСТЬ

### Safe Area (iOS)
```css
padding-bottom: calc(80px + env(safe-area-inset-bottom));
```

### Touch Targets
- Минимальный размер: 44x44px
- Кнопки: padding 14px 28px

---

## 🎨 КАСТОМИЗАЦИЯ

### Изменить бренд-цвет
```css
:root {
  --brand-primary: #YOUR_COLOR;
  --brand-gradient: linear-gradient(135deg, #COLOR1, #COLOR2);
}
```

### Изменить радиусы
```css
:root {
  --radius-lg: 20px;  /* Было 16px */
}
```

### Изменить тени
```css
:root {
  --shadow-md: 0 8px 12px rgba(0,0,0,0.15);
}
```

---

## 📊 УТИЛИТЫ

### Текст
```tsx
<p className="text-hint">Серый текст</p>
<p className="text-primary">Брендовый цвет</p>
<p className="text-success">Зелёный</p>
```

### Отступы
```tsx
<div className="mt-4">Margin top 16px</div>
<div className="mb-6">Margin bottom 24px</div>
<div className="gap-2">Gap 8px</div>
```

### Размер текста
```tsx
<p className="text-xs">12px</p>
<p className="text-sm">14px</p>
<p className="text-base">16px</p>
<p className="text-lg">18px</p>
<p className="text-xl">20px</p>
```

### Жирность
```tsx
<p className="font-medium">500</p>
<p className="font-semibold">600</p>
<p className="font-bold">700</p>
```

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Карточка услуги
```tsx
<Card interactive elevated>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: 'var(--brand-gradient)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '20px',
    }}>
      💇
    </div>
    <div style={{ flex: 1 }}>
      <h3 style={{ margin: 0 }}>Стрижка</h3>
      <p className="text-hint" style={{ margin: 0 }}>от 1200 сом</p>
    </div>
    <Button size="sm">Записаться</Button>
  </div>
</Card>
```

### Форма записи
```tsx
<Card elevated>
  <h2>Запись</h2>
  
  <Input
    label="Имя"
    placeholder="Ваше имя"
    leftIcon="👤"
  />
  
  <Input
    label="Телефон"
    placeholder="+996 XXX XXXXXX"
    leftIcon="📞"
    type="tel"
  />
  
  <div className="grid grid-cols-2" style={{ gap: '12px' }}>
    <Button>Отмена</Button>
    <Button leftIcon="✏️">Записаться</Button>
  </div>
</Card>
```

### Список с пустым состоянием
```tsx
{items.length === 0 ? (
  <Card>
    <EmptyState
      icon="📋"
      title="Список пуст"
      description="Здесь пока ничего нет"
      action={
        <Button onClick={handleAdd}>
          Добавить
        </Button>
      }
    />
  </Card>
) : (
  items.map(item => (
    <Card key={item.id} interactive>
      <h3>{item.name}</h3>
      <p className="text-hint">{item.description}</p>
    </Card>
  ))
)}
```

---

## 🚀 БЫСТРЫЙ СТАРТ

### 1. Импорт компонентов
```tsx
import Button from './components/Button';
import Card from './components/Card';
import Input from './components/Input';
import EmptyState from './components/EmptyState';
import Badge from './components/Badge';
```

### 2. Использование
```tsx
export default function MyPage() {
  return (
    <div className="page">
      <Card elevated>
        <h1>Заголовок</h1>
        <Input label="Имя" placeholder="Введите имя" />
        <Button fullWidth leftIcon="✏️">
          Сохранить
        </Button>
      </Card>
    </div>
  );
}
```

---

## 📊 СТАТИСТИКА

| Метрика | Значение |
|---------|----------|
| CSS переменных | 100+ |
| Компонентов | 6 |
| Утилит классов | 50+ |
| Размер CSS | 14.4 KB |
| Поддержка тем | ✅ Авто |
| Анимации | ✅ Плавные |

---

## 🎨 ЦВЕТОВЫЕ СХЕМЫ

### Beauty Studio (Текущая)
- Primary: Pink (#E91E8C)
- Accent: Purple (#9C27B0)
- Стиль: Градиенты, тени

### Минимализм (Альтернатива)
```css
--brand-primary: #000000;
--brand-gradient: linear-gradient(135deg, #000, #333);
```

### Nature (Альтернатива)
```css
--brand-primary: #10B981;
--brand-gradient: linear-gradient(135deg, #10B981, #059669);
```

### Ocean (Альтернатива)
```css
--brand-primary: #3B82F6;
--brand-gradient: linear-gradient(135deg, #3B82F6, #2563EB);
```

---

## 🎯 ИТОГ

**Дизайн-система готова к использованию!**

**Что включено:**
- ✅ 100+ CSS переменных
- ✅ 6 базовых компонентов
- ✅ 50+ утилит
- ✅ Авто-темная тема
- ✅ Плавные анимации
- ✅ Адаптивность

**Кастомизация:**
- Изменить цвета: 1 строка в CSS
- Добавить компонент: 1 файл
- Изменить стиль: CSS переменные

**Файлы:**
- `frontend/src/index.css` - дизайн-система
- `frontend/src/components/` - компоненты
- `DESIGN_SYSTEM.md` - эта документация
