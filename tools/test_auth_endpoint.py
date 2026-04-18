#!/usr/bin/env python3
"""
Test Telegram auth endpoint directly
"""
import requests
import json
from datetime import datetime

# Test configurations
BACKEND_URL = "https://beauty-studio-api.onrender.com"
# BACKEND_URL = "http://localhost:8000"  # Uncomment for local testing

def test_with_hash():
    """Test with proper hash (signed initData)"""
    print("\n=== Test 1: With hash (proper initData) ===")
    
    # This would need a real signed hash from Telegram
    auth_data = {
        "telegram_init_data": "user={\"id\":338067005,\"first_name\":\"Test\"}&auth_date=1713360000&hash=abc123",
        "telegram_init_data_source": "initData",
        "id": 338067005,
        "first_name": "Test",
        "hash": "abc123",
        "auth_date": 1713360000,
    }
    
    response = requests.post(f"{BACKEND_URL}/api/auth/telegram", json=auth_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_without_hash_fallback():
    """Test without hash (fallback from initDataUnsafe)"""
    print("\n=== Test 2: Without hash (fallback source) ===")
    
    auth_data = {
        "telegram_init_data": "user={\"id\":338067005,\"first_name\":\"Test\"}&auth_date=1713360000",
        "telegram_init_data_source": "fallback",
        "id": 338067005,
        "first_name": "Test",
        "last_name": "",
    }
    
    response = requests.post(f"{BACKEND_URL}/api/auth/telegram", json=auth_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Auth successful!")
        print(f"   - Token: {data.get('access_token', 'N/A')[:50]}...")
        print(f"   - Role: {data.get('role')}")
        print(f"   - User ID: {data.get('user_id')}")
    else:
        print(f"\n❌ Auth failed!")


def test_url_source():
    """Test with URL source (tgWebAppData parameter)"""
    print("\n=== Test 3: URL source (tgWebAppData) ===")
    
    auth_data = {
        "telegram_init_data": "user={\"id\":338067005,\"first_name\":\"Test\"}&auth_date=1713360000",
        "telegram_init_data_source": "url",
        "id": 338067005,
        "first_name": "Test",
    }
    
    response = requests.post(f"{BACKEND_URL}/api/auth/telegram", json=auth_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Auth successful!")
        print(f"   - Token: {data.get('access_token', 'N/A')[:50]}...")
        print(f"   - Role: {data.get('role')}")
        print(f"   - User ID: {data.get('user_id')}")
    else:
        print(f"\n❌ Auth failed!")


def test_booking_create_with_token(token: str):
    """Test creating a booking with obtained token"""
    print("\n=== Test 4: Create booking with token ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    booking_data = {
        "name": "Test User",
        "phone": "+996700123456",
        "service": "Стрижка",
        "master": "Айгуль",
        "date": "18.04.2026",
        "time": "10:00",
        "chat_id": 338067005,
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/bookings",
        headers=headers,
        json=booking_data
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


if __name__ == "__main__":
    print("Testing Telegram Auth Endpoint")
    print(f"Backend: {BACKEND_URL}")
    print("=" * 50)
    
    try:
        # Test fallback (most likely scenario)
        test_without_hash_fallback()
        test_url_source()
        
        # If we got a token, try creating a booking
        # This won't work without real token, but shows the flow
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
