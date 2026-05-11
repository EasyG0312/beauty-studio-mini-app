"""
Push Notifications Service
=========================

Управляет push-уведомлениями:
- VAPID ключи и подписки
- Отправка уведомлений
- Управление подписками
- Таргетированные рассылки
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

try:
    from pywebpush import webpush, WebPushException
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    import vapid
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    webpush = None

from app.database import get_db_session_factory

logger = logging.getLogger(__name__)


class PushSubscription:
    """Модель подписки на push-уведомления"""
    
    def __init__(self, endpoint: str, keys: Dict[str, str], user_id: int, platform: str = 'web'):
        self.endpoint = endpoint
        self.keys = keys
        self.user_id = user_id
        self.platform = platform
        self.created_at = datetime.utcnow()
        self.is_active = True


class PushService:
    """Сервис для работы с push-уведомлениями"""
    
    def __init__(self, db_session_factory, vapid_private_key: str = None, vapid_public_key: str = None):
        self.db_session_factory = db_session_factory
        self.vapid_private_key = vapid_private_key
        self.vapid_public_key = vapid_public_key
        self.subscriptions: Dict[int, List[PushSubscription]] = {}
        
        if not WEBPUSH_AVAILABLE:
            logger.warning("WebPush not available, push notifications disabled")
        
        # Генерируем VAPID ключи если не предоставлены
        if not vapid_private_key or not vapid_public_key:
            self.generate_vapid_keys()
    
    def generate_vapid_keys(self):
        """Сгенерировать VAPID ключи"""
        try:
            private_key = ec.generate_private_key(ec.SECP256R1())
            public_key = private_key.public_key()
            
            self.vapid_private_key = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            self.vapid_public_key = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
            
            logger.info("Generated VAPID keys")
            
        except Exception as e:
            logger.error(f"Failed to generate VAPID keys: {e}")
            self.vapid_private_key = None
            self.vapid_public_key = None
    
    async def subscribe(self, user_id: int, subscription_data: Dict[str, Any]) -> bool:
        """Добавить подписку пользователя"""
        try:
            endpoint = subscription_data.get('endpoint')
            keys = subscription_data.get('keys', {})
            platform = subscription_data.get('platform', 'web')
            
            if not endpoint or not keys:
                logger.error("Invalid subscription data")
                return False
            
            # Создаем новую подписку
            new_subscription = PushSubscription(
                endpoint=endpoint,
                keys=keys,
                user_id=user_id,
                platform=platform
            )
            
            # Сохраняем в память (в реальном приложении - в базу данных)
            if user_id not in self.subscriptions:
                self.subscriptions[user_id] = []
            
            # Удаляем старые подписки для этого пользователя
            self.subscriptions[user_id] = [
                sub for sub in self.subscriptions[user_id] 
                if sub.endpoint != endpoint
            ]
            
            # Добавляем новую подписку
            self.subscriptions[user_id].append(new_subscription)
            
            logger.info(f"Added push subscription for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add subscription: {e}")
            return False
    
    async def unsubscribe(self, user_id: int, endpoint: str = None) -> bool:
        """Удалить подписку пользователя"""
        try:
            if user_id in self.subscriptions:
                if endpoint:
                    # Удаляем конкретную подписку
                    self.subscriptions[user_id] = [
                        sub for sub in self.subscriptions[user_id]
                        if sub.endpoint != endpoint
                    ]
                else:
                    # Удаляем все подписки пользователя
                    del self.subscriptions[user_id]
                
                logger.info(f"Removed push subscription for user {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to remove subscription: {e}")
            return False
    
    async def send_notification(
        self,
        user_ids: List[int],
        title: str,
        body: str,
        icon: str = None,
        badge: str = None,
        data: Dict[str, Any] = None,
        actions: List[Dict[str, str]] = None,
        ttl: int = 2419200,  # 28 дней в секундах
        urgency: str = 'normal'
    ) -> Dict[str, Any]:
        """Отправить push-уведомление"""
        if not WEBPUSH_AVAILABLE:
            return {
                'success': False,
                'error': 'WebPush not available',
                'sent': 0,
                'failed': len(user_ids)
            }
        
        results = {
            'sent': 0,
            'failed': 0,
            'errors': []
        }
        
        # Формируем payload
        payload = {
            'title': title,
            'body': body,
            'icon': icon or '/icons/icon-192x192.png',
            'badge': badge or '/icons/icon-96x96.png',
            'data': data or {},
            'actions': actions or [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Отправляем каждому пользователю
        for user_id in user_ids:
            user_subscriptions = self.subscriptions.get(user_id, [])
            
            if not user_subscriptions:
                results['failed'] += 1
                results['errors'].append(f'No subscription for user {user_id}')
                continue
            
            # Отправляем на все подписки пользователя
            user_success = False
            for subscription in user_subscriptions:
                try:
                    await self._send_to_subscription(subscription, payload, ttl, urgency)
                    user_success = True
                    logger.debug(f"Push sent to user {user_id} via {subscription.endpoint}")
                    
                except Exception as e:
                    logger.error(f"Failed to send push to {subscription.endpoint}: {e}")
                    results['errors'].append(f"User {user_id}: {str(e)}")
            
            if user_success:
                results['sent'] += 1
            else:
                results['failed'] += 1
        
        return {
            'success': results['sent'] > 0,
            'sent': results['sent'],
            'failed': results['failed'],
            'errors': results['errors']
        }
    
    async def send_broadcast(
        self,
        title: str,
        body: str,
        user_roles: List[str] = None,
        exclude_user_ids: List[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Отправить широковещательное уведомление"""
        # Получаем всех пользователей с подписками
        target_user_ids = list(self.subscriptions.keys())
        
        # Фильтруем по ролям (если указаны)
        if user_roles:
            # Здесь должна быть логика фильтрации по ролям из базы данных
            # Упрощенно - отправляем всем
            pass
        
        # Исключаем пользователей
        if exclude_user_ids:
            target_user_ids = [uid for uid in target_user_ids if uid not in exclude_user_ids]
        
        return await self.send_notification(target_user_ids, title, body, **kwargs)
    
    async def _send_to_subscription(
        self,
        subscription: PushSubscription,
        payload: Dict[str, Any],
        ttl: int,
        urgency: str
    ):
        """Отправить уведомление на конкретную подписку"""
        subscription_info = {
            'endpoint': subscription.endpoint,
            'keys': subscription.keys
        }
        
        # VAPID детали
        vapid_claims = {
            'sub': 'mailto:admin@beautystudio.com',
            'exp': int((datetime.utcnow() + timedelta(hours=24)).timestamp())
        }
        
        # Кодируем payload
        payload_json = json.dumps(payload, default=str)
        payload_bytes = payload_json.encode('utf-8')
        
        # Отправляем через WebPush
        webpush(
            subscription_info=subscription_info,
            data=payload_bytes,
            vapid_private_key=self.vapid_private_key,
            vapid_claims=vapid_claims,
            ttl=ttl,
            urgency=urgency
        )
    
    def get_vapid_public_key(self) -> str:
        """Получить публичный VAPID ключ"""
        return self.vapid_public_key
    
    async def get_user_subscriptions(self, user_id: int) -> List[Dict[str, Any]]:
        """Получить подписки пользователя"""
        subscriptions = self.subscriptions.get(user_id, [])
        
        return [
            {
                'endpoint': sub.endpoint,
                'keys': sub.keys,
                'platform': sub.platform,
                'created_at': sub.created_at.isoformat(),
                'is_active': sub.is_active
            }
            for sub in subscriptions
        ]
    
    async def cleanup_expired_subscriptions(self):
        """Очистить истекшие подписки"""
        expired_count = 0
        
        for user_id, subscriptions in self.subscriptions.items():
            active_subscriptions = []
            
            for sub in subscriptions:
                # Проверяем возраст подписки (30 дней)
                age_days = (datetime.utcnow() - sub.created_at).days
                if age_days <= 30:
                    active_subscriptions.append(sub)
                else:
                    expired_count += 1
                    logger.info(f"Removed expired subscription for user {user_id}")
            
            self.subscriptions[user_id] = active_subscriptions
        
        return expired_count
    
    async def get_stats(self) -> Dict[str, Any]:
        """Получить статистику подписок"""
        total_subscriptions = sum(len(subs) for subs in self.subscriptions.values())
        total_users = len(self.subscriptions)
        
        # По платформам
        platform_stats = {}
        for subscriptions in self.subscriptions.values():
            for sub in subscriptions:
                platform = sub.platform
                platform_stats[platform] = platform_stats.get(platform, 0) + 1
        
        return {
            'total_users': total_users,
            'total_subscriptions': total_subscriptions,
            'platform_breakdown': platform_stats,
            'vapid_configured': bool(self.vapid_private_key and self.vapid_public_key),
            'webpush_available': WEBPUSH_AVAILABLE
        }


