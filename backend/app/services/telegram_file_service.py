"""
Сервис для работы с Telegram файлами (портфолио, фото мастеров)
"""
import httpx
import logging
from typing import Optional, Tuple
from app.config import settings

logger = logging.getLogger(__name__)


class TelegramFileService:
    """Сервис для загрузки и управления файлами из Telegram."""
    
    BASE_URL = "https://api.telegram.org/bot"
    
    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self.api_url = f"{self.BASE_URL}{bot_token}"
    
    async def get_file_url(self, file_id: str) -> Optional[str]:
        """Получить прямой URL для скачивания файла."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/getFile",
                    params={"file_id": file_id}
                )
                data = response.json()
                
                if data.get("ok"):
                    file_path = data["result"]["file_path"]
                    return f"{self.BASE_URL}{self.bot_token}/file/{file_path}"
                else:
                    logger.error(f"Telegram API error: {data}")
                    return None
        except Exception as e:
            logger.error(f"Error getting file URL: {e}")
            return None
    
    async def download_file(self, file_id: str) -> Optional[bytes]:
        """Скачать файл из Telegram."""
        file_url = await self.get_file_url(file_id)
        if not file_url:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(file_url)
                return response.content
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            return None
    
    async def upload_photo(self, chat_id: int, file_path: str, caption: str = "") -> Optional[str]:
        """Загрузить фото в Telegram и вернуть file_id."""
        try:
            async with httpx.AsyncClient() as client:
                with open(file_path, "rb") as f:
                    files = {"photo": f}
                    data = {
                        "chat_id": chat_id,
                        "caption": caption
                    }
                    response = await client.post(
                        f"{self.api_url}/sendPhoto",
                        data=data,
                        files=files
                    )
                    
                data = response.json()
                if data.get("ok"):
                    file_id = data["result"]["photo"][-1]["file_id"]
                    return file_id
                else:
                    logger.error(f"Telegram upload error: {data}")
                    return None
        except Exception as e:
            logger.error(f"Error uploading photo: {e}")
            return None
    
    async def get_file_info(self, file_id: str) -> Optional[dict]:
        """Получить информацию о файле."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/getFile",
                    params={"file_id": file_id}
                )
                data = response.json()
                
                if data.get("ok"):
                    return data["result"]
                else:
                    return None
        except Exception as e:
            logger.error(f"Error getting file info: {e}")
            return None
    
    async def validate_file_id(self, file_id: str) -> bool:
        """Проверить валидность file_id."""
        info = await self.get_file_info(file_id)
        return info is not None


# Глобальный экземпляр сервиса
telegram_file_service = TelegramFileService(settings.bot_token.get_secret_value())
