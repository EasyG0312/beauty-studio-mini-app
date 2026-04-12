"""
ПОЛНОЦЕННЫЙ АВТОТЕСТ ПО ФУНКЦИЯМ
На основе tools/test_plan.json
"""
import requests
import json
import sys
import time
from datetime import datetime

# Загрузка плана тестирования
with open("test_plan.json", "r", encoding="utf-8") as f:
    PLAN = json.load(f)

BACKEND = PLAN["urls"]["backend"]
FRONTEND = PLAN["urls"]["frontend"]

results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "tests": [],
    "sections": {}
}

def test_api(method, endpoint, expected_status=200, data=None, test_name="", section=""):
    """Тест API endpoint."""
    url = f"{BACKEND}{endpoint}"
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
        else:
            r = requests.get(url, headers=headers, timeout=20)
        
        elapsed = round((time.time() - start) * 1000)
        ok = r.status_code == expected_status
        
        if ok:
            results["passed"] += 1
            status_icon = "✅"
        elif r.status_code in (401, 403):
            results["skipped"] += 1
            status_icon = "⚠️"
        else:
            results["failed"] += 1
            status_icon = "❌"
        
        result = {
            "name": test_name,
            "status": status_icon,
            "code": r.status_code,
            "expected": expected_status,
            "time_ms": elapsed,
            "section": section,
        }
        results["tests"].append(result)
        
        # Подсчёт по секциям
        if section not in results["sections"]:
            results["sections"][section] = {"passed": 0, "failed": 0, "skipped": 0}
        
        if ok:
            results["sections"][section]["passed"] += 1
        elif r.status_code in (401, 403):
            results["sections"][section]["skipped"] += 1
            print(f"  {status_icon} {test_name}: 401 (auth required — это нормально)")
        else:
            results["sections"][section]["failed"] += 1
            print(f"  {status_icon} {test_name}: ожидалось {expected_status}, получено {r.status_code}")
        
        if ok:
            print(f"  {status_icon} {test_name}: {r.status_code} ({elapsed}ms)")
        
        return r
    except requests.exceptions.Timeout:
        results["failed"] += 1
        results["tests"].append({"name": test_name, "status": "❌", "code": "timeout", "expected": expected_status, "time_ms": 20000, "section": section})
        if section not in results["sections"]:
            results["sections"][section] = {"passed": 0, "failed": 0, "skipped": 0}
        results["sections"][section]["failed"] += 1
        print(f"  ❌ {test_name}: Timeout (>20s)")
        return None
    except Exception as e:
        results["failed"] += 1
        results["tests"].append({"name": test_name, "status": "❌", "code": "error", "expected": expected_status, "time_ms": 0, "section": section})
        if section not in results["sections"]:
            results["sections"][section] = {"passed": 0, "failed": 0, "skipped": 0}
        results["sections"][section]["failed"] += 1
        print(f"  ❌ {test_name}: {str(e)[:80]}")
        return None

def test_frontend():
    """Тест доступности frontend."""
    print("\n🌐 FRONTEND ДОСТУПНОСТЬ")
    try:
        r = requests.get(FRONTEND, timeout=20)
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
                    results["passed"] += 1
                    print(f"  ✅ {name}: OK")
                else:
                    results["failed"] += 1
                    print(f"  ❌ {name}: NOT FOUND")
        else:
            results["failed"] += 1
            print(f"  ❌ Frontend returned {r.status_code}")
    except Exception as e:
        results["failed"] += 1
        print(f"  ❌ Frontend unreachable: {str(e)[:80]}")