# Глобальный экземпляр сервиса
push_service = None


def init_push_service(
    db_session_factory,
    vapid_private_key: str = None,
    vapid_public_key: str = None
):
    """Инициализировать глобальный сервис push-уведомлений"""
    global push_service
    push_service = PushService(db_session_factory, vapid_private_key, vapid_public_key)
    return push_service


# Background task для очистки подписок
async def cleanup_push_subscriptions():
    """Фоновая задача очистки истекших подписок"""
    while True:
        try:
            if push_service:
                expired_count = await push_service.cleanup_expired_subscriptions()
                if expired_count > 0:
                    logger.info(f"Cleaned up {expired_count} expired push subscriptions")
            
            # Проверяем каждые 24 часа
            await asyncio.sleep(86400)
            
        except Exception as e:
            logger.error(f"Push subscription cleanup error: {e}")
            await asyncio.sleep(3600)  # 1 час при ошибке


# Типы уведомлений
class NotificationType:
    """Типы push-уведомлений"""
    BOOKING_REMINDER = 'booking_reminder'
    BOOKING_CONFIRMED = 'booking_confirmed'
    BOOKING_CANCELLED = 'booking_cancelled'
    NEW_MESSAGE = 'new_message'
    PROMOTION = 'promotion'
    SYSTEM_UPDATE = 'system_update'
    PAYMENT_RECEIVED = 'payment_received'
    SCHEDULE_CHANGE = 'schedule_change'


