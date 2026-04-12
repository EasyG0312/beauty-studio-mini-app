"""
ИНТЕРАКТИВНЫЙ ТЕСТ ПРОПУЩЕННЫХ ФУНКЦИЙ
Открывает каждую функцию и просит подтвердить что она работает
"""
import webbrowser
import time
import json

# Загрузка плана тестирования
with open("test_plan.json", "r", encoding="utf-8") as f:
    PLAN = json.load(f)

FRONTEND = PLAN["urls"]["frontend"]

results = {"passed": 0, "failed": 0, "skipped": 0, "tests": []}

def interactive_test(test_name, url, expected, section=""):
    """Интерактивный тест — открывает страницу и просит подтвердить."""
    full_url = f"{FRONTEND}{url}"
    print(f"\n{'─'*60}")
    print(f"📋 ТЕСТ: {test_name}")
    print(f"🔗 URL: {full_url}")
    print(f"👁️  Ожидание: {expected}")
    print(f"{'─'*60}")
    
    # Открываем страницу
    webbrowser.open(full_url)
    print(f"\n⏳ Открываю страницу... Подожди 3 секунды...")
    time.sleep(3)
    
    # Спрашиваем результат
    while True:
        choice = input("\nРезультат? [1=✅ Работает, 2=❌ Не работает, 3=⏭️ Пропустить]: ").strip()
        if choice == "1":
            results["passed"] += 1
            results["tests"].append({"name": test_name, "status": "✅", "section": section})
            print(f"  ✅ {test_name}: Работает!")
            return True
        elif choice == "2":
            results["failed"] += 1
            results["tests"].append({"name": test_name, "status": "❌", "section": section})
            print(f"  ❌ {test_name}: Не работает!")
            return False
        elif choice == "3":
            results["skipped"] += 1
            results["tests"].append({"name": test_name, "status": "⏭️", "section": section})
            print(f"  ⏭️  {test_name}: Пропущено")
            return None
        else:
            print("  Введи 1, 2 или 3")

# ============================================
# ГЛАВНЫЙ ЗАПУСК
# ============================================

print("="*60)
print("🧪 ИНТЕРАКТИВНЫЙ ТЕСТ ПРОПУЩЕННЫХ ФУНКЦИЙ")
print(f"🌐 Frontend: {FRONTEND}")
print("="*60)
print("\n⚠️  Я буду открывать каждую страницу в браузере.")
print("⚠️  Ты проверяешь что работает и нажимаешь 1/2/3.")
print("\n🚀 Начинаем? Нажми Enter...")
input()

# 1. Главная страница — визуальные тесты
print("\n" + "="*60)
print("👤 КЛИЕНТ — Главная страница")
print("="*60)

interactive_test(
    "Stories отображаются", "/",
    "Горизонтальный скролл кружков вверху страницы",
    "Клиент/Главная страница"
)

interactive_test(
    "Баннер скидки", "/",
    "Золотой баннер 'Скидка 10%' с кнопкой 'Записаться'",
    "Клиент/Главная страница"
)

interactive_test(
    "Карточки категорий", "/",
    "4 карточки: Стрижки, Маникюр, Макияж, Массаж",
    "Клиент/Главная страница"
)

interactive_test(
    "Топ мастеров", "/",
    "Горизонтальный скролл карточек мастеров",
    "Клиент/Главная страница"
)

interactive_test(
    "Блок Ещё", "/",
    "Кнопки: Лист ожидания, Чат, Лояльность",
    "Клиент/Главная страница"
)

interactive_test(
    "Контакты", "/",
    "Адрес, телефон, часы работы",
    "Клиент/Главная страница"
)

# 2. Запись на услугу — интерактивные тесты
print("\n" + "="*60)
print("📅 Запись на услугу")
print("="*60)

interactive_test(
    "Шаг 1: Выбор даты", "/booking",
    "Календарь на 7 дней вперёд",
    "Клиент/Запись на услугу"
)

interactive_test(
    "Шаг 2: Выбор мастера", "/booking",
    "Список мастеров (Айгуль, Диана, и т.д.)",
    "Клиент/Запись на услугу"
)

interactive_test(
    "Шаг 3: Выбор услуги", "/booking",
    "Список услуг с ценами",
    "Клиент/Запись на услугу"
)

interactive_test(
    "Шаг 4: Выбор времени", "/booking",
    "Сетка слотов (09:00, 10:00, ...)",
    "Клиент/Запись на услугу"
)

interactive_test(
    "Шаг 5: Данные клиента", "/booking",
    "Поля: Имя, Телефон, Комментарий",
    "Клиент/Запись на услугу"
)

# 3. Мои записи
print("\n" + "="*60)
print("📋 Мои записи")
print("="*60)

interactive_test(
    "Перенос записи", "/my-bookings",
    "Кнопка '↻ Перенести' на карточке записи",
    "Клиент/Мои записи"
)

# 4. Отзывы
print("\n" + "="*60)
print("⭐ Отзывы")
print("="*60)

interactive_test(
    "Фильтр по рейтингу", "/reviews",
    "Кнопки фильтра: 5★, 4★, 3★...",
    "Клиент/Отзывы"
)

# 5. Портфолио
print("\n" + "="*60)
print("📸 Портфолио")
print("="*60)

interactive_test(
    "Lightbox просмотр", "/portfolio",
    "При клике на фото — полноэкранный просмотр",
    "Клиент/Портфолио"
)

