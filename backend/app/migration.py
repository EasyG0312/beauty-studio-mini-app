"""
Migration script to add arrived_at column to bookings table.
Run this on Render startup if needed.
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate_add_arrived_at():
    """Add arrived_at column to bookings table if it doesn't exist."""
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'arrived_at'
        """))
        
        if result.scalar() is None:
            print("Adding arrived_at column to bookings table...")
            await conn.execute(text("""
                ALTER TABLE bookings 
                ADD COLUMN arrived_at VARCHAR DEFAULT ''
            """))
            print("✓ arrived_at column added successfully")
        else:
            print("✓ arrived_at column already exists")


async def run_migrations():
    """Run all pending migrations."""
    print("Running database migrations...")
    try:
        await migrate_add_arrived_at()
        print("✓ All migrations completed")
    except Exception as e:
        print(f"✗ Migration error: {e}")
        # Don't raise - allow app to start even if migration fails
        # (column might already exist or DB might be SQLite)


if __name__ == "__main__":
    asyncio.run(run_migrations())
