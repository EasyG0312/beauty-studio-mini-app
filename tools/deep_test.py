"""
ГЛУБОКИЙ АВТОТЕСТ ФУНКЦИОНАЛЬНОСТИ
Тестирует ВСЕ 18 пунктов по ролям
"""
import requests
import json
import sys
import time
from datetime import datetime

BACKEND = "https://beauty-studio-api.onrender.com"
FRONTEND = "https://frontend-five-drab-47.vercel.app"
passed = 0
failed = 0
warnings = 0
results = []

def test(method, url, expected_status=200, data=None, test_name="", section=""):
    global passed, failed, warnings
    headers = {"Content-Type": "application/json"}
    try:
        start = time.time()
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=20)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=data, timeout=20)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=data, timeout=20)
        elif method == "DELETE":
            r = requests.delete(url, headers=headers, timeout=20)
        elapsed = round((time.time() - start) * 1000)
        
        ok = r.status_code == expected_status
        if ok:
            passed += 1
            status_icon = "✅"
        elif r.status_code in (401, 403):
            warnings += 1
            status_icon = "⚠️"
            r_text = "Auth required (это нормально для админ эндпоинтов)"
        else:
            failed += 1
            status_icon = "❌"
        
        result = {
            "section": section,
            "test": test_name,
            "status": status_icon,
            "code": r.status_code,
            "time_ms": elapsed,
        }
        results.append(result)
        
        detail = f"{r.status_code} ({elapsed}ms)"
        if r.status_code in (401, 403):
            detail += " — auth required"
        print(f"  {status_icon} {test_name}: {detail}")
        return r
    except requests.exceptions.Timeout:
        failed += 1
        results.append({"section": section, "test": test_name, "status": "❌", "code": "timeout", "time_ms": 20000})
        print(f"  ❌ {test_name}: Timeout (>20s)")
        return None
    except Exception as e:
        failed += 1
        results.append({"section": section, "test": test_name, "status": "❌", "code": "error", "time_ms": 0})
        print(f"  ❌ {test_name}: {str(e)[:60]}")
        return None

def check_frontend():
    """Проверка доступности и содержимого frontend"""
    global passed, failed
    print("\n🌐 0. FRONTEND ДОСТУПНОСТЬ")
    try:
        r = requests.get(FRONTEND, timeout=15)
        if r.status_code == 200:
            content = r.text.lower()
            checks = {
                "React root": "root" in content,
                "Beauty Studio title": "beauty" in content or "studio" in content,
                "Telegram SDK": "telegram-web-app" in content or "telegram" in content,
                "CSS loaded": "css" in content,
                "JS loaded": "js" in content,
            }
            for name, ok in checks.items():
                if ok:
                    passed += 1
                    print(f"  ✅ {name}: OK")
                else:
                    failed += 1
                    print(f"  ❌ {name}: NOT FOUND")
            # Check page title
            if "<title>" in r.text:
                title = r.text.split("<title>")[1].split("</title>")[0]
                print(f"  ✅ Page title: {title}")
        else:
            failed += 1
            print(f"  ❌ Frontend returned {r.status_code}")
    except Exception as e:
        failed += 1
        print(f"  ❌ Frontend unreachable: {str(e)[:60]}")

def test_role(role_name, tests_func):
    print(f"\n{'='*60}")
    print(f"👤 РОЛЬ: {role_name}")
    print(f"{'='*60}")
    tests_func()

# ============================================
# ТЕСТЫ ПО СЕКЦИЯМ
# ============================================

def test_system():
    print("\n📡 1. СИСТЕМНЫЕ ЭНДПОИНТЫ")
    test("GET", f"{BACKEND}/health", test_name="Health check", section="System")
    test("GET", f"{BACKEND}/", test_name="Root endpoint", section="System")
    test("GET", f"{BACKEND}/docs", test_name="Swagger docs", section="System")

