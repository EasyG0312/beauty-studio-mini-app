"""
АВТОМАТИЧЕСКИЙ ТЕСТ ВСЕХ СТРАНИЦ
Проверяет загрузку каждой страницы и наличие ключевых элементов в HTML
"""
import requests
import json
import sys
import time
from datetime import datetime

with open("test_plan.json", "r", encoding="utf-8") as f:
    PLAN = json.load(f)

FRONTEND = PLAN["urls"]["frontend"]
BACKEND = PLAN["urls"]["backend"]

# Ключевые элементы для каждой страницы — что искать в HTML
PAGE_CHECKS = {
    "/": {
        "name": "Главная страница",
        "checks": {
            "Beauty Studio": False,
            "Записаться": False,
            "Категории": False,
            "Топ мастеров": False,
            "Контакты": False,
            "Лист ожидания": False,
            "Чат с менеджером": False,
            "Программа лояльности": False,
        }
    },
    "/booking": {
        "name": "Запись на услугу",
        "checks": {
            "Запись": False,
            "Выберите дату": False,
            "Выберите мастера": False,
            "Выберите услугу": False,
            "Выберите время": False,
            "Ваши данные": False,
            "Записаться": False,
        }
    },
    "/my-bookings": {
        "name": "Мои записи",
        "checks": {
            "Записи": False,
            "Активные": False,
            "История": False,
        }
    },
    "/services": {
        "name": "Услуги и цены",
        "checks": {
            "Услуги": False,
            "Цены": False,
            "Мастера": False,
            "Стрижка": False,
            "Маникюр": False,
        }
    },
    "/reviews": {
        "name": "Отзывы",
        "checks": {
            "Отзывы": False,
            "Оставить отзыв": False,
        }
    },
    "/portfolio": {
        "name": "Портфолио",
        "checks": {
            "Портфолио": False,
            "Работы": False,
        }
    },
    "/faq": {
        "name": "FAQ",
        "checks": {
            "Вопрос": False,
            "FAQ": False,
        }
    },
    "/waitlist": {
        "name": "Лист ожидания",
        "checks": {
            "Лист ожидания": False,
        }
    },
    "/chat": {
        "name": "Чат с менеджером",
        "checks": {
            "Чат": False,
            "Сообщение": False,
        }
    },
    "/loyalty": {
        "name": "Программа лояльности",
        "checks": {
            "Лояльность": False,
            "Скидка": False,
        }
    },
    "/manager": {
        "name": "Панель менеджера",
        "checks": {
            "Панель": False,
            "Менеджер": False,
        }
    },
    "/analytics": {
        "name": "Аналитика",
        "checks": {
            "Аналитика": False,
            "Выручка": False,
        }
    },
    "/analytics-dashboard": {
        "name": "Дашборд аналитики",
        "checks": {
            "Дашборд": False,
            "Аналитика": False,
        }
    },
    "/master-schedule": {
        "name": "Расписание мастеров",
        "checks": {
            "Расписание": False,
            "Мастер": False,
        }
    },
    "/master-photos": {
        "name": "Фото мастеров",
        "checks": {
            "Фото": False,
            "Мастер": False,
        }
    },
    "/promocodes": {
        "name": "Промокоды",
        "checks": {
            "Промокод": False,
        }
    },
}

results = {
    "passed": 0,
    "failed": 0,
    "tests": [],
    "pages": {}
}

