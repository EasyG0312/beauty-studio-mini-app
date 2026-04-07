"""
АВТОТЕСТЫ - Beauty Studio Mini App
Тестирование всех ролей и функционала
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"
passed = 0
failed = 0
errors = []

def test_endpoint(method, endpoint, expected_status=200, data=None, test_name=""):
    """Тестирование endpoint."""
    global passed, failed
    
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=5)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=5)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=5)
        
        status_ok = response.status_code == expected_status
        status_icon = "✅" if status_ok else "❌"
        
        if status_ok:
            passed += 1
            print(f"  {status_icon} {test_name or endpoint}: {response.status_code}")
        elif response.status_code == 500:
            # Системная ошибка - не считаем критичной для MVP
            failed += 1
            error_msg = f"{test_name or endpoint}: 500 (системная ошибка - см. логи backend)"
            errors.append(error_msg)
            print(f"  ⚠️ {test_name or endpoint}: 500 (требует проверки логов)")
        else:
            failed += 1
            error_msg = f"{test_name or endpoint}: Ожидалось {expected_status}, получено {response.status_code}"
            errors.append(error_msg)
            print(f"  {status_icon} {error_msg}")
        
        return response
    except Exception as e:
        failed += 1
        error_msg = f"{test_name or endpoint}: Ошибка - {str(e)}"
        errors.append(error_msg)
        print(f"  ❌ {error_msg}")
        return None

print("=" * 60)
print("🧪 АВТОТЕСТЫ - Beauty Studio Mini App")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print("=" * 60)

# ========================================
# ТЕСТ 1: Health Check
# ========================================
print("\n📡 СЕКЦИЯ 1: Системные эндпоинты")
test_endpoint("GET", "/health", test_name="Health check")
test_endpoint("GET", "/", test_name="Root endpoint")

# ========================================
# ТЕСТ 2: API Documentation
# ========================================
print("\n📚 СЕКЦИЯ 2: Документация API")
test_endpoint("GET", "/docs", expected_status=200, test_name="Swagger docs")

# ========================================
# ТЕСТ 3: Услуги и цены (из базы записей)
# ========================================
print("\n💇 СЕКЦИЯ 3: Услуги и цены (Клиент)")
# Получаем услуги из существующих записей
response = test_endpoint("GET", "/api/bookings", test_name="Получение записей (включая услуги)")

# ========================================
# ТЕСТ 4: Мастера
# ========================================
print("\n👩‍🎨 СЕКЦИЯ 4: Мастера (Клиент)")
test_endpoint("GET", "/api/masters/photos", test_name="Получение фото мастеров")

# ========================================
# ТЕСТ 5: Слоты расписания
# ========================================
print("\n📅 СЕКЦИЯ 5: Расписание (Клиент)")
test_endpoint("GET", "/api/slots/2025-04-10", test_name="Проверка слотов на дату")

# ========================================
# ТЕСТ 6: Записи (CRUD)
# ========================================
print("\n📝 СЕКЦИЯ 6: Записи (Клиент/Менеджер)")

# Создание тестовой записи
test_booking = {
    "name": "Тестовый клиент",
    "phone": "+996707001112",
    "master": "Айгуль",
    "service": "Стрижка",
    "date": "10.04.2025",
    "time": "15:00",
    "chat_id": 338067005
}
test_endpoint("POST", "/api/bookings", expected_status=200, data=test_booking, test_name="Создание записи")

# Получение списка записей
test_endpoint("GET", "/api/bookings", test_name="Получение всех записей")

# Получение конкретной записи
test_endpoint("GET", "/api/bookings/1", test_name="Получение записи по ID")

# ========================================
# ТЕСТ 7: Клиенты (CRUD)
# ========================================
print("\n👥 СЕКЦИЯ 7: Клиенты (Менеджер)")
test_endpoint("GET", "/api/clients", test_name="Список всех клиентов")

# ========================================
# ТЕСТ 8: Отзывы
# ========================================
print("\n⭐ СЕКЦИЯ 8: Отзывы (Клиент)")
test_endpoint("GET", "/api/reviews", test_name="Список отзывов")

# Создание отзыва (требуется booking_id=1)
# Сначала убедимся что booking существует
test_review = {
    "booking_id": 1,
    "rating": 5,
    "comment": "Отличный салон!"
}
# Пропускаем если booking не существует
response = test_endpoint("POST", "/api/reviews", expected_status=200, data=test_review, test_name="Создание отзыва (требуется существующий booking)")
if response and response.status_code == 500:
    print("    ⚠️ Возможно booking_id=1 не существует - проверю...")
    # Пропустим этот тест если booking не найден

# ========================================
# ТЕСТ 9: Портфолио
# ========================================
print("\n📸 СЕКЦИЯ 9: Портфолио (Клиент)")
test_endpoint("GET", "/api/portfolio", test_name="Список работ портфолио")

# ========================================
# ТЕСТ 10: Лист ожидания
# ========================================
print("\n📋 СЕКЦИЯ 10: Лист ожидания (Клиент)")
test_endpoint("GET", "/api/waitlist", test_name="Список листа ожидания")

# ========================================
# ТЕСТ 11: Аналитика (Владелец)
# ========================================
print("\n📊 СЕКЦИЯ 11: Аналитика (Владелец)")
test_endpoint("GET", "/api/analytics/summary", test_name="Сводная аналитика")
test_endpoint("GET", "/api/analytics/dashboard", test_name="Дашборд аналитики")
test_endpoint("GET", "/api/analytics/kpi", test_name="KPI мастеров")
test_endpoint("GET", "/api/analytics/rfm", test_name="RFM сегментация")
test_endpoint("GET", "/api/analytics/heatmap", test_name="Тепловая карта")
test_endpoint("GET", "/api/analytics/funnel", test_name="Воронка конверсии")
test_endpoint("GET", "/api/analytics/forecast", test_name="Прогноз выручки")

# ========================================
# ТЕСТ 12: Чат
# ========================================
print("\n💬 СЕКЦИЯ 12: Чат (Клиент/Менеджер)")
test_endpoint("GET", "/api/chat/338067005", test_name="История чата")

# ========================================
# ТЕСТ 13: Программа лояльности
# ========================================
print("\n👑 СЕКЦИЯ 13: Программа лояльности")
# Эндпоинт работает корректно - теперь клиент создан (после создания записи)
response = test_endpoint("GET", "/api/clients/338067005/loyalty", expected_status=200, test_name="Статус лояльности")

# ========================================
# ИТОГОВЫЙ ОТЧЕТ
# ========================================
print("\n" + "=" * 60)
print("📊 ИТОГОВЫЙ ОТЧЕТ")
print("=" * 60)
total = passed + failed
print(f"✅ Пройдено: {passed}")
print(f"❌ Провалено: {failed}")
print(f"📊 Всего тестов: {total}")
print(f"📈 Процент успеха: {(passed/total*100) if total > 0 else 0:.1f}%")

if errors:
    print("\n⚠️ СПИСОК ОШИБОК:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")

print("=" * 60)

sys.exit(0 if failed == 0 else 1)
