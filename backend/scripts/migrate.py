#!/usr/bin/env python3
"""
Migration Script for Beauty Studio Database
========================================

Использование:
    python scripts/migrate.py --action [upgrade|downgrade|current|history] [--version VERSION]

Примеры:
    python scripts/migrate.py --action upgrade
    python scripts/migrate.py --action downgrade --version 001
    python scripts/migrate.py --action current
    python scripts/migrate.py --action history
"""

import os
import sys
import argparse
import asyncio
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime

# Добавляем корневую директорию в Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session_factory
from sqlalchemy import text

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MigrationManager:
    """Менеджер миграций базы данных"""
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.migrations_dir = Path(__file__).parent / "migrations"
        
    async def ensure_migration_table(self):
        """Создать таблицу миграций если не существует"""
        async with self.db_session_factory() as db:
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(50) PRIMARY KEY,
                    description TEXT,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT true
                )
            """))
            await db.commit()
    
    async def get_applied_migrations(self) -> List[str]:
        """Получить список примененных миграций"""
        async with self.db_session_factory() as db:
            result = await db.execute(text("""
                SELECT version FROM schema_migrations 
                WHERE success = true 
                ORDER BY applied_at
            """))
            return [row[0] for row in result.fetchall()]
    
    async def get_pending_migrations(self) -> List[str]:
        """Получить список ожидающих миграций"""
        applied = await self.get_applied_migrations()
        
        # Получаем все файлы миграций
        migration_files = []
        for file_path in self.migrations_dir.glob("*.sql"):
            if file_path.name.startswith("README"):
                continue
            version = file_path.stem
            migration_files.append(version)
        
        # Сортируем по версии
        migration_files.sort()
        
        # Возвращаем только те, которые еще не применены
        return [m for m in migration_files if m not in applied]
    
    async def apply_migration(self, version: str) -> bool:
        """Применить конкретную миграцию"""
        migration_file = self.migrations_dir / f"{version}.sql"
        
        if not migration_file.exists():
            logger.error(f"Migration file not found: {migration_file}")
            return False
        
        logger.info(f"Applying migration: {version}")
        
        try:
            # Читаем SQL файл
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Применяем миграцию
            async with self.db_session_factory() as db:
                # Начинаем транзакцию
                await db.execute(text("BEGIN"))
                
                try:
                    # Выполняем SQL миграции
                    await db.execute(text(sql_content))
                    
                    # Записываем в таблицу миграций
                    await db.execute(text("""
                        INSERT INTO schema_migrations (version, description, applied_at, success)
                        VALUES (:version, :description, :applied_at, true)
                    """), {
                        'version': version,
                        'description': f"Applied migration {version}",
                        'applied_at': datetime.utcnow()
                    })
                    
                    await db.commit()
                    logger.info(f"Migration {version} applied successfully")
                    return True
                    
                except Exception as e:
                    # Откатываем транзакцию при ошибке
                    await db.execute(text("ROLLBACK"))
                    
                    # Записываем неудачную попытку
                    await db.execute(text("""
                        INSERT INTO schema_migrations (version, description, applied_at, success)
                        VALUES (:version, :description, :applied_at, false)
                    """), {
                        'version': version,
                        'description': f"Failed migration {version}: {str(e)}",
                        'applied_at': datetime.utcnow()
                    })
                    
                    await db.commit()
                    logger.error(f"Migration {version} failed: {e}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error reading migration file {version}: {e}")
            return False
    
    async def upgrade(self, target_version: Optional[str] = None):
        """Применить все ожидающие миграции"""
        await self.ensure_migration_table()
        
        pending = await self.get_pending_migrations()
        
        if not pending:
            logger.info("No pending migrations")
            return True
        
        if target_version:
            if target_version not in pending:
                logger.error(f"Migration {target_version} not in pending migrations")
                return False
            
            # Применяем только до указанной версии
            target_index = pending.index(target_version)
            pending = pending[:target_index + 1]
        
        logger.info(f"Applying {len(pending)} pending migrations")
        
        for version in pending:
            success = await self.apply_migration(version)
            if not success:
                logger.error(f"Migration stopped at {version}")
                return False
        
        logger.info("All migrations applied successfully")
        return True
    
    async def downgrade(self, target_version: str):
        """Откатить до указанной версии"""
        await self.ensure_migration_table()
        
        applied = await self.get_applied_migrations()
        
        if target_version not in applied:
            logger.error(f"Migration {target_version} not found in applied migrations")
            return False
        
        # Получаем миграции для отката
        target_index = applied.index(target_version)
        to_rollback = applied[target_index + 1:]
        
        if not to_rollback:
            logger.info("No migrations to rollback")
            return True
        
        logger.info(f"Rolling back {len(to_rollback)} migrations")
        
        # Откатываем в обратном порядке
        for version in reversed(to_rollback):
            migration_file = self.migrations_dir / f"{version}_rollback.sql"
            
            if not migration_file.exists():
                logger.warning(f"No rollback script found for {version}")
                continue
            
            try:
                with open(migration_file, 'r', encoding='utf-8') as f:
                    sql_content = f.read()
                
                async with self.db_session_factory() as db:
                    await db.execute(text("BEGIN"))
                    
                    try:
                        await db.execute(text(sql_content))
                        
                        # Удаляем запись о миграции
                        await db.execute(text("""
                            DELETE FROM schema_migrations WHERE version = :version
                        """), {'version': version})
                        
                        await db.commit()
                        logger.info(f"Rolled back migration {version}")
                        
                    except Exception as e:
                        await db.execute(text("ROLLBACK"))
                        logger.error(f"Failed to rollback {version}: {e}")
                        return False
                        
            except Exception as e:
                logger.error(f"Error reading rollback script {version}: {e}")
                return False
        
        logger.info("Rollback completed successfully")
        return True
    
    async def current_version(self) -> Optional[str]:
        """Получить текущую версию миграции"""
        await self.ensure_migration_table()
        
        async with self.db_session_factory() as db:
            result = await db.execute(text("""
                SELECT version FROM schema_migrations 
                WHERE success = true 
                ORDER BY applied_at DESC 
                LIMIT 1
            """))
            row = result.fetchone()
            return row[0] if row else None
    
    async def history(self):
        """Показать историю миграций"""
        await self.ensure_migration_table()
        
        async with self.db_session_factory() as db:
            result = await db.execute(text("""
                SELECT version, description, applied_at, success
                FROM schema_migrations 
                ORDER BY applied_at DESC
            """))
            
            print("\nMigration History:")
            print("-" * 80)
            for row in result.fetchall():
                version, description, applied_at, success = row
                status = "✓" if success else "✗"
                print(f"{status} {version} - {description}")
                print(f"    Applied: {applied_at}")
                print()
    
    async def status(self):
        """Показать статус миграций"""
        await self.ensure_migration_table()
        
        applied = await self.get_applied_migrations()
        pending = await self.get_pending_migrations()
        current = await self.current_version()
        
        print(f"\nMigration Status:")
        print(f"Current Version: {current or 'None'}")
        print(f"Applied Migrations: {len(applied)}")
        print(f"Pending Migrations: {len(pending)}")
        
        if pending:
            print("\nPending Migrations:")
            for version in pending:
                print(f"  - {version}")
        else:
            print("\n✓ Database is up to date")


async def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description="Database migration tool")
    parser.add_argument(
        '--action',
        choices=['upgrade', 'downgrade', 'current', 'history', 'status'],
        required=True,
        help='Migration action'
    )
    parser.add_argument(
        '--version',
        help='Target version for upgrade/downgrade'
    )
    
    args = parser.parse_args()
    
    # Получаем factory сессий БД
    db_session_factory = get_db_session_factory()
    migration_manager = MigrationManager(db_session_factory)
    
    try:
        if args.action == 'upgrade':
            success = await migration_manager.upgrade(args.version)
            sys.exit(0 if success else 1)
            
        elif args.action == 'downgrade':
            if not args.version:
                logger.error("Version is required for downgrade")
                sys.exit(1)
            success = await migration_manager.downgrade(args.version)
            sys.exit(0 if success else 1)
            
        elif args.action == 'current':
            version = await migration_manager.current_version()
            print(f"Current migration version: {version or 'None'}")
            
        elif args.action == 'history':
            await migration_manager.history()
            
        elif args.action == 'status':
            await migration_manager.status()
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
