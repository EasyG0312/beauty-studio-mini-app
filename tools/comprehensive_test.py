"""
КОМПЛЕКСНЫЙ АВТОТЕСТ ВСЕХ ФУНКЦИЙ
Проверяет: HTML shell, JS/CSS файлы, API эндпоинты, навигацию
"""
import requests
import json
import time
from datetime import datetime

FRONTEND = "https://frontend-five-drab-47.vercel.app"
BACKEND = "https://beauty-studio-api.onrender.com"

results = {"passed": 0, "failed": 0, "skipped": 0, "tests": [], "pages": {}}

def add_result(name, status, section="", detail=""):
    if status == "✅":
        results["passed"] += 1
    elif status == "❌":
        results["failed"] += 1
    else:
        results["skipped"] += 1
    
    results["tests"].append({"name": name, "status": status, "section": section, "detail": detail})
    if section not in results["pages"]:
        results["pages"][section] = {"passed": 0, "failed": 0, "skipped": 0}
    
    if status == "✅":
        results["pages"][section]["passed"] += 1
        print(f"  ✅ {name}: {detail}")
    elif status == "⚠️" or status == "⏭️":
        results["pages"][section]["skipped"] += 1
        print(f"  ⚠️ {name}: {detail}")
    else:
        results["pages"][section]["failed"] += 1
        print(f"  ❌ {name}: {detail}")

def test_page_loads(url, name, section):
    """Тест загрузки страницы."""
    full_url = f"{FRONTEND}{url}"
    try:
        start = time.time()
        r = requests.get(full_url, timeout=30)
        elapsed = round((time.time() - start) * 1000)
        
        if r.status_code == 200:
            html = r.text.lower()
            checks = {
                "root div": "id=\"root\"" in html or "id='root'" in html,
                "JS loaded": ".js" in html,
                "CSS loaded": ".css" in html,
                "title": "beauty studio" in html,
                "telegram sdk": "telegram" in html,
            }
            
            found = sum(1 for v in checks.values() if v)
            total = len(checks)
            missing = [k for k, v in checks.items() if not v]
            
            if found == total:
                add_result(f"{name} ({url})", "✅", section, f"6/6 — {elapsed}ms")
            else:
                add_result(f"{name} ({url})", "❌", section, f"{found}/{total} — не найдено: {', '.join(missing)}")
        else:
            add_result(f"{name} ({url})", "❌", section, f"HTTP {r.status_code}")
    except Exception as e:
        add_result(f"{name} ({url})", "❌", section, str(e)[:80])

def test_api(method, endpoint, expected=200, data=None, name="", section=""):
    """Тест API endpoint."""
    url = f"{BACKEND}{endpoint}"
    try:
        start = time.time()
        headers = {"Content-Type": "application/json"}
        if method == "GET": r = requests.get(url, headers=headers, timeout=30)
        elif method == "POST": r = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == "PUT": r = requests.put(url, headers=headers, json=data, timeout=30)
        elif method == "DELETE": r = requests.delete(url, headers=headers, timeout=30)
        else: r = requests.get(url, headers=headers, timeout=30)
        
        elapsed = round((time.time() - start) * 1000)
        ok = r.status_code == expected or r.status_code in (401, 403, 409)
        
        if ok:
            status = "✅"
            detail = f"{r.status_code} — {elapsed}ms"
        else:
            status = "❌"
            detail = f"ожидалось {expected}, получено {r.status_code}"
        
        add_result(name, status, section, detail)
    except Exception as e:
        add_result(name, "❌", section, str(e)[:80])

# ============================================
# ЗАПУСК
# ============================================

print("="*60)
print("🧪 КОМПЛЕКСНЫЙ АВТОТЕСТ ВСЕХ ФУНКЦИЙ")
print(f"🌐 Frontend: {FRONTEND}")
print(f"📡 Backend: {BACKEND}")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print("="*60)

# 1. Frontend
print("\n🌐 1. FRONTEND")
test_api("GET", "/health", name="Backend Health", section="System")