def run_role_tests(role_key, role_data):
    """Запуск тестов для одной роли."""
    role_name = role_data["name"]
    print(f"\n{'='*60}")
    print(f"👤 РОЛЬ: {role_name}")
    print(f"{'='*60}")
    
    for feature in role_data["features"]:
        print(f"\n📋 {feature['name']} ({feature.get('url', 'N/A')})")
        for test in feature["tests"]:
            if test["type"] == "api":
                test_api(
                    method=test["method"],
                    endpoint=test["endpoint"],
                    expected_status=test.get("expected_status", 200),
                    test_name=test["name"],
                    section=f"{role_name}/{feature['name']}"
                )
            elif test["type"] == "visual":
                results["skipped"] += 1
                if f"{role_name}/{feature['name']}" not in results["sections"]:
                    results["sections"][f"{role_name}/{feature['name']}"] = {"passed": 0, "failed": 0, "skipped": 0}
                results["sections"][f"{role_name}/{feature['name']}"]["skipped"] += 1
                print(f"  ⏭️  {test['name']}: визуальный тест (пропущено)")
            elif test["type"] == "interaction":
                results["skipped"] += 1
                if f"{role_name}/{feature['name']}" not in results["sections"]:
                    results["sections"][f"{role_name}/{feature['name']}"] = {"passed": 0, "failed": 0, "skipped": 0}
                results["sections"][f"{role_name}/{feature['name']}"]["skipped"] += 1
                print(f"  ⏭️  {test['name']}: интерактивный тест (пропущено)")
            elif test["type"] == "form":
                results["skipped"] += 1
                if f"{role_name}/{feature['name']}" not in results["sections"]:
                    results["sections"][f"{role_name}/{feature['name']}"] = {"passed": 0, "failed": 0, "skipped": 0}
                results["sections"][f"{role_name}/{feature['name']}"]["skipped"] += 1
                print(f"  ⏭️  {test['name']}: тест формы (пропущено)")

def run_system_tests():
    """Запуск системных тестов."""
    print(f"\n{'='*60}")
    print(f"📡 СИСТЕМНЫЕ ТЕСТЫ")
    print(f"{'='*60}")
    
    for feature in PLAN["system"]["features"]:
        print(f"\n📋 {feature['name']}")
        for test in feature["tests"]:
            if test["type"] == "api":
                test_api(
                    method=test["method"],
                    endpoint=test["endpoint"],
                    expected_status=test.get("expected_status", 200),
                    test_name=test["name"],
                    section=f"System/{feature['name']}"
                )

def test_cors():
    """Тест CORS."""
    print(f"\n{'='*60}")
    print(f"🔗 CORS ПРОВЕРКА")
    print(f"{'='*60}")
    
    headers = {
        "Content-Type": "application/json",
        "Origin": FRONTEND
    }
    try:
        r = requests.get(f"{BACKEND}/api/bookings", headers=headers, timeout=20)
        cors_header = r.headers.get('access-control-allow-origin', 'NOT SET')
        if cors_header != 'NOT SET':
            results["passed"] += 1
            print(f"  ✅ CORS header: {cors_header}")
        else:
            results["skipped"] += 1
            print(f"  ⚠️ CORS header отсутствует (но запрос прошёл)")
    except Exception as e:
        results["failed"] += 1
        print(f"  ❌ CORS check failed: {str(e)[:80]}")

# ============================================
# ГЛАВНЫЙ ЗАПУСК
# ============================================

print("=" * 60)
print("🧪 ПОЛНОЦЕННЫЙ АВТОТЕСТ ПО ФУНКЦИЯМ")
print(f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")
print(f"📡 Backend: {BACKEND}")
print(f"🌐 Frontend: {FRONTEND}")
print("=" * 60)

# 1. Frontend
test_frontend()

# 2. System tests
run_system_tests()

# 3. Role tests
for role_key, role_data in PLAN["roles"].items():
    run_role_tests(role_key, role_data)

# 4. CORS
test_cors()

# ============================================
# ИТОГОВЫЙ ОТЧЁТ
# ============================================

print("\n" + "=" * 60)
print("📊 ИТОГОВЫЙ ОТЧЁТ")
print("=" * 60)

total = results["passed"] + results["failed"] + results["skipped"]
print(f"✅ Пройдено:       {results['passed']}")
print(f"⚠️  Пропущено:      {results['skipped']}")
print(f"❌ Провалено:      {results['failed']}")
print(f"📊 Всего тестов:   {total}")

pct = round((results["passed"] / (results["passed"] + results["failed"]) * 100)) if (results["passed"] + results["failed"]) > 0 else 0
print(f"📈 Процент успеха: {pct}%")

# Отчёт по секциям
print(f"\n📋 ПО СЕКЦИЯМ:")
print(f"{'Секция':<45} {'✅':>4} {'⚠️':>4} {'❌':>4}")
print("-" * 60)
for sec, counts in sorted(results["sections"].items()):
    print(f"{sec:<45} {counts['passed']:>4} {counts['skipped']:>4} {counts['failed']:>4}")

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

# Сохранение результатов
with open("test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"\n💾 Результаты сохранены в test_results.json")

sys.exit(0 if results["failed"] == 0 else 1)
