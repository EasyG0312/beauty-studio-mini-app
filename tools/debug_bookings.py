"""
Тест bookings endpoint с детальным трейсом
"""
import asyncio
import sys
sys.path.insert(0, r'c:\Users\HOME\Desktop\telega bot\backend')

from app.database import async_session_maker
from app.models import Booking
from sqlalchemy import select

async def test():
    async with async_session_maker() as session:
        # Простой запрос без relationships
        result = await session.execute(select(Booking))
        bookings = result.scalars().all()
        print(f"✅ Записей: {len(bookings)}")
        
        # Проверка сериализации
        for b in bookings:
            print(f"\nЗапись #{b.id}:")
            print(f"  name: {b.name}")
            print(f"  phone: {b.phone}")
            print(f"  service: {b.service}")
            print(f"  master: {b.master}")
            print(f"  date: {b.date}")
            print(f"  time: {b.time}")
            print(f"  status: {b.status}")
            print(f"  actual_amount: {b.actual_amount}")
            print(f"  is_reschedule: {b.is_reschedule}")
            print(f"  is_on_the_way: {b.is_on_the_way}")
            print(f"  created_at: {b.created_at}")
            
            # Попробовать загрузить reviews
            try:
                reviews = b.reviews
                print(f"  reviews: {len(reviews)}")
            except Exception as e:
                print(f"  reviews: ❌ {e}")

asyncio.run(test())
