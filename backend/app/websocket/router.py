"""
WebSocket Router for FastAPI
==========================

Интеграция WebSocket с FastAPI для real-time обновлений.
"""

import json
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Client
from app.websocket.manager import manager
from app.websocket.handlers import (
    handle_connection, handle_message, handle_disconnect,
    broadcast_booking_update, broadcast_booking_status_change,
    broadcast_schedule_update, broadcast_new_notification,
    broadcast_analytics_update, send_personal_message
)
from app.dependencies import get_current_user_optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/connect/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Основной WebSocket эндпоинт для подключения"""
    try:
        # Проверяем что пользователь существует
        result = await db.execute(select(Client).where(Client.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            await websocket.close(code=4000, reason="User not found")
            return
        
        # Устанавливаем соединение
        await handle_connection(websocket, user_id, db)
        
        try:
            # Основной цикл обработки сообщений
            while True:
                message = await websocket.receive_text()
                if message:
                    await handle_message(websocket, user_id, message, db)
                else:
                    break
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}")
        except Exception as e:
            logger.error(f"Error in WebSocket loop for user {user_id}: {e}")
        finally:
            # Обрабатываем отключение
            await handle_disconnect(websocket, user_id)
            
    except Exception as e:
        logger.error(f"Error establishing WebSocket connection for user {user_id}: {e}")
        await websocket.close(code=5000, reason="Internal server error")


# === API эндпоинты для управления WebSocket ===

@router.post("/broadcast/booking")
async def broadcast_booking_update_endpoint(
    booking_data: Dict[str, Any],
    current_user: Client = Depends(get_current_user_optional)
):
    """API для рассылки обновления о записи через WebSocket"""
    try:
        if not current_user or current_user.role not in ["manager", "owner"]:
            return {"error": "Access denied"}
        
        await broadcast_booking_update(booking_data)
        return {"success": True, "message": "Booking update broadcasted"}
        
    except Exception as e:
        logger.error(f"Error broadcasting booking update: {e}")
        return {"error": "Failed to broadcast"}


@router.post("/broadcast/booking-status")
async def broadcast_booking_status_endpoint(
    booking_id: int,
    status: str,
    current_user: Client = Depends(get_current_user_optional)
):
    """API для рассылки изменения статуса записи"""
    try:
        if not current_user or current_user.role not in ["manager", "owner"]:
            return {"error": "Access denied"}
        
        await broadcast_booking_status_change(booking_id, status)
        return {"success": True, "message": "Booking status change broadcasted"}
        
    except Exception as e:
        logger.error(f"Error broadcasting booking status: {e}")
        return {"error": "Failed to broadcast status"}


@router.post("/broadcast/schedule")
async def broadcast_schedule_update_endpoint(
    schedule_data: Dict[str, Any],
    current_user: Client = Depends(get_current_user_optional)
):
    """API для рассылки обновления расписания"""
    try:
        if not current_user or current_user.role not in ["manager", "owner"]:
            return {"error": "Access denied"}
        
        await broadcast_schedule_update(schedule_data)
        return {"success": True, "message": "Schedule update broadcasted"}
        
    except Exception as e:
        logger.error(f"Error broadcasting schedule update: {e}")
        return {"error": "Failed to broadcast schedule"}


@router.post("/broadcast/notification")
async def broadcast_notification_endpoint(
    notification_data: Dict[str, Any],
    current_user: Client = Depends(get_current_user_optional)
):
    """API для рассылки уведомлений"""
    try:
        if not current_user or current_user.role not in ["manager", "owner"]:
            return {"error": "Access denied"}
        
        await broadcast_new_notification(notification_data)
        return {"success": True, "message": "Notification broadcasted"}
        
    except Exception as e:
        logger.error(f"Error broadcasting notification: {e}")
        return {"error": "Failed to broadcast notification"}


@router.post("/broadcast/analytics")
async def broadcast_analytics_endpoint(
    analytics_data: Dict[str, Any],
    current_user: Client = Depends(get_current_user_optional)
):
    """API для рассылки обновлений аналитики"""
    try:
        if not current_user or current_user.role != "owner":
            return {"error": "Access denied"}
        
        await broadcast_analytics_update(analytics_data)
        return {"success": True, "message": "Analytics update broadcasted"}
        
    except Exception as e:
        logger.error(f"Error broadcasting analytics: {e}")
        return {"error": "Failed to broadcast analytics"}


@router.post("/send-personal/{target_user_id}")
async def send_personal_message_endpoint(
    target_user_id: int,
    message_data: Dict[str, Any],
    current_user: Client = Depends(get_current_user_optional)
):
    """API для отправки личного сообщения пользователю"""
    try:
        if not current_user or current_user.role not in ["manager", "owner"]:
            return {"error": "Access denied"}
        
        await send_personal_message(target_user_id, {
            **message_data,
            "sender_id": current_user.id,
            "sender_name": current_user.name,
            "sender_role": current_user.role,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"success": True, "message": "Personal message sent"}
        
    except Exception as e:
        logger.error(f"Error sending personal message: {e}")
        return {"error": "Failed to send message"}


@router.get("/status")
async def get_websocket_status():
    """Получить статус WebSocket сервера"""
    connected_users = manager.get_connected_users()
    
    return {
        "status": "running",
        "connected_users": len(connected_users),
        "users": connected_users,
        "rooms": {
            room_name: {
                "user_count": len(manager.get_room_users(room_name)),
                "users": manager.get_room_users(room_name)
            }
            for room_name in ["managers", "bookings", "schedule", "notifications", "analytics"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/ping/{user_id}")
async def ping_user(user_id: int, current_user: Client = Depends(get_current_user_optional)):
    """Отправить ping конкретному пользователю"""
    try:
        if not current_user or current_user.role not in ["manager", "owner"]:
            return {"error": "Access denied"}
        
        await send_personal_message(user_id, {
            "type": "ping",
            "message": "Ping from admin",
            "sender_id": current_user.id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"success": True, "message": "Ping sent"}
        
    except Exception as e:
        logger.error(f"Error sending ping: {e}")
        return {"error": "Failed to send ping"}