# Шаблоны уведомлений
NOTIFICATION_TEMPLATES = {
    NotificationType.BOOKING_REMINDER: {
        'title': 'Напоминание о записи',
        'body': 'Напоминаем о вашей записи в Beauty Studio',
        'icon': '/icons/reminder.png',
        'actions': [
            {'action': 'view', 'title': 'Подробнее'},
            {'action': 'cancel', 'title': 'Отменить'}
        ]
    },
    NotificationType.BOOKING_CONFIRMED: {
        'title': 'Запись подтверждена',
        'body': 'Ваша запись успешно подтверждена',
        'icon': '/icons/confirmed.png',
        'actions': [
            {'action': 'view', 'title': 'Подробнее'},
            {'action': 'calendar', 'title': 'В календарь'}
        ]
    },
    NotificationType.BOOKING_CANCELLED: {
        'title': 'Запись отменена',
        'body': 'Ваша запись была отменена',
        'icon': '/icons/cancelled.png'
    },
    NotificationType.NEW_MESSAGE: {
        'title': 'Новое сообщение',
        'body': 'Вы получили новое сообщение от Beauty Studio',
        'icon': '/icons/message.png'
    },
    NotificationType.PROMOTION: {
        'title': 'Специальное предложение',
        'body': 'Новая акция в Beauty Studio',
        'icon': '/icons/promotion.png',
        'actions': [
            {'action': 'view', 'title': 'Посмотреть'},
            {'action': 'dismiss', 'title': 'Закрыть'}
        ]
    }
}


async def send_templated_notification(
    notification_type: str,
    user_ids: List[int],
    custom_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Отправить шаблонное уведомление"""
    if notification_type not in NOTIFICATION_TEMPLATES:
        return {
            'success': False,
            'error': f'Unknown notification type: {notification_type}'
        }
    
    template = NOTIFICATION_TEMPLATES[notification_type]
    
    # Персонализируем шаблон
    title = template['title']
    body = template['body']
    
    if custom_data:
        for key, value in custom_data.items():
            title = title.replace(f'{{{key}}}', str(value))
            body = body.replace(f'{{{key}}}', str(value))
    
    # Добавляем тип в данные
    data = {'type': notification_type}
    if custom_data:
        data.update(custom_data)
    
    return await push_service.send_notification(
        user_ids=user_ids,
        title=title,
        body=body,
        icon=template.get('icon'),
        actions=template.get('actions'),
        data=data
    )