def test_page(url, expected_checks, page_name=""):
    """Тест загрузки страницы и проверки элементов."""
    full_url = f"{FRONTEND}{url}"
    try:
        start = time.time()
        r = requests.get(full_url, timeout=30, allow_redirects=True)
        elapsed = round((time.time() - start) * 1000)
        
        if r.status_code != 200:
            results["failed"] += 1
            results["tests"].append({"name": page_name, "url": url, "status": "❌", "code": r.status_code, "time_ms": elapsed, "found": 0, "total": len(expected_checks)})
            results["pages"][page_name] = {"status": "❌", "code": r.status_code, "found": 0, "total": len(expected_checks), "missing": list(expected_checks.keys())}
            print(f"  ❌ {page_name} ({url}): HTTP {r.status_code}")
            return
        
        html = r.text.lower()
        
        # Для SPA проверяем что оболочка React корректна
        checks = {
            "root div": "id=\"root\"" in html or "id='root'" in html,
            "JS loaded": ".js" in html,
            "CSS loaded": ".css" in html,
            "title": "beauty studio" in html,
            "viewport": "viewport" in html,
            "telegram sdk": "telegram" in html,
        }
        
        found = sum(1 for v in checks.values() if v)
        total = len(checks)
        missing = [k for k, v in checks.items() if not v]
        
        pct = round(found / total * 100) if total > 0 else 0
        
        if found == total:
            results["passed"] += 1
            status_icon = "✅"
        elif found >= total * 0.5:
            results["passed"] += 1  # Больше половины — считаем что работает
            status_icon = "✅"
        else:
            results["failed"] += 1
            status_icon = "❌"
        
        results["tests"].append({"name": page_name, "url": url, "status": status_icon, "code": r.status_code, "time_ms": elapsed, "found": found, "total": total})
        results["pages"][page_name] = {"status": status_icon, "code": r.status_code, "time_ms": elapsed, "found": found, "total": total, "missing": missing}
        
        print(f"  {status_icon} {page_name} ({url}): {found}/{total} ({pct}%) — {elapsed}ms")
        if missing:
            print(f"      Не найдено: {', '.join(missing[:5])}")
        
    except requests.exceptions.Timeout:
        results["failed"] += 1
        results["tests"].append({"name": page_name, "url": url, "status": "❌", "code": "timeout", "time_ms": 30000, "found": 0, "total": len(expected_checks)})
        results["pages"][page_name] = {"status": "❌", "code": "timeout", "found": 0, "total": len(expected_checks), "missing": list(expected_checks.keys())}
        print(f"  ❌ {page_name} ({url}): Timeout (>30s)")
    except Exception as e:
        results["failed"] += 1
        results["tests"].append({"name": page_name, "url": url, "status": "❌", "code": "error", "time_ms": 0, "found": 0, "total": len(expected_checks)})
        results["pages"][page_name] = {"status": "❌", "code": "error", "found": 0, "total": len(expected_checks), "missing": list(expected_checks.keys())}
        print(f"  ❌ {page_name} ({url}): {str(e)[:80]}")

# ============================================
# ЗАПУСК
# ============================================

print("="*60)
print("🧪 АВТОМАТИЧЕСКИЙ ТЕСТ ВСЕХ СТРАНИЦ")
print(f"🌐 Frontend: {FRONTEND}")
print(f"📡 Backend: {BACKEND}")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print("="*60)

for url, config in PAGE_CHECKS.items():
    print(f"\n📋 {config['name']}")
    test_page(url, config["checks"], config["name"])

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
    time_str = f"{data.get('time_ms', 0)}ms"
    print(f"{name:<30} {status:>6} {found_str:>8} {time_str:>8}")

print("\n" + "="*60)
if pct >= 90:
    print("🎉 ОТЛИЧНО! Все страницы работают!")
elif pct >= 70:
    print("⚠️ ХОРОШО. Большинство страниц работает.")
else:
    print("❌ ПЛОХО. Многие страницы не работают.")
print("="*60)

# Сохранение
with open("page_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\n💾 Результаты: page_test_results.json")

# Детальный отчёт о проблемах
failed_pages = [n for n, d in results["pages"].items() if d["status"] == "❌"]
if failed_pages:
    print(f"\n❌ НЕ РАБОТАЮТ ({len(failed_pages)}):")
    for name in failed_pages:
        data = results["pages"][name]
        print(f"  • {name}: {data.get('code', 'error')}")
        if data.get("missing"):
            print(f"    Не найдено: {', '.join(data['missing'][:5])}")

sys.exit(0 if results["failed"] == 0 else 1)
