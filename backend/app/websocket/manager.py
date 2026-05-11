"""
WebSocket Connection Manager
=========================

Управляет WebSocket соединениями для real-time обновлений:
- Новые записи
- Изменения статусов
- Обновления расписания
- Уведомления менеджеров
"""

import json
import asyncio
import logging
from typing import Dict, List, Set
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class WebSocketMessage(BaseModel):
    """Модель WebSocket сообщения"""
    type: str  # booking_update, schedule_change, notification, etc.
    data: dict
    timestamp: datetime
    user_id: Optional[int] = None
    room: Optional[str] = None  # room for broadcasting


class ConnectionManager:
    """Менеджер WebSocket соединений"""
    
    def __init__(self):
        # Активные соединения: {user_id: WebSocket}
        self.active_connections: Dict[int, WebSocket] = {}
        
        # Комнаты для групповых рассылок: {room_name: Set[user_id]}
        self.rooms: Dict[str, Set[int]] = {}
        
        # Информация о пользователях: {user_id: user_info}
        self.user_info: Dict[int, dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, user_info: dict = None):
        """Подключить нового пользователя"""
        await websocket.accept()
        
        self.active_connections[user_id] = websocket
        
        if user_info:
            self.user_info[user_id] = user_info
        
        logger.info(f"WebSocket connected: user {user_id}")
        
        # Отправляем приветственное сообщение
        await self.send_personal_message(user_id, {
            "type": "connection_established",
            "data": {
                "message": "Connected to Beauty Studio real-time updates",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
    
    def disconnect(self, user_id: int):
        """Отключить пользователя"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Удаляем из всех комнат
        for room_name, room_users in self.rooms.items():
            if user_id in room_users:
                room_users.remove(user_id)
        
        if user_id in self.user_info:
            del self.user_info[user_id]
        
        logger.info(f"WebSocket disconnected: user {user_id}")
    
    async def join_room(self, user_id: int, room_name: str):
        """Добавить пользователя в комнату"""
        if room_name not in self.rooms:
            self.rooms[room_name] = set()
        
        self.rooms[room_name].add(user_id)
        logger.info(f"User {user_id} joined room {room_name}")
    
    async def leave_room(self, user_id: int, room_name: str):
        """Удалить пользователя из комнаты"""
        if room_name in self.rooms and user_id in self.rooms[room_name]:
            self.rooms[room_name].remove(user_id)
            logger.info(f"User {user_id} left room {room_name}")
    
    async def send_personal_message(self, user_id: int, message: dict):
        """Отправить личное сообщение пользователю"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(json.dumps({
                    **message,
                    "timestamp": datetime.utcnow().isoformat()
                }))
            except Exception as e:
                logger.error(f"Error sending personal message to {user_id}: {e}")
        else:
            logger.warning(f"User {user_id} not connected for personal message")
    
    async def broadcast_to_room(self, room_name: str, message: dict, exclude_user: int = None):
        """Отправить сообщение всем в комнате"""
        if room_name not in self.rooms:
            return
        
        users_in_room = self.rooms[room_name].copy()
        if exclude_user:
            users_in_room.discard(exclude_user)
        
        disconnected_users = []
        
        for user_id in users_in_room:
            if user_id in self.active_connections:
                websocket = self.active_connections[user_id]
                try:
                    await websocket.send_text(json.dumps({
                        **message,
                        "room": room_name,
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")
                    disconnected_users.append(user_id)
            else:
                disconnected_users.append(user_id)
        
        # Удаляем отключенных пользователей из комнаты
        for user_id in disconnected_users:
            self.leave_room(user_id, room_name)
    
    async def broadcast_to_managers(self, message: dict):
        """Отправить сообщение всем менеджерам и владельцам"""
        manager_users = [
            user_id for user_id, user_info in self.user_info.items()
            if user_info.get('role') in ['manager', 'owner']
        ]
        
        for user_id in manager_users:
            await self.send_personal_message(user_id, message)
    
    async def broadcast_to_all(self, message: dict):
        """Отправить сообщение всем подключенным"""
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps({
                    **message,
                    "timestamp": datetime.utcnow().isoformat()
                }))
            except Exception as e:
                logger.error(f"Error broadcasting to {user_id}: {e}")
    
    def get_connected_users(self) -> List[dict]:
        """Получить список всех подключенных пользователей"""
        connected_users = []
        for user_id, user_info in self.user_info.items():
            if user_id in self.active_connections:
                connected_users.append({
                    "user_id": user_id,
                    **user_info
                })
        return connected_users
    
    def get_room_users(self, room_name: str) -> List[int]:
        """Получить список пользователей в комнате"""
        if room_name not in self.rooms:
            return []
        return list(self.rooms[room_name])
    
    def get_user_room(self, user_id: int) -> List[str]:
        """Получить список комнат пользователя"""
        user_rooms = []
        for room_name, room_users in self.rooms.items():
            if user_id in room_users:
                user_rooms.append(room_name)
        return user_rooms


# Глобальный экземпляр менеджера соединений
manager = ConnectionManager()


# Предопределенные комнаты
ROOMS = {
    "MANAGERS": "managers",      # Комната для менеджеров
    "BOOKINGS": "bookings",      # Комната для обновлений записей
    "SCHEDULE": "schedule",       # Комната для расписания
    "NOTIFICATIONS": "notifications"  # Комната для уведомлений
    "ANALYTICS": "analytics"     # Комната для аналитики
}