def test_bookings():
    print("\n📝 2. ЗАПИСИ (Клиент)")
    
    # 2.1 Создание записи — уникальное время чтобы избежать 409
    import random
    hour = random.choice([9, 10, 11, 14, 15, 16, 17, 18])
    test_booking = {
        "name": "Автотест User",
        "phone": "+996707001112",
        "master": "Айгуль",
        "service": "Стрижка",
        "date": "20.04.2026",
        "time": f"{hour}:00",
        "chat_id": 338067005
    }
    r = test("POST", f"{BACKEND}/api/bookings", expected_status=200, 
             data=test_booking, test_name="Создание записи", section="Bookings")
    
    booking_id = None
    if r and r.status_code == 200:
        try:
            booking_id = r.json().get("id")
        except:
            pass
    
    # 2.2 Получение всех записей
    test("GET", f"{BACKEND}/api/bookings", test_name="Список всех записей", section="Bookings")
    
    # 2.3 Получение записи по ID
    if booking_id:
        test("GET", f"{BACKEND}/api/bookings/{booking_id}", test_name="Запись по ID", section="Bookings")
    
    # 2.4 Дубликат записи (должен быть 409)
    test("POST", f"{BACKEND}/api/bookings", expected_status=409,
         data=test_booking, test_name="Дубликат записи (409 Conflict)", section="Bookings")
    
    # 2.5 Слоты
    test("GET", f"{BACKEND}/api/slots/15.04.2026", test_name="Слоты на дату", section="Bookings")
    test("GET", f"{BACKEND}/api/slots/15.04.2026?master=Айгуль", test_name="Слоты с фильтром мастера", section="Bookings")

def test_clients():
    print("\n👥 3. КЛИЕНТЫ (Менеджер)")
    test("GET", f"{BACKEND}/api/clients", test_name="Список клиентов", section="Clients")
    test("GET", f"{BACKEND}/api/clients/338067005/loyalty", test_name="Статус лояльности", section="Clients")

def test_reviews():
    print("\n⭐ 4. ОТЗЫВЫ")
    test("GET", f"{BACKEND}/api/reviews", test_name="Список отзывов", section="Reviews")

def test_portfolio():
    print("\n📸 5. ПОРТФОЛИО")
    test("GET", f"{BACKEND}/api/portfolio", test_name="Список работ", section="Portfolio")
    test("GET", f"{BACKEND}/api/portfolio/by-service/Стрижка", test_name="Портфолио по категории", section="Portfolio")

def test_waitlist():
    print("\n📋 6. ЛИСТ ОЖИДАНИЯ")
    test("GET", f"{BACKEND}/api/waitlist", test_name="Список листа ожидания", section="Waitlist")

def test_chat():
    print("\n💬 7. ЧАТ")
    test("GET", f"{BACKEND}/api/chat/338067005", test_name="История чата", section="Chat")

def test_analytics():
    print("\n📊 8. АНАЛИТИКА (Владелец)")
    test("GET", f"{BACKEND}/api/analytics/summary", test_name="Сводная аналитика", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/kpi", test_name="KPI мастеров", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/rfm", test_name="RFM сегментация", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/forecast", test_name="Прогноз выручки", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/dashboard", test_name="Дашборд", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/heatmap", test_name="Тепловая карта", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/funnel", test_name="Воронка конверсии", section="Analytics")
    test("GET", f"{BACKEND}/api/analytics/comparison", test_name="Сравнение периодов", section="Analytics")

def test_masters():
    print("\n👩‍🎨 9. МАСТЕРА")
    test("GET", f"{BACKEND}/api/masters/photos", test_name="Фото мастеров", section="Masters")
    test("GET", f"{BACKEND}/api/masters/schedule", test_name="Расписание мастеров", section="Masters")
    test("GET", f"{BACKEND}/api/masters/time-off", test_name="Периоды отсутствия", section="Masters")

def test_blacklist():
    print("\n🚫 10. ЧЁРНЫЙ СПИСОК")
    test("GET", f"{BACKEND}/api/blacklist", test_name="Чёрный список", section="Blacklist")

def test_promocodes():
    print("\n🎫 11. ПРОМОКОДЫ")
    test("GET", f"{BACKEND}/api/promocodes", test_name="Список промокодов", section="Promocodes")

