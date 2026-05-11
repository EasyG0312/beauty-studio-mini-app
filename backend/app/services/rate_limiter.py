"""
API Rate Limiting Service
=========================

Управляет ограничением запросов:
- Rate limiting по пользователям
- Разные лимиты для разных ролей
- Защита от DDoS атак
- Sliding window алгоритм
"""

import asyncio
import time
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
import redis.asyncio as redis

from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter с sliding window алгоритмом"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_store = {}  # Fallback для Redis
        
        # Лимиты по умолчанию
        self.default_limits = {
            'client': {
                'requests_per_minute': 30,
                'requests_per_hour': 200,
                'requests_per_day': 1000
            },
            'master': {
                'requests_per_minute': 60,
                'requests_per_hour': 500,
                'requests_per_day': 2000
            },
            'manager': {
                'requests_per_minute': 100,
                'requests_per_hour': 1000,
                'requests_per_day': 5000
            },
            'owner': {
                'requests_per_minute': 200,
                'requests_per_hour': 2000,
                'requests_per_day': 10000
            }
        }
        
        # Специальные лимиты для эндпоинтов
        self.endpoint_limits = {
            '/api/bookings': {
                'client': {'requests_per_minute': 10, 'requests_per_hour': 100},
                'master': {'requests_per_minute': 20, 'requests_per_hour': 200},
                'manager': {'requests_per_minute': 50, 'requests_per_hour': 500}
            },
            '/api/communications/send': {
                'manager': {'requests_per_minute': 5, 'requests_per_hour': 50},
                'owner': {'requests_per_minute': 10, 'requests_per_hour': 100}
            },
            '/api/auth/login': {
                'all': {'requests_per_minute': 5, 'requests_per_hour': 20}
            },
            '/api/auth/register': {
                'all': {'requests_per_minute': 3, 'requests_per_hour': 10}
            }
        }
    
    async def is_allowed(
        self,
        user_id: int,
        user_role: str,
        endpoint: str,
        ip_address: str = None
    ) -> Tuple[bool, Dict[str, int]]:
        """
        Проверить разрешен ли запрос
        
        Returns:
            (allowed, limits_info)
        """
        # Получаем лимиты для роли и эндпоинта
        limits = self._get_limits(user_role, endpoint)
        
        current_time = int(time.time())
        minute_ago = current_time - 60
        hour_ago = current_time - 3600
        day_ago = current_time - 86400
        
        # Проверяем каждый лимит
        checks = [
            ('minute', limits['requests_per_minute'], minute_ago),
            ('hour', limits['requests_per_hour'], hour_ago),
            ('day', limits['requests_per_day'], day_ago)
        ]
        
        for period, limit, since in checks:
            # Считаем запросы за период
            count = await self._count_requests(
                user_id, endpoint, since, current_time
            )
            
            if count >= limit:
                logger.warning(
                    f"Rate limit exceeded for user {user_id} "
                    f"({user_role}) on {endpoint}: "
                    f"{count}/{limit} per {period}"
                )
                
                return False, {
                    'limit': limit,
                    'current': count,
                    'period': period,
                    'retry_after': await self._get_retry_after(user_id, endpoint, period)
                }
        
        # Разрешаем запрос и логируем
        await self._log_request(user_id, endpoint, current_time)
        
        return True, {
            'remaining_minute': limits['requests_per_minute'] - await self._count_requests(
                user_id, endpoint, minute_ago, current_time
            ),
            'remaining_hour': limits['requests_per_hour'] - await self._count_requests(
                user_id, endpoint, hour_ago, current_time
            ),
            'remaining_day': limits['requests_per_day'] - await self._count_requests(
                user_id, endpoint, day_ago, current_time
            )
        }
    
    def _get_limits(self, user_role: str, endpoint: str) -> Dict[str, int]:
        """Получить лимиты для роли и эндпоинта"""
        # Проверяем специальные лимиты для эндпоинта
        for endpoint_pattern, limits in self.endpoint_limits.items():
            if endpoint.startswith(endpoint_pattern):
                if user_role in limits:
                    return limits[user_role]
                elif 'all' in limits:
                    return limits['all']
        
        # Возвращаем лимиты по умолчанию для роли
        return self.default_limits.get(user_role, self.default_limits['client'])
    
    async def _count_requests(
        self,
        user_id: int,
        endpoint: str,
        since: int,
        until: int
    ) -> int:
        """Посчитать запросы за период"""
        if self.redis_client:
            try:
                # Используем Redis sorted set для sliding window
                key = f"rate_limit:{user_id}:{endpoint}"
                
                # Удаляем старые записи
                await self.redis_client.zremrangebyscore(key, 0, since)
                
                # Считаем оставшиеся
                count = await self.redis_client.zcard(key)
                return count
                
            except Exception as e:
                logger.error(f"Redis rate limiting error: {e}")
                # Fallback к memory store
        
        # Memory fallback
        memory_key = f"{user_id}:{endpoint}"
        if memory_key not in self.memory_store:
            self.memory_store[memory_key] = []
        
        # Удаляем старые записи
        self.memory_store[memory_key] = [
            timestamp for timestamp in self.memory_store[memory_key]
            if since <= timestamp <= until
        ]
        
        return len(self.memory_store[memory_key])
    
    async def _log_request(self, user_id: int, endpoint: str, timestamp: int):
        """Залогировать запрос"""
        if self.redis_client:
            try:
                key = f"rate_limit:{user_id}:{endpoint}"
                await self.redis_client.zadd(key, {str(timestamp): timestamp})
                # Устанавливаем TTL на 24 часа
                await self.redis_client.expire(key, 86400)
            except Exception as e:
                logger.error(f"Redis logging error: {e}")
        
        # Memory fallback
        memory_key = f"{user_id}:{endpoint}"
        if memory_key not in self.memory_store:
            self.memory_store[memory_key] = []
        
        self.memory_store[memory_key].append(timestamp)
        
        # Очищаем старые записи в памяти
        cutoff = timestamp - 86400
        self.memory_store[memory_key] = [
            ts for ts in self.memory_store[memory_key] if ts > cutoff
        ]
    
    async def _get_retry_after(self, user_id: int, endpoint: str, period: str) -> int:
        """Получить время до следующего запроса"""
        if period == 'minute':
            return 60
        elif period == 'hour':
            return 3600
        elif period == 'day':
            return 86400
        return 60
    
    async def get_user_stats(self, user_id: int, user_role: str) -> Dict:
        """Получить статистику запросов пользователя"""
        current_time = int(time.time())
        minute_ago = current_time - 60
        hour_ago = current_time - 3600
        day_ago = current_time - 86400
        
        stats = {}
        
        # Считаем для разных эндпоинтов
        for endpoint_pattern in ['/api/bookings', '/api/communications', '/api/auth']:
            count_minute = await self._count_requests(
                user_id, endpoint_pattern, minute_ago, current_time
            )
            count_hour = await self._count_requests(
                user_id, endpoint_pattern, hour_ago, current_time
            )
            count_day = await self._count_requests(
                user_id, endpoint_pattern, day_ago, current_time
            )
            
            stats[endpoint_pattern] = {
                'last_minute': count_minute,
                'last_hour': count_hour,
                'last_day': count_day
            }
        
        return stats
    
    async def reset_user_limits(self, user_id: int):
        """Сбросить лимиты пользователя"""
        if self.redis_client:
            try:
                # Удаляем все ключи пользователя
                pattern = f"rate_limit:{user_id}:*"
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis reset error: {e}")
        
        # Memory fallback
        keys_to_delete = [k for k in self.memory_store.keys() if k.startswith(f"{user_id}:")]
        for key in keys_to_delete:
            del self.memory_store[key]


