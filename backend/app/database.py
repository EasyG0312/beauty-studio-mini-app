from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

engine = create_async_engine(settings.effective_database_url, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_db_session_factory() -> async_sessionmaker:
    """Получить фабрику сессий для использования вне Depends."""
    return async_session_maker


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
