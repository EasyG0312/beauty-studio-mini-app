"""
Простой тест для проверки работы БД
"""
import asyncio
import sys
sys.path.insert(0, r'c:\Users\HOME\Desktop\telega bot\backend')

from app.database import async_session_maker, init_db, get_db
from app.models import Booking, Client
from sqlalchemy import select, text

async def test_db():
    print("🧪 Тестирование БД...")
    
    # 1. Инициализация
    print("\n1. Инициализация БД...")
    try:
        await init_db()
        print("   ✅ БД инициализирована")
    except Exception as e:
        print(f"   ❌ Ошибка инициализации: {e}")
        return
    
    # 2. Проверка сессии
    print("\n2. Проверка сессии...")
    try:
        async with async_session_maker() as session:
            # Простой запрос
            result = await session.execute(text("SELECT COUNT(*) FROM bookings"))
            count = result.scalar()
            print(f"   ✅ Записей в bookings: {count}")
            
            # Проверка клиентов
            result = await session.execute(select(Client))
            clients = result.scalars().all()
            print(f"   ✅ Клиентов: {len(clients)}")
            
            # Проверка записей
            result = await session.execute(select(Booking))
            bookings = result.scalars().all()
            print(f"   ✅ Записей: {len(bookings)}")
            
            if bookings:
                print(f"   📝 Первая запись: {bookings[0].name} - {bookings[0].service}")
            
    except Exception as e:
        print(f"   ❌ Ошибка запроса: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("\n✅ Все тесты пройдены!")

if __name__ == "__main__":
    asyncio.run(test_db())