# Глобальный экземпляр
rate_limiter = None


def init_rate_limiter(redis_client=None):
    """Инициализировать rate limiter"""
    global rate_limiter
    rate_limiter = RateLimiter(redis_client)
    return rate_limiter


# FastAPI dependency для rate limiting
async def rate_limit_dependency(
    request: Request,
    current_user = None
):
    """Dependency для rate limiting"""
    if not rate_limiter:
        return  # Rate limiting отключен
    
    if not current_user:
        # Для анонимных пользователей используем IP
        user_id = hash(request.client.host)
        user_role = 'client'
    else:
        user_id = current_user.id
        user_role = current_user.role
    
    endpoint = request.url.path
    
    # Проверяем лимиты
    allowed, limits_info = await rate_limiter.is_allowed(
        user_id, user_role, endpoint, request.client.host
    )
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "limit": limits_info['limit'],
                "current": limits_info['current'],
                "period": limits_info['period'],
                "retry_after": limits_info['retry_after']
            },
            headers={
                "Retry-After": str(limits_info['retry_after']),
                "X-RateLimit-Limit": str(limits_info['limit']),
                "X-RateLimit-Remaining": str(0),
                "X-RateLimit-Reset": str(int(time.time()) + limits_info['retry_after'])
            }
        )
    
    # Добавляем заголовки с информацией о лимитах
    return {
        "X-RateLimit-Limit": str(limits_info.get('remaining_minute', 0)),
        "X-RateLimit-Remaining": str(limits_info.get('remaining_minute', 0)),
        "X-RateLimit-Reset": str(int(time.time()) + 60)
    }


# Middleware для rate limiting
class RateLimitMiddleware:
    """Middleware для rate limiting"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Создаем Request объект для получения информации
        # Это упрощенная версия - в реальном приложении нужно более сложная логика
        await self.app(scope, receive, send)


# Декоратор для rate limiting эндпоинтов
def rate_limit(
    requests_per_minute: int = None,
    requests_per_hour: int = None,
    requests_per_day: int = None
):
    """Декоратор для кастомных лимитов на эндпоинты"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Здесь должна быть логика rate limiting
            # Упрощенная реализация
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Background task для очистки старых данных
async def cleanup_rate_limit_data():
    """Очистка старых данных rate limiting"""
    while True:
        try:
            if rate_limiter and rate_limiter.redis_client:
                # Redis автоматически удаляет старые данные через TTL
                pass
            
            # Очищаем memory store
            current_time = int(time.time())
            cutoff = current_time - 86400  # 24 часа
            
            for key in list(rate_limiter.memory_store.keys()):
                rate_limiter.memory_store[key] = [
                    ts for ts in rate_limiter.memory_store[key] if ts > cutoff
                ]
                
                # Удаляем пустые списки
                if not rate_limiter.memory_store[key]:
                    del rate_limiter.memory_store[key]
            
            # Ждем 1 час до следующей очистки
            await asyncio.sleep(3600)
            
        except Exception as e:
            logger.error(f"Rate limit cleanup error: {e}")
            await asyncio.sleep(300)  # 5 минут при ошибке
