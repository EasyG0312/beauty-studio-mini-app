"""
Beauty Studio Backend API - Refactored Version
===============================================

FastAPI сервер для управления салоном красоты.
Архитектура с разделением на роутеры для лучшей поддерживаемости.

Включает:
- JWT аутентификацию через Telegram WebApp
- Ролевую модель (client/manager/owner)
- CRUD операции для записей
- Аналитику и отчеты
- QR-код систему

Author: EasyG0312
Version: 2.1.5 (refactored)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from datetime import datetime

from app.config import settings
from app.database import init_db, get_db_session_factory
from app.services import init_scheduler, start_scheduler

# Импорт роутеров
from app.routers import auth, bookings, analytics, qr_codes, slots

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения."""
    # Startup
    try:
        logger.info("Starting up...")
        await init_db()
        logger.info("DB initialized")
        
        # Run migrations
        from app.migration import run_migrations
        await run_migrations()
        logger.info("Migrations completed")
        
        db_session_factory = get_db_session_factory()
        init_scheduler(db_session_factory)
        logger.info("Scheduler initialized")
        start_scheduler()
        logger.info("Scheduler started")
    except Exception as e:
        logger.error(f"Startup failed: {e}", exc_info=True)
        raise
    yield
    # Shutdown
    logger.info("Shutting down")


# Создание приложения
app = FastAPI(
    title="Beauty Studio API", 
    version="2.1.5", 
    lifespan=lifespan,
    description="API для управления салоном красоты с Telegram Mini App"
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Обработчик превышения лимита запросов."""
    from starlette.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": "Слишком много запросов. Попробуйте позже."}
    )


# CORS настройка
allow_origins = settings.cors_origins_list
allow_credentials = True
if '*' in allow_origins or any('*.vercel.app' in origin for origin in allow_origins):
    allow_origins = ['*']
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check endpoints
@app.get("/health")
async def health_check():
    """Простой health check для мониторинга (UptimeRobot и др.)."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "beauty-studio-backend",
        "version": "2.1.5"
    }


@app.get("/")
async def root():
    """Корень API."""
    return {
        "message": "Beauty Studio API",
        "version": "2.1.5",
        "docs": "/docs",
        "architecture": "modular_routers"
    }


# Подключение роутеров
app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(analytics.router)
app.include_router(qr_codes.router)
app.include_router(slots.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
