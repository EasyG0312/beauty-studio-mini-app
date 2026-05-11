"""
WebSocket Handlers
=================

Обработчики WebSocket сообщений:
- Подключение/отключение пользователей
- Обработка сообщений
- Управление комнатами
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import Booking, Client, WorkSchedule
from app.websocket.manager import manager, ROOMS
from app.dependencies import get_current_user_optional

logger = logging.getLogger(__name__)


async def handle_connection(websocket: WebSocket, user_id: int, db: AsyncSession):
    """Обработать новое WebSocket соединение"""
    try:
        # Получаем информацию о пользователе
        result = await db.execute(select(Client).where(Client.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            await websocket.close(code=4000, reason="User not found")
            return
        
        user_info = {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "chat_id": user.chat_id
        }
        
        # Подключаем к WebSocket
        await manager.connect(websocket, user_id, user_info)
        
        # Добавляем в соответствующие комнаты
        if user.role in ["manager", "owner"]:
            await manager.join_room(user_id, ROOMS["MANAGERS"])
            await manager.join_room(user_id, ROOMS["BOOKINGS"])
            await manager.join_room(user_id, ROOMS["SCHEDULE"])
            await manager.join_room(user_id, ROOMS["NOTIFICATIONS"])
            await manager.join_room(user_id, ROOMS["ANALYTICS"])
        
        # Отправляем начальные данные
        await websocket.send_text(json.dumps({
            "type": "initial_data",
            "data": {
                "user_info": user_info,
                "rooms": manager.get_user_room(user_id),
                "connected_users": manager.get_connected_users()
            }
        }))
        
        logger.info(f"WebSocket connection established for user {user_id} ({user.role})")
        
    except Exception as e:
        logger.error(f"Error handling connection: {e}")
        await websocket.close(code=5000, reason="Internal server error")


async def handle_message(websocket: WebSocket, user_id: int, message: str, db: AsyncSession):
    """Обработать входящее WebSocket сообщение"""
    try:
        data = json.loads(message)
        message_type = data.get("type")
        message_data = data.get("data", {})
        
        logger.info(f"WebSocket message from user {user_id}: {message_type}")
        
        if message_type == "ping":
            # Heartbeat ответ
            await websocket.send_text(json.dumps({
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            }))
        
        elif message_type == "join_room":
            # Присоединение к комнате
            room_name = message_data.get("room")
            if room_name in ROOMS.values():
                await manager.join_room(user_id, room_name)
                await websocket.send_text(json.dumps({
                    "type": "room_joined",
                    "data": {
                        "room": room_name,
                        "users": manager.get_room_users(room_name)
                    }
                }))
        
        elif message_type == "leave_room":
            # Выход из комнаты
            room_name = message_data.get("room")
            if room_name in ROOMS.values():
                await manager.leave_room(user_id, room_name)
                await websocket.send_text(json.dumps({
                    "type": "room_left",
                    "data": {
                        "room": room_name
                    }
                }))
        
        elif message_type == "get_room_users":
            # Получить пользователей в комнате
            room_name = message_data.get("room")
            if room_name in ROOMS.values():
                users = manager.get_room_users(room_name)
                await websocket.send_text(json.dumps({
                    "type": "room_users",
                    "data": {
                        "room": room_name,
                        "users": users
                    }
                }))
        
        elif message_type == "broadcast_to_room":
            # Рассылка в комнату
            room_name = message_data.get("room")
            broadcast_data = message_data.get("message", {})
            
            if room_name in ROOMS.values():
                await manager.broadcast_to_room(room_name, {
                    "type": "broadcast",
                    "data": broadcast_data,
                    "sender_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        else:
            logger.warning(f"Unknown message type: {message_type}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {
                    "message": f"Unknown message type: {message_type}"
                }
            }))
        
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON message from user {user_id}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "data": {
                "message": "Invalid JSON format"
            }
        }))
    except Exception as e:
        logger.error(f"Error handling message from user {user_id}: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "data": {
                "message": "Internal server error"
            }
        }))


async def handle_disconnect(websocket: WebSocket, user_id: int):
    """Обработать отключение WebSocket"""
    try:
        manager.disconnect(user_id)
        logger.info(f"WebSocket disconnected: user {user_id}")
        
        # Уведомляем других о выходе пользователя
        await manager.broadcast_to_all({
            "type": "user_disconnected",
            "data": {
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error handling disconnect for user {user_id}: {e}")


# === Broadcast функции для внешнего использования ===

async def broadcast_booking_update(booking_data: dict):
    """Расслать обновление о новой записи"""
    await manager.broadcast_to_room(ROOMS["BOOKINGS"], {
        "type": "booking_update",
        "data": booking_data,
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_booking_status_change(booking_id: int, status: str):
    """Расслать изменение статуса записи"""
    await manager.broadcast_to_room(ROOMS["BOOKINGS"], {
        "type": "booking_status_change",
        "data": {
            "booking_id": booking_id,
            "status": status
        },
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_schedule_update(schedule_data: dict):
    """Расслать обновление расписания"""
    await manager.broadcast_to_room(ROOMS["SCHEDULE"], {
        "type": "schedule_update",
        "data": schedule_data,
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_new_notification(notification_data: dict):
    """Расслать новое уведомление"""
    await manager.broadcast_to_room(ROOMS["NOTIFICATIONS"], {
        "type": "new_notification",
        "data": notification_data,
        "timestamp": datetime.utcnow().isoformat()
    })


async def broadcast_analytics_update(analytics_data: dict):
    """Расслать обновление аналитики"""
    await manager.broadcast_to_room(ROOMS["ANALYTICS"], {
        "type": "analytics_update",
        "data": analytics_data,
        "timestamp": datetime.utcnow().isoformat()
    })


async def send_personal_message(user_id: int, message_data: dict):
    """Отправить личное сообщение пользователю"""
    await manager.send_personal_message(user_id, {
        "type": "personal_message",
        "data": message_data,
        "timestamp": datetime.utcnow().isoformat()
    })