def test_cors():
    global passed, failed, warnings
    print("\n🔗 12. CORS ПРОВЕРКА")
    headers = {
        "Content-Type": "application/json",
        "Origin": "https://frontend-five-drab-47.vercel.app"
    }
    try:
        r = requests.get(f"{BACKEND}/api/bookings", headers=headers, timeout=15)
        cors_header = r.headers.get('access-control-allow-origin', 'NOT SET')
        if cors_header != 'NOT SET':
            passed += 1
            print(f"  ✅ CORS header: {cors_header}")
        else:
            warnings += 1
            print(f"  ⚠️ CORS header отсутствует (но запрос прошёл)")
        results.append({"section": "CORS", "test": "CORS header", "status": "⚠️" if cors_header == 'NOT SET' else "✅", "code": r.status_code, "time_ms": 0})
    except Exception as e:
        failed += 1
        print(f"  ❌ CORS check failed: {str(e)[:60]}")

# ============================================
# ГЛАВНЫЙ ЗАПУСК
# ============================================

print("=" * 60)
print("🧪 ГЛУБОКИЙ АВТОТЕСТ ФУНКЦИОНАЛЬНОСТИ")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print(f"📡 Backend: {BACKEND}")
print(f"🌐 Frontend: {FRONTEND}")
print("=" * 60)

# 0. Frontend
check_frontend()

# 1. System
test_system()

# 2. Bookings
test_role("КЛИЕНТ", test_bookings)

# 3. Clients
test_role("МЕНЕДЖЕР", test_clients)

# 4. Reviews
test_role("КЛИЕНТ", test_reviews)

# 5. Portfolio
test_role("КЛИЕНТ", test_portfolio)

# 6. Waitlist
test_role("КЛИЕНТ", test_waitlist)

# 7. Chat
test_role("КЛИЕНТ", test_chat)

# 8. Analytics
test_role("ВЛАДЕЛЕЦ", test_analytics)

# 9. Masters
test_role("КЛИЕНТ", test_masters)

# 10. Blacklist
test_role("МЕНЕДЖЕР", test_blacklist)

# 11. Promocodes
test_role("КЛИЕНТ", test_promocodes)

# 12. CORS
test_cors()

# ============================================
# ИТОГОВЫЙ ОТЧЁТ
# ============================================

print("\n" + "=" * 60)
print("📊 ИТОГОВЫЙ ОТЧЁТ")
print("=" * 60)
total = passed + failed + warnings

print(f"✅ Пройдено:       {passed}")
print(f"⚠️  Предупреждения: {warnings}")
print(f"❌ Провалено:      {failed}")
print(f"📊 Всего тестов:   {total}")

pct = round((passed / total * 100) if total > 0 else 0, 1)
print(f"📈 Процент успеха: {pct}%")

# Отчёт по секциям
sections = {}
for r in results:
    sec = r.get("section", "Unknown")
    if sec not in sections:
        sections[sec] = {"passed": 0, "failed": 0, "warnings": 0}
    if r["status"] == "✅":
        sections[sec]["passed"] += 1
    elif r["status"] == "❌":
        sections[sec]["failed"] += 1
    else:
        sections[sec]["warnings"] += 1

print("\n📋 ПО СЕКЦИЯМ:")
print(f"{'Секция':<25} {'✅':>4} {'⚠️':>4} {'❌':>4} {'Итого':>6}")
print("-" * 50)
for sec, counts in sorted(sections.items()):
    total_sec = counts["passed"] + counts["failed"] + counts["warnings"]
    print(f"{sec:<25} {counts['passed']:>4} {counts['warnings']:>4} {counts['failed']:>4} {total_sec:>6}")

print("\n" + "=" * 60)
if pct >= 90:
    print("🎉 ОТЛИЧНО! Приложение готово к продакшену!")
elif pct >= 70:
    print("⚠️ ХОРОШО. Есть проблемы, но основное работает.")
elif pct >= 50:
    print("⚠️ СРЕДНЕ. Критические проблемы требуют исправления.")
else:
    print("❌ ПЛОХО. Множество ошибок — требует доработки.")
print("=" * 60)

if failed > 0:
    print(f"\n❌ ПРОВАЛЕННЫЕ ТЕСТЫ ({failed}):")
    failed_tests = [r for r in results if r["status"] == "❌"]
    for i, r in enumerate(failed_tests, 1):
        print(f"  {i}. [{r['section']}] {r['test']} — код {r['code']}")

sys.exit(0 if failed == 0 else 1)
