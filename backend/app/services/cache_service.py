"""
Redis Cache Service
====================

Управляет кэшированием для улучшения производительности:
- Кэширование слотов доступных времен
- Кэширование данных клиентов
- Кэширование аналитики
- Инвалидация кэша при изменениях
"""

import json
import logging
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)


class CacheService:
    """Сервис для работы с Redis кэшем"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379", ttl: int = 300):
        self.ttl = ttl  # Время жизни кэша по умолчанию (5 минут)
        
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available, using in-memory cache")
            self.redis_client = None
            self.memory_cache = {}
        else:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                logger.info("Redis cache initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Redis: {e}")
                self.redis_client = None
                self.memory_cache = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша"""
        try:
            if self.redis_client:
                value = await self.redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
            else:
                # Fallback к memory cache
                return self.memory_cache.get(key)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return self.memory_cache.get(key)
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Установить значение в кэш"""
        try:
            ttl = ttl or self.ttl
            serialized_value = json.dumps(value, default=str)
            
            if self.redis_client:
                success = await self.redis_client.setex(key, ttl, serialized_value)
                if success:
                    logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
                return success
            else:
                # Fallback к memory cache
                self.memory_cache[key] = value
                logger.debug(f"Memory cache SET: {key} (TTL: {ttl}s)")
                return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            # Fallback к memory cache
            self.memory_cache[key] = value
            return True
    
    async def delete(self, key: str) -> bool:
        """Удалить значение из кэша"""
        try:
            if self.redis_client:
                success = await self.redis_client.delete(key)
                if success:
                    logger.debug(f"Cache DELETE: {key}")
                return success
            else:
                # Fallback к memory cache
                if key in self.memory_cache:
                    del self.memory_cache[key]
                    logger.debug(f"Memory cache DELETE: {key}")
                return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            # Fallback к memory cache
            if key in self.memory_cache:
                del self.memory_cache[key]
            return True
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Инвалидировать кэш по паттерну"""
        try:
            if self.redis_client:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    deleted_count = await self.redis_client.delete(*keys)
                    logger.debug(f"Cache INVALIDATE: {pattern} - deleted {deleted_count} keys")
                    return deleted_count
                return 0
            else:
                # Fallback к memory cache
                deleted_count = 0
                keys_to_delete = [k for k in self.memory_cache.keys() if pattern in k]
                for key in keys_to_delete:
                    del self.memory_cache[key]
                    deleted_count += 1
                logger.debug(f"Memory cache INVALIDATE: {pattern} - deleted {deleted_count} keys")
                return deleted_count
        except Exception as e:
            logger.error(f"Cache invalidate error for pattern {pattern}: {e}")
            return 0
    
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Получить несколько значений из кэша"""
        result = {}
        for key in keys:
            value = await self.get(key)
            if value is not None:
                result[key] = value
        return result
    
    async def set_many(self, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Установить несколько значений в кэш"""
        try:
            ttl = ttl or self.ttl
            
            if self.redis_client:
                pipe = self.redis_client.pipeline()
                for key, value in data.items():
                    serialized_value = json.dumps(value, default=str)
                    pipe.setex(key, ttl, serialized_value)
                results = await pipe.execute()
                success = all(results)
                if success:
                    logger.debug(f"Cache MSET: {len(data)} keys (TTL: {ttl}s)")
                return success
            else:
                # Fallback к memory cache
                for key, value in data.items():
                    self.memory_cache[key] = value
                logger.debug(f"Memory cache MSET: {len(data)} keys (TTL: {ttl}s)")
                return True
        except Exception as e:
            logger.error(f"Cache set_many error: {e}")
            # Fallback к memory cache
            for key, value in data.items():
                self.memory_cache[key] = value
            return True
    
    async def exists(self, key: str) -> bool:
        """Проверить существование ключа в кэше"""
        try:
            if self.redis_client:
                return bool(await self.redis_client.exists(key))
            else:
                return key in self.memory_cache
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return key in self.memory_cache
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Инкрементировать значение в кэше"""
        try:
            if self.redis_client:
                new_value = await self.redis_client.incrby(key, amount)
                logger.debug(f"Cache INCR: {key} +{amount} = {new_value}")
                return new_value
            else:
                # Fallback к memory cache
                current_value = self.memory_cache.get(key, 0)
                new_value = current_value + amount
                self.memory_cache[key] = new_value
                logger.debug(f"Memory cache INCR: {key} +{amount} = {new_value}")
                return new_value
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Получить статистику Redis"""
        try:
            if self.redis_client:
                info = await self.redis_client.info()
                return {
                    'connected': True,
                    'used_memory': info.get('used_memory_human', 'N/A'),
                    'max_memory': info.get('maxmemory_human', 'N/A'),
                    'connected_clients': info.get('connected_clients', 0),
                    'total_commands_processed': info.get('total_commands_processed', 0),
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0),
                    'hit_rate': 0.0
                }
            else:
                return {
                    'connected': False,
                    'cache_type': 'memory',
                    'cached_keys': len(self.memory_cache)
                }
        except Exception as e:
            logger.error(f"Error getting Redis stats: {e}")
            return {'error': str(e)}


