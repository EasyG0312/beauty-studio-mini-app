"""
Аутентификация и авторизация роутеры
====================================

Endpoints:
- POST /api/auth/telegram - Аутентификация через Telegram WebApp
- GET /api/auth/me - Получить информацию о текущем пользователе
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
import logging
from datetime import datetime

from app.database import get_db
from app.models import Client
from app.schemas import TelegramAuth, AuthResponse, AuthMeResponse
from app.config import settings
from app.dependencies import get_current_user, get_user_role, create_jwt_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(auth_data: TelegramAuth, db: AsyncSession = Depends(get_db)):
    """Авторизация через Telegram WebApp.
    
    Args:
        auth_data: Данные от Telegram WebApp (initData)
        db: Сессия базы данных
        
    Returns:
        AuthResponse: JWT токен и роль пользователя
        
    Raises:
        HTTPException: Если невалидные данные Telegram
    """
    # Проверяем хэш по оригинальной строке initData
    from app.utils import verify_telegram_auth
    if not verify_telegram_auth(auth_data.telegram_init_data, auth_data.telegram_init_data_source):
        raise HTTPException(status_code=401, detail="Invalid Telegram auth data")
    
    logger.debug(f"Telegram auth for user {auth_data.id}")
    
    # Ищем или создаём клиента
    result = await db.execute(select(Client).where(Client.chat_id == auth_data.id))
    client = result.scalar_one_or_none()
    
    if not client:
        client = Client(
            chat_id=auth_data.id,
            name=f"{auth_data.first_name} {auth_data.last_name or ''}".strip(),
            phone="",  # Клиент должен будет указать при записи
            first_visit=datetime.now().strftime("%d.%m.%Y"),
            last_visit=datetime.now().strftime("%d.%m.%Y"),
        )
        db.add(client)
        await db.commit()
        await db.refresh(client)
    
    # Определяем роль
    role = "client"
    if auth_data.id in settings.admin_ids_list:
        role = "manager"
    if auth_data.id in settings.owner_ids_list:
        role = "owner"
    
    token = create_jwt_token(auth_data.id)
    
    return AuthResponse(access_token=token, role=role, user_id=auth_data.id)


@router.get("/me", response_model=AuthMeResponse)
async def auth_me(user: Client = Depends(get_current_user)):
    """Получить информацию о текущем пользователе по JWT токену.
    
    Args:
        user: Текущий пользователь из JWT токена
        
    Returns:
        AuthMeResponse: Информация о пользователе
        
    Raises:
        HTTPException: Если пользователь не аутентифицирован
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    role = get_user_role(user)
    return AuthMeResponse(chat_id=user.chat_id, role=role, name=user.name)
