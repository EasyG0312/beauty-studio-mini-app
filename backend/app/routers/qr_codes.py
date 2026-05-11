"""
QR-коды система роутеры
========================

Endpoints:
- POST /api/bookings/{id}/qr - Генерировать QR-код для записи
- GET /api/bookings/{id}/qr - Получить QR-код изображение
- POST /api/qr/scan - Сканировать QR-код и отметить клиента как пришедшего
- GET /api/qr/verify/{qr_code} - Проверить QR-код без отметки прихода
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import logging
import uuid
import qrcode
from io import BytesIO
import base64
from fastapi.responses import JSONResponse

from app.database import get_db
from app.models import Booking, Client, QRCode
from app.schemas import QRCodeResponse
from app.dependencies import get_current_user, get_user_role, require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/qr", tags=["qr-codes"])


@router.post("/bookings/{booking_id}/qr", response_model=QRCodeResponse)
async def generate_booking_qr(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Генерировать QR-код для записи."""
    logger.debug(f"QR POST: booking_id={booking_id}, user_chat_id={user.chat_id if user else 'None'}")
    if not user:
        logger.error("QR POST: No user authenticated")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Проверить, что запись принадлежит пользователю
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        logger.error(f"QR POST: Booking {booking_id} not found")
        raise HTTPException(status_code=404, detail="Booking not found")
    
    user_role = get_user_role(user)
    logger.debug(f"QR POST: booking.chat_id={booking.chat_id}, user.chat_id={user.chat_id}, user_role={user_role}")
    if booking.chat_id != user.chat_id and user_role not in ["owner", "manager"]:
        logger.error(f"QR POST: Access denied for user {user.chat_id}")
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Проверить, есть ли уже QR-код для этой записи
    result = await db.execute(select(QRCode).where(QRCode.booking_id == booking_id))
    existing_qr = result.scalar_one_or_none()
    if existing_qr:
        logger.debug(f"QR POST: Returning existing QR for booking {booking_id}")
        return existing_qr
    
    # Генерировать уникальный код
    qr_code_value = str(uuid.uuid4())
    
    # Создать QR-код
    qr = QRCode()
    qr.booking_id = booking_id
    qr.code = qr_code_value
    
    db.add(qr)
    await db.commit()
    await db.refresh(qr)
    logger.debug(f"QR POST: Created new QR for booking {booking_id}")
    
    return qr


@router.get("/bookings/{booking_id}/qr")
async def get_booking_qr_image(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(get_current_user)
):
    """Получить QR-код изображение для записи."""
    logger.debug(f"QR GET: booking_id={booking_id}, user_chat_id={user.chat_id if user else 'None'}")
    if not user:
        logger.error("QR GET: No user authenticated")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Проверить доступ
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        logger.error(f"QR GET: Booking {booking_id} not found")
        raise HTTPException(status_code=404, detail="Booking not found")
    
    user_role = get_user_role(user)
    logger.debug(f"QR GET: booking.chat_id={booking.chat_id}, user.chat_id={user.chat_id}, user_role={user_role}")
    if booking.chat_id != user.chat_id and user_role not in ["owner", "manager"]:
        logger.error(f"QR GET: Access denied for user {user.chat_id}")
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Получить QR-код
    result = await db.execute(select(QRCode).where(QRCode.booking_id == booking_id))
    qr_code = result.scalar_one_or_none()
    if not qr_code:
        logger.error(f"QR GET: QR code not found for booking {booking_id}")
        raise HTTPException(status_code=404, detail="QR code not found")
    
    try:
        # Генерировать изображение QR-кода
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_code.code)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Конвертировать в base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        logger.debug(f"QR GET: Generated image for booking {booking_id}")
        
        # Возвращаем с CORS заголовками
        return JSONResponse(
            content={
                "qr_code": f"data:image/png;base64,{img_base64}",
                "code": qr_code.code
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    except Exception as e:
        logger.error(f"QR GET: Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating QR image: {str(e)}")


@router.post("/scan")
async def scan_qr_code(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Сканировать QR-код и отметить клиента как пришедшего."""
    try:
        data = await request.json()
        qr_code_value = data.get("qr_code")
        
        if not qr_code_value:
            raise HTTPException(status_code=400, detail="QR code is required")
        
        logger.info(f"QR SCAN: code={qr_code_value}, user={user.chat_id}")
        
        # Найти QR-код в базе
        result = await db.execute(select(QRCode).where(QRCode.code == qr_code_value))
        qr_record = result.scalar_one_or_none()
        
        if not qr_record:
            logger.error(f"QR SCAN: Invalid code {qr_code_value}")
            raise HTTPException(status_code=404, detail="Invalid QR code")
        
        # Получить запись
        result = await db.execute(select(Booking).where(Booking.id == qr_record.booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            logger.error(f"QR SCAN: Booking {qr_record.booking_id} not found")
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Проверить что запись не отменена
        if booking.status == "cancelled":
            logger.error(f"QR SCAN: Booking {booking.id} is cancelled")
            raise HTTPException(status_code=400, detail="Booking is cancelled")
        
        # Отметить как пришедшего
        booking.status = "arrived"
        booking.arrived_at = datetime.now().strftime("%d.%m.%Y %H:%M")
        
        await db.commit()
        await db.refresh(booking)
        
        # Получить информацию о клиенте
        result = await db.execute(select(Client).where(Client.chat_id == booking.chat_id))
        client = result.scalar_one_or_none()
        
        logger.info(f"QR SCAN: Success for booking {booking.id}")
        
        return {
            "success": True,
            "booking_id": booking.id,
            "client_name": client.name if client else booking.name,
            "client_phone": client.phone if client else booking.phone,
            "service": booking.service,
            "master": booking.master,
            "date": booking.date,
            "time": booking.time,
            "status": booking.status,
            "message": "Клиент успешно отмечен как пришедший"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QR SCAN: Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error scanning QR code: {str(e)}")


@router.get("/verify/{qr_code}")
async def verify_qr_code(
    qr_code: str,
    db: AsyncSession = Depends(get_db),
    user: Client = Depends(require_role("owner", "manager"))
):
    """Проверить QR-код без отметки прихода (для предпросмотра)."""
    try:
        logger.info(f"QR VERIFY: code={qr_code}, user={user.chat_id}")
        
        # Найти QR-код в базе
        result = await db.execute(select(QRCode).where(QRCode.code == qr_code))
        qr_record = result.scalar_one_or_none()
        
        if not qr_record:
            raise HTTPException(status_code=404, detail="Invalid QR code")
        
        # Получить запись
        result = await db.execute(select(Booking).where(Booking.id == qr_record.booking_id))
        booking = result.scalar_one_or_none()
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Получить информацию о клиенте
        result = await db.execute(select(Client).where(Client.chat_id == booking.chat_id))
        client = result.scalar_one_or_none()
        
        return {
            "valid": True,
            "booking_id": booking.id,
            "qr_code": qr_code,
            "client_name": client.name if client else booking.name,
            "client_phone": client.phone if client else booking.phone,
            "service": booking.service,
            "master": booking.master,
            "date": booking.date,
            "time": booking.time,
            "status": booking.status,
            "is_arrived": booking.status == "arrived"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QR VERIFY: Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error verifying QR code: {str(e)}")