# Специализированные кэши для разных типов данных

class SlotsCache:
    """Кэш для доступных слотов записи"""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.prefix = "slots:"
    
    async def get_available_slots(self, date: str, master: str = "all") -> Optional[List[str]]:
        """Получить доступные слоты"""
        key = f"{self.prefix}{date}:{master}"
        return await self.cache.get(key)
    
    async def set_available_slots(self, date: str, master: str, slots: List[str], ttl: int = 600):
        """Установить доступные слоты (10 минут)"""
        key = f"{self.prefix}{date}:{master}"
        return await self.cache.set(key, slots, ttl)
    
    async def invalidate_date(self, date: str):
        """Инвалидировать все слоты за дату"""
        pattern = f"{self.prefix}{date}:*"
        return await self.cache.invalidate_pattern(pattern)


class ClientCache:
    """Кэш для данных клиентов"""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.prefix = "client:"
    
    async def get_client(self, chat_id: int) -> Optional[Dict]:
        """Получить данные клиента"""
        key = f"{self.prefix}{chat_id}"
        return await self.cache.get(key)
    
    async def set_client(self, chat_id: int, client_data: Dict, ttl: int = 1800):
        """Установить данные клиента (30 минут)"""
        key = f"{self.prefix}{chat_id}"
        return await self.cache.set(key, client_data, ttl)
    
    async def invalidate_client(self, chat_id: int):
        """Инвалидировать кэш клиента"""
        key = f"{self.prefix}{chat_id}"
        return await self.cache.delete(key)


class AnalyticsCache:
    """Кэш для аналитики"""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.prefix = "analytics:"
    
    async def get_daily_stats(self, date: str) -> Optional[Dict]:
        """Получить дневную статистику"""
        key = f"{self.prefix}daily:{date}"
        return await self.cache.get(key)
    
    async def set_daily_stats(self, date: str, stats: Dict, ttl: int = 3600):
        """Установить дневную статистику (1 час)"""
        key = f"{self.prefix}daily:{date}"
        return await self.cache.set(key, stats, ttl)
    
    async def get_weekly_stats(self, week_start: str) -> Optional[Dict]:
        """Получить недельную статистику"""
        key = f"{self.prefix}weekly:{week_start}"
        return await self.cache.get(key)
    
    async def set_weekly_stats(self, week_start: str, stats: Dict, ttl: int = 7200):
        """Установить недельную статистику (2 часа)"""
        key = f"{self.prefix}weekly:{week_start}"
        return await self.cache.set(key, stats, ttl)


class BookingCache:
    """Кэш для записей"""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.prefix = "booking:"
    
    async def get_bookings(self, filters: Dict) -> Optional[List[Dict]]:
        """Получить записи по фильтрам"""
        cache_key = f"bookings:{hash(str(sorted(filters.items())))}"
        return await self.cache.get(cache_key)
    
    async def set_bookings(self, filters: Dict, bookings: List[Dict], ttl: int = 300):
        """Установить записи по фильтрам (5 минут)"""
        cache_key = f"bookings:{hash(str(sorted(filters.items())))}"
        return await self.cache.set(cache_key, bookings, ttl)
    
    async def invalidate_booking_filters(self):
        """Инвалидировать все кэши записей"""
        pattern = "bookings:*"
        return await self.cache.invalidate_pattern(pattern)


# Глобальный экземпляр кэш-сервиса
cache_service = None

# Инициализаторы специализированных кэшей
slots_cache = None
client_cache = None
analytics_cache = None
booking_cache = None


def init_cache_service(redis_url: str = None, ttl: int = 300):
    """Инициализировать глобальный кэш-сервис"""
    global cache_service, slots_cache, client_cache, analytics_cache, booking_cache
    
    if redis_url is None:
        redis_url = "redis://localhost:6379"
    
    cache_service = CacheService(redis_url, ttl)
    slots_cache = SlotsCache(cache_service)
    client_cache = ClientCache(cache_service)
    analytics_cache = AnalyticsCache(cache_service)
    booking_cache = BookingCache(cache_service)
    
    logger.info("Cache services initialized")
    return cache_service


# Декоратор для кэширования функций
def cache_result(key_prefix: str, ttl: int = 300):
    """Декоратор для автоматического кэширования результатов функции"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Генерируем ключ кэша на основе аргументов
            cache_key = f"{key_prefix}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Пытаемся получить из кэша
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_result
            
            # Выполняем функцию
            result = await func(*args, **kwargs)
            
            # Сохраняем в кэш
            await cache_service.set(cache_key, result, ttl)
            logger.debug(f"Cache SET: {cache_key}")
            
            return result
        return wrapper
    return decorator
