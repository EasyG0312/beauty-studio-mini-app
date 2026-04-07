"""
Миграция БД - добавление недостающих колонок
"""
import sqlite3
import sys

DB_PATH = r'c:\Users\HOME\Desktop\telega bot\backend\salon.db'

def migrate():
    print("🔄 Миграция БД...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Проверяем какие колонки есть в clients
    cursor.execute("PRAGMA table_info(clients)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"\n📋 Текущие колонки в clients: {columns}")
    
    # Missing columns to add
    migrations = {
        'clients': [
            ("notes", "TEXT DEFAULT ''"),
            ("rfm_segment", "TEXT DEFAULT ''"),
            ("rfm_score", "TEXT DEFAULT ''"),
            ("total_saved", "INTEGER DEFAULT 0"),
        ],
        'bookings': [
            ("actual_amount", "INTEGER DEFAULT 0"),
            ("no_show_checked", "INTEGER DEFAULT 0"),
            ("cancel_reason", "TEXT DEFAULT ''"),
            ("is_on_the_way", "INTEGER DEFAULT 0"),
        ],
    }
    
    for table, cols in migrations.items():
        for col_name, col_type in cols:
            if col_name not in columns:
                try:
                    sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"
                    cursor.execute(sql)
                    print(f"   ✅ Добавлена колонка: {table}.{col_name}")
                except Exception as e:
                    print(f"   ⚠️ Ошибка добавления {col_name}: {e}")
            else:
                print(f"   ⏭️  {table}.{col_name} уже существует")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Миграция завершена!")
    
    # Проверка
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(clients)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"\n📋 Итоговые колонки в clients: {columns}")
    conn.close()

if __name__ == "__main__":
    migrate()
