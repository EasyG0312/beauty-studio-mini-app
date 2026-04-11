"""
АВТОТЕСТ ПРОДАКШЕН ДЕПЛОЯ
Тестирует:
- Backend API (Render)
- Frontend (Vercel)
- CORS
- Основные функции
"""
import requests
import json
import sys
from datetime import datetime

BACKEND = "https://beauty-studio-api.onrender.com"
FRONTEND = "https://beauty-studio-mini-app.vercel.app"
passed = 0
failed = 0
errors = []

def test(method, url, expected_status=200, data=None, test_name=""):
    global passed, failed
    headers = {"Content-Type": "application/json"}
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=15)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=data, timeout=15)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=data, timeout=15)
        
        ok = r.status_code == expected_status
        icon = "✅" if ok else "❌"
        
        if ok:
            passed += 1
            print(f"  {icon} {test_name}: {r.status_code}")
        else:
            failed += 1
            msg = f"{test_name}: ожидалось {expected_status}, получено {r.status_code}"
            errors.append(msg)
            print(f"  {icon} {msg}")
        return r
    except Exception as e:
        failed += 1
        msg = f"{test_name}: {str(e)[:80]}"
        errors.append(msg)
        print(f"  ❌ {test_name}: {str(e)[:80]}")
        return None

print("=" * 60)
print("🧪 АВТОТЕСТ ПРОДАКШЕН ДЕПЛОЯ")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print("=" * 60)

# === BACKEND HEALTH ===
print("\n📡 1. BACKEND HEALTH")
test("GET", f"{BACKEND}/health", test_name="Health check")
test("GET", f"{BACKEND}/", test_name="Root endpoint")

# === FRONTEND LOAD ===
print("\n🌐 2. FRONTEND")
r = test("GET", f"{FRONTEND}", test_name="Frontend loads")
if r and r.status_code == 200:
    has_react = "react" in r.text.lower() or "root" in r.text.lower()
    has_app = "beauty" in r.text.lower() or "studio" in r.text.lower()
    if has_react or has_app:
        print(f"  ✅ React app detected in HTML")
    else:
        print(f"  ⚠️ HTML загружен, но React app не обнаружен")

# === CORS CHECK ===
print("\n🔗 3. CORS")
r = test("GET", f"{BACKEND}/api/bookings", test_name="CORS - GET bookings")
if r and r.status_code == 200:
    cors_header = r.headers.get('access-control-allow-origin', 'NOT SET')
    if cors_header != 'NOT SET':
        print(f"  ✅ CORS header: {cors_header}")
    else:
        print(f"  ⚠️ CORS header отсутствует (но запрос прошёл)")

# === API ENDPOINTS ===
print("\n📋 4. BOOKINGS API")
test("GET", f"{BACKEND}/api/bookings", test_name="GET all bookings")
test("GET", f"{BACKEND}/api/bookings/1", test_name="GET booking by ID")

# === SLOTS ===
print("\n📅 5. SLOTS")
test("GET", f"{BACKEND}/api/slots/14.04.2026", test_name="GET slots")
test("GET", f"{BACKEND}/api/slots/14.04.2026?master=Диана", test_name="GET slots (master filter)")

# === CLIENTS ===
print("\n👥 6. CLIENTS")
test("GET", f"{BACKEND}/api/clients", test_name="GET clients")

# === REVIEWS ===
print("\n⭐ 7. REVIEWS")
test("GET", f"{BACKEND}/api/reviews", test_name="GET reviews")

# === PORTFOLIO ===
print("\n📸 8. PORTFOLIO")
test("GET", f"{BACKEND}/api/portfolio", test_name="GET portfolio")
test("GET", f"{BACKEND}/api/portfolio/by-service/Стрижка", test_name="GET portfolio by service")

# === WAITLIST ===
print("\n📋 9. WAITLIST")
test("GET", f"{BACKEND}/api/waitlist", test_name="GET waitlist")

# === CHAT ===
print("\n💬 10. CHAT")
test("GET", f"{BACKEND}/api/chat/338067005", test_name="GET chat history")

# === ANALYTICS ===
print("\n📊 11. ANALYTICS")
test("GET", f"{BACKEND}/api/analytics/summary", test_name="Analytics summary")
test("GET", f"{BACKEND}/api/analytics/kpi", test_name="KPI masters")
test("GET", f"{BACKEND}/api/analytics/rfm", test_name="RFM segmentation")
test("GET", f"{BACKEND}/api/analytics/heatmap", test_name="Heatmap")
test("GET", f"{BACKEND}/api/analytics/forecast", test_name="Revenue forecast")
test("GET", f"{BACKEND}/api/analytics/dashboard", test_name="Dashboard")
test("GET", f"{BACKEND}/api/analytics/funnel", test_name="Funnel")

# === MASTERS ===
print("\n👩‍🎨 12. MASTERS")
test("GET", f"{BACKEND}/api/masters/photos", test_name="GET master photos")

# === BLACKLIST ===
print("\n🚫 13. BLACKLIST")
test("GET", f"{BACKEND}/api/blacklist", test_name="GET blacklist")

# === SCHEDULE ===
print("\n📅 14. MASTER SCHEDULE")
test("GET", f"{BACKEND}/api/masters/schedule", test_name="GET master schedule")
test("GET", f"{BACKEND}/api/masters/time-off", test_name="GET time off")

# === LOYALTY ===
print("\n👑 15. LOYALTY")
test("GET", f"{BACKEND}/api/clients/338067005/loyalty", test_name="Loyalty status")

# === PROMOCODES ===
print("\n🎫 16. PROMOCODES")
test("GET", f"{BACKEND}/api/promocodes", test_name="GET promocodes")
test("POST", f"{BACKEND}/api/promocodes/validate", data={"code": "TEST", "service": "Стрижка"}, expected_status=200, test_name="Validate promocode")

# === CREATE BOOKING ===
print("\n📝 17. CREATE BOOKING")
test_booking = {
    "name": "Автотест",
    "phone": "+996707001112",
    "master": "Айгуль",
    "service": "Стрижка",
    "date": "15.04.2026",
    "time": "14:00",
    "chat_id": 338067005
}
test("POST", f"{BACKEND}/api/bookings", expected_status=200, data=test_booking, test_name="Create booking")

# === ИТОГО ===
print("\n" + "=" * 60)
print("📊 ИТОГОВЫЙ ОТЧЁТ")
print("=" * 60)
total = passed + failed
print(f"✅ Пройдено: {passed}")
print(f"❌ Провалено: {failed}")
print(f"📊 Всего тестов: {total}")
pct = (passed/total*100) if total > 0 else 0
print(f"📈 Процент успеха: {pct:.1f}%")

if errors:
    print(f"\n⚠️ ОШИБОК ({len(errors)}):")
    for i, e in enumerate(errors, 1):
        print(f"  {i}. {e}")

print("=" * 60)

if pct >= 90:
    print("🎉 ДЕПЛОЙ ГОТОВ К ПРОДАКШЕНУ!")
elif pct >= 70:
    print("⚠️ Есть проблемы, но основное работает")
else:
    print("❌ Критические проблемы — требует исправления")

sys.exit(0 if failed == 0 else 1)
