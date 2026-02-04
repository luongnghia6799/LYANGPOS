
import sqlite3
import os

db_path = 'instance/easypos.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Check if status column exists
        cursor.execute("PRAGMA table_info('order')")
        columns = [column[1] for column in cursor.fetchall()]
        if 'status' not in columns:
            print("Adding 'status' column to 'order' table...")
            cursor.execute("ALTER TABLE 'order' ADD COLUMN status VARCHAR(20) DEFAULT 'Pending'")
            conn.commit()
            print("Status column added successfully.")
        else:
            print("Status column already exists.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database {db_path} not found.")
