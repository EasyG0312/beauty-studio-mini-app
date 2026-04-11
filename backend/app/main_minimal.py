"""
Минимальная версия main.py для проверки запуска на Render.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== LIFESPAN START ===")
    logger.info(f"DATABASE_URL: {'set' if os.getenv('DATABASE_URL') else 'NOT SET'}")
    logger.info(f"BOT_TOKEN: {'set' if os.getenv('BOT_TOKEN') else 'NOT SET'}")
    logger.info(f"ADMIN_IDS: {os.getenv('ADMIN_IDS', 'NOT SET')}")
    logger.info("=== LIFESPAN START DONE ===")
    yield
    logger.info("=== LIFESPAN SHUTDOWN ===")

app = FastAPI(title="Beauty Studio API (minimal)", version="1.0.0", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok", "minimal": True}

@app.get("/")
async def root():
    return {"message": "Beauty Studio API (minimal test)"}
