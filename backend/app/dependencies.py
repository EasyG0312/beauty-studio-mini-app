"""
Общие зависимости для FastAPI
=============================

Содержит:
- get_current_user - получение текущего пользователя из JWT
- require_auth - требует аутентификацию
- require_role - требует определенную роль
- get_user_role - определение роли пользователя
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import Client
from app.config import settings

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[Client]:
    """Получает текущего пользователя из JWT токена (опционально)."""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[settings.jwt_algorithm])
        chat_id = payload.get("sub")
        if not chat_id:
            return None

        result = await db.execute(select(Client).where(Client.chat_id == int(chat_id)))
        return result.scalar_one_or_none()
    except (jwt.PyJWTError, ValueError):
        return None


def create_jwt_token(chat_id: int) -> str:
    """Создаёт JWT токен для пользователя."""
    return jwt.encode(
        {"sub": str(chat_id), "exp": datetime.utcnow().replace(hour=23, minute=59, second=59)},
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm
    )


def get_user_role(user: Optional[Client]) -> str:
    """Определяет роль пользователя."""
    if not user:
        return "anonymous"
    if user.chat_id in settings.owner_ids_list:
        return "owner"
    if user.chat_id in settings.admin_ids_list:
        return "manager"
    return "client"


async def require_auth(db: AsyncSession = Depends(get_db), user: Optional[Client] = Depends(get_current_user)) -> Client:
    """Dependency: требует аутентификацию."""
    if not user:
        raise HTTPException(status_code=401, detail="Требуется аутентификация")
    return user


def require_role(*roles: str):
    """Dependency factory: требует определённую роль.
    
    Возвращает async функцию-зависимость для FastAPI Depends.
    Фабрика должна быть sync чтобы FastAPI мог взять signature.
    """
    async def check_role(
        db: AsyncSession = Depends(get_db),
        user: Optional[Client] = Depends(get_current_user)
    ) -> Client:
        if not user:
            raise HTTPException(status_code=401, detail="Требуется аутентификация")
        
        user_role = get_user_role(user)
        if user_role not in roles:
            raise HTTPException(status_code=403, detail=f"Недостаточно прав. Требуется: {', '.join(roles)}")
        
        return user
    return check_role
