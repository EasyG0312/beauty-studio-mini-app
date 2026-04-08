"""
Wrapper для запуска приложения с полным логированием ошибок.
Нужен для Render чтобы видеть traceback при старте.
"""
import sys
import traceback
import uvicorn

def main():
    try:
        print("=" * 60)
        print("Starting import...")
        print("=" * 60)
        
        # Импортируем настройки
        from app.config import settings
        print(f"✅ Config loaded")
        print(f"   DATABASE_URL: {'set' if settings.database_url else 'NOT SET'}")
        print(f"   BOT_TOKEN: {'set' if settings.bot_token else 'NOT SET'}")
        print(f"   ADMIN_IDS: {settings.admin_ids}")
        print(f"   CORS_ORIGINS: {settings.cors_origins}")
        
        # Импортируем приложение
        from app.main import app
        print("✅ App imported successfully")
        
        # Запускаем
        print("Starting uvicorn...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except Exception as e:
        print("=" * 60)
        print(f"❌ FATAL ERROR: {e}")
        print("=" * 60)
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