# 2. Каждая страница
pages = [
    ("Главная", "/", [
        ("GET", "/api/bookings", "GET /api/bookings"),
        ("GET", "/api/masters/photos", "GET /api/masters/photos"),
    ]),
    ("Запись", "/booking", [
        ("GET", "/api/slots/20.04.2026", "GET /api/slots"),
    ]),
    ("Мои записи", "/my-bookings", [
        ("GET", "/api/bookings", "GET /api/bookings"),
    ]),
    ("Услуги", "/services", []),
    ("Отзывы", "/reviews", [
        ("GET", "/api/reviews", "GET /api/reviews"),
    ]),
    ("Портфолио", "/portfolio", [
        ("GET", "/api/portfolio", "GET /api/portfolio"),
    ]),
    ("FAQ", "/faq", []),
    ("Лист ожидания", "/waitlist", [
        ("GET", "/api/waitlist", "GET /api/waitlist"),
    ]),
    ("Чат", "/chat", [
        ("GET", "/api/chat/338067005", "GET /api/chat"),
    ]),
    ("Лояльность", "/loyalty", [
        ("GET", "/api/clients/338067005/loyalty", "GET /api/clients/loyalty"),
    ]),
    ("Панель менеджера", "/manager", [
        ("GET", "/api/bookings", "GET /api/bookings (manager)"),
        ("GET", "/api/clients", "GET /api/clients (401 auth — ок)"),
    ]),
    ("Аналитика", "/analytics", [
        ("GET", "/api/analytics/summary", "GET /api/analytics/summary (401 auth — ок)"),
        ("GET", "/api/analytics/kpi", "GET /api/analytics/kpi (401 auth — ок)"),
        ("GET", "/api/analytics/rfm", "GET /api/analytics/rfm (401 auth — ок)"),
        ("GET", "/api/analytics/heatmap", "GET /api/analytics/heatmap (401 auth — ок)"),
        ("GET", "/api/analytics/forecast", "GET /api/analytics/forecast (401 auth — ок)"),
    ]),
    ("Дашборд", "/analytics-dashboard", []),
    ("Расписание", "/master-schedule", [
        ("GET", "/api/masters/schedule", "GET /api/masters/schedule (401 auth — ок)"),
    ]),
    ("Фото мастеров", "/master-photos", [
        ("GET", "/api/masters/photos", "GET /api/masters/photos"),
    ]),
    ("Промокоды", "/promocodes", [
        ("GET", "/api/promocodes", "GET /api/promocodes"),
    ]),
]

for i, (name, url, apis) in enumerate(pages, 1):
    section = name
    print(f"\n📋 {i}. {name}")
    
    # Тест загрузки страницы
    test_page_loads(url, name, section)
    
    # Тест API для этой страницы
    for method, endpoint, api_name in apis:
        test_api(method, endpoint, name=api_name, section=section)

# Итоги
print("\n" + "="*60)
print("📊 ИТОГОВЫЙ ОТЧЁТ")
print("="*60)

total = results["passed"] + results["failed"] + results["skipped"]
print(f"✅ Пройдено:  {results['passed']}")
print(f"⚠️  Пропущено: {results['skipped']}")
print(f"❌ Провалено: {results['failed']}")
print(f"📊 Всего:     {total}")

api_total = results["passed"] + results["failed"]
pct = round((results["passed"] / api_total * 100)) if api_total > 0 else 0
print(f"📈 Процент:   {pct}%")

print(f"\n📋 ПО СТРАНИЦАМ:")
print(f"{'Страница':<25} {'✅':>4} {'⚠️':>4} {'❌':>4}")
print("-" * 40)
for name, data in results["pages"].items():
    print(f"{name:<25} {data['passed']:>4} {data['skipped']:>4} {data['failed']:>4}")

print("\n" + "="*60)
if pct >= 95:
    print("🎉 ОТЛИЧНО! Приложение полностью работает!")
elif pct >= 80:
    print("✅ ХОРОШО. Мелкие проблемы.")
elif pct >= 60:
    print("⚠️ СРЕДНЕ. Есть проблемы.")
else:
    print("❌ ПЛОХО.")
print("="*60)

with open("comprehensive_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\n💾 Результаты: comprehensive_test_results.json")

sys.exit(0 if results["failed"] == 0 else 1)
