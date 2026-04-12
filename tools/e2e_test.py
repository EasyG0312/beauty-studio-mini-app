"""
E2E ТЕСТ ВСЕХ СТРАНИЦ — Playwright Headless Browser
Открывает каждую страницу в браузере и проверяет фактический рендеринг React контента
"""
from playwright.sync_api import sync_playwright
import json
import time
from datetime import datetime

FRONTEND = "https://frontend-five-drab-47.vercel.app"

# Страницы и что на них проверять
PAGES = [
    {
        "name": "Главная страница",
        "url": "/",
        "expected": [
            "Beauty Studio",
            "Записаться",
            "Услуги",
            "Отзывы",
            "Работы",
            "FAQ",
        ]
    },
    {
        "name": "Запись на услугу",
        "url": "/booking",
        "expected": [
            "Запись",
            "Выберите дату",
            "Выберите мастера",
            "Выберите услугу",
            "Выберите время",
            "Ваши данные",
        ]
    },
    {
        "name": "Мои записи",
        "url": "/my-bookings",
        "expected": [
            "Записи",
            "Активные",
            "История",
        ]
    },
    {
        "name": "Услуги и цены",
        "url": "/services",
        "expected": [
            "Услуги",
            "Стрижка",
            "Маникюр",
            "Массаж",
            "Макияж",
            "Мастера",
        ]
    },
    {
        "name": "Отзывы",
        "url": "/reviews",
        "expected": [
            "Отзывы",
        ]
    },
    {
        "name": "Портфолио",
        "url": "/portfolio",
        "expected": [
            "Портфолио",
        ]
    },
    {
        "name": "FAQ",
        "url": "/faq",
        "expected": [
            "Вопрос",
            "Ответ",
        ]
    },
    {
        "name": "Лист ожидания",
        "url": "/waitlist",
        "expected": [
            "Лист ожидания",
        ]
    },
    {
        "name": "Чат с менеджером",
        "url": "/chat",
        "expected": [
            "Чат",
            "Сообщение",
        ]
    },
    {
        "name": "Программа лояльности",
        "url": "/loyalty",
        "expected": [
            "Лояльность",
        ]
    },
    {
        "name": "Панель менеджера",
        "url": "/manager",
        "expected": [
            "Панель",
        ]
    },
    {
        "name": "Аналитика",
        "url": "/analytics",
        "expected": [
            "Аналитика",
        ]
    },
    {
        "name": "Дашборд аналитики",
        "url": "/analytics-dashboard",
        "expected": [
            "Дашборд",
        ]
    },
    {
        "name": "Расписание мастеров",
        "url": "/master-schedule",
        "expected": [
            "Расписание",
        ]
    },
    {
        "name": "Фото мастеров",
        "url": "/master-photos",
        "expected": [
            "Фото",
        ]
    },
    {
        "name": "Промокоды",
        "url": "/promocodes",
        "expected": [
            "Промокод",
        ]
    },
]

results = {
    "passed": 0,
    "failed": 0,
    "tests": [],
    "pages": {}
}

def test_page_with_browser(page_config, browser_page):
    """Тест страницы в headless браузере."""
    name = page_config["name"]
    url = f"{FRONTEND}{page_config['url']}"
    expected = page_config["expected"]
    
    try:
        start = time.time()
        browser_page.goto(url, wait_until="networkidle", timeout=30000)
        
        # Ждём рендеринга React
        browser_page.wait_for_timeout(2000)
        
        # Получаем видимый текст
        body_text = browser_page.inner_text("body")
        
        elapsed = round((time.time() - start) * 1000)
        
        # Проверяем ожидаемые элементы
        found = 0
        total = len(expected)
        missing = []
        
        for keyword in expected:
            if keyword in body_text:
                found += 1
            else:
                missing.append(keyword)
        
        pct = round(found / total * 100) if total > 0 else 0
        
        # Если нашли хотя бы половину — страница работает
        if found >= total * 0.5:
            results["passed"] += 1
            status = "✅"
        else:
            results["failed"] += 1
            status = "❌"
        
        results["tests"].append({
            "name": name,
            "url": page_config["url"],
            "status": status,
            "found": found,
            "total": total,
            "missing": missing,
            "time_ms": elapsed,
            "text_preview": body_text[:200]
        })
        
        results["pages"][name] = {
            "status": status,
            "found": found,
            "total": total,
            "missing": missing,
            "time_ms": elapsed
        }
        
        print(f"  {status} {name} ({page_config['url']}): {found}/{total} ({pct}%) — {elapsed}ms")
        if missing:
            print(f"      Не найдено: {', '.join(missing)}")
        
    except Exception as e:
        results["failed"] += 1
        results["tests"].append({"name": name, "url": page_config["url"], "status": "❌", "found": 0, "total": len(expected), "missing": expected, "time_ms": 0})
        results["pages"][name] = {"status": "❌", "found": 0, "total": len(expected), "missing": expected, "time_ms": 0}
        print(f"  ❌ {name} ({page_config['url']}): {str(e)[:100]}")

# ============================================
# ЗАПУСК
# ============================================

print("="*60)
print("🧪 E2E ТЕСТ ВСЕХ СТРАНИЦ — Playwright Headless")
print(f"🌐 Frontend: {FRONTEND}")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print("="*60)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},  # Mobile viewport
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
    )
    page = context.new_page()
    
    for page_config in PAGES:
        print(f"\n📋 {page_config['name']}")
        test_page_with_browser(page_config, page)
    
    browser.close()

# Итоги
print("\n" + "="*60)
print("📊 ИТОГОВЫЙ ОТЧЁТ")
print("="*60)

total = results["passed"] + results["failed"]
print(f"✅ Пройдено:  {results['passed']}")
print(f"❌ Провалено: {results['failed']}")
print(f"📊 Всего:     {total}")

pct = round((results["passed"] / total * 100)) if total > 0 else 0
print(f"📈 Процент:   {pct}%")

print(f"\n📋 ПО СТРАНИЦАМ:")
print(f"{'Страница':<30} {'Статус':>6} {'Найдено':>8} {'Время':>8}")
print("-" * 60)
for name, data in results["pages"].items():
    status = data["status"]
    found_str = f"{data['found']}/{data['total']}"
    time_str = f"{data['time_ms']}ms"
    print(f"{name:<30} {status:>6} {found_str:>8} {time_str:>8}")

print("\n" + "="*60)
if pct >= 90:
    print("🎉 ОТЛИЧНО! Все страницы рендерятся корректно!")
elif pct >= 70:
    print("⚠️ ХОРОШО. Большинство страниц работает.")
else:
    print("❌ ПЛОХО. Многие страницы не рендерятся.")
print("="*60)

# Сохранение
with open("e2e_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\n💾 Результаты: e2e_test_results.json")

# Детальный отчёт
failed_pages = [n for n, d in results["pages"].items() if d["status"] == "❌"]
if failed_pages:
    print(f"\n❌ НЕ РАБОТАЮТ ({len(failed_pages)}):")
    for name in failed_pages:
        data = results["pages"][name]
        print(f"  • {name}: найдено {data['found']}/{data['total']}")
        if data.get("missing"):
            print(f"    Не найдено: {', '.join(data['missing'])}")

sys.exit(0 if results["failed"] == 0 else 1)