# 6. FAQ
print("\n" + "="*60)
print("❓ FAQ")
print("="*60)

interactive_test(
    "Список вопросов", "/faq",
    "Раскрывающиеся accordion вопросы",
    "Клиент/FAQ"
)

interactive_test(
    "Раскрытие ответа", "/faq",
    "При клике на вопрос — показывается ответ",
    "Клиент/FAQ"
)

# 7. Услуги и цены
print("\n" + "="*60)
print("💇 Услуги и цены")
print("="*60)

interactive_test(
    "Список услуг", "/services",
    "5 услуг с ценами и описаниями",
    "Клиент/Услуги и цены"
)

interactive_test(
    "Список мастеров", "/services",
    "4 мастера со специализацией и рейтингом",
    "Клиент/Услуги и цены"
)

# 8. Панель менеджера
print("\n" + "="*60)
print("👨‍💼 Панель менеджера")
print("="*60)

interactive_test(
    "Дашборд записей", "/manager",
    "Список записей на сегодня со статусами",
    "Менеджер/Панель менеджера"
)

interactive_test(
    "Bulk подтверждение", "/manager",
    "Кнопка 'Подтвердить все'",
    "Менеджер/Панель менеджера"
)

# 9. Аналитика — визуальные тесты
print("\n" + "="*60)
print("👑 Аналитика владельца")
print("="*60)

interactive_test(
    "Выручка за период", "/analytics",
    "График/цифры выручки за 7/30/90 дней",
    "Владелец/Аналитика"
)

interactive_test(
    "Конверсия", "/analytics",
    "Процент конверсии (pending → completed)",
    "Владелец/Аналитика"
)

interactive_test(
    "Средний чек", "/analytics",
    "Число среднего чека",
    "Владелец/Аналитика"
)

interactive_test(
    "Завершённые записи (KPI)", "/analytics",
    "Число завершённых записей по мастеру",
    "Владелец/KPI мастеров"
)

interactive_test(
    "Выручка по мастеру (KPI)", "/analytics",
    "Сумма выручки по каждому мастеру",
    "Владелец/KPI мастеров"
)

interactive_test(
    "Рейтинг мастера (KPI)", "/analytics",
    "Средний рейтинг каждого мастера",
    "Владелец/KPI мастеров"
)

interactive_test(
    "Конверсия мастера (KPI)", "/analytics",
    "Процент конверсии каждого мастера",
    "Владелец/KPI мастеров"
)

interactive_test(
    "Отмены / No-show (KPI)", "/analytics",
    "Число отмен и неявок по мастеру",
    "Владелец/KPI мастеров"
)

interactive_test(
    "Champions (RFM)", "/analytics",
    "Список 'Champions' клиентов",
    "Владелец/RFM Сегментация"
)

interactive_test(
    "Loyal Customers (RFM)", "/analytics",
    "Список 'Loyal Customers'",
    "Владелец/RFM Сегментация"
)

interactive_test(
    "At Risk (RFM)", "/analytics",
    "Список 'At Risk' клиентов",
    "Владелец/RFM Сегментация"
)

interactive_test(
    "Lost (RFM)", "/analytics",
    "Список 'Lost' клиентов",
    "Владелец/RFM Сегментация"
)

interactive_test(
    "Загруженность (Тепловая карта)", "/analytics",
    "Матрица день×час с цветовой индикацией",
    "Владелец/Тепловая карта"
)

# ============================================
# ИТОГОВЫЙ ОТЧЁТ
# ============================================

print("\n" + "="*60)
print("📊 ИТОГОВЫЙ ОТЧЁТ — ИНТЕРАКТИВНЫЕ ТЕСТЫ")
print("="*60)

total = results["passed"] + results["failed"] + results["skipped"]
print(f"✅ Пройдено:       {results['passed']}")
print(f"❌ Провалено:      {results['failed']}")
print(f"⏭️  Пропущено:      {results['skipped']}")
print(f"📊 Всего тестов:   {total}")

pct = round((results["passed"] / (results["passed"] + results["failed"]) * 100)) if (results["passed"] + results["failed"]) > 0 else 0
print(f"📈 Процент успеха: {pct}%")

# По секциям
sections = {}
for t in results["tests"]:
    sec = t.get("section", "Unknown")
    if sec not in sections:
        sections[sec] = {"passed": 0, "failed": 0, "skipped": 0}
    if t["status"] == "✅":
        sections[sec]["passed"] += 1
    elif t["status"] == "❌":
        sections[sec]["failed"] += 1
    else:
        sections[sec]["skipped"] += 1

print(f"\n📋 ПО СЕКЦИЯМ:")
print(f"{'Секция':<45} {'✅':>4} {'❌':>4} {'⏭️':>4}")
print("-" * 60)
for sec, counts in sorted(sections.items()):
    print(f"{sec:<45} {counts['passed']:>4} {counts['failed']:>4} {counts['skipped']:>4}")

print("\n" + "="*60)
if pct >= 90:
    print("🎉 ОТЛИЧНО! Визуальные тесты прошли успешно!")
elif pct >= 70:
    print("⚠️ ХОРОШО. Есть проблемы, но основное работает.")
else:
    print("❌ ПЛОХО. Нужно исправить.")
print("="*60)

# Сохранение результатов
with open("interactive_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\n💾 Результаты сохранены в interactive_test_results.json")

print("\nНажми Enter для выхода...")
input()
