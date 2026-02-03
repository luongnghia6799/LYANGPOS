import sqlite3
import os

files = [
    'instance/easypos.db',
    'backend/test_restore.db'
]

print(f"{'File':<40} | {'Orders':<10} | {'Size (KB)':<10}")
print("-" * 65)

for f in files:
    if os.path.exists(f):
        try:
            conn = sqlite3.connect(f)
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM \"order\"") # quote order just in case
            count = cur.fetchone()[0]
            size = os.path.getsize(f) / 1024
            print(f"{f:<40} | {count:<10} | {size:.2f}")
            conn.close()
        except Exception as e:
            print(f"{f:<40} | Error: {e}")
    else:
         print(f"{f:<40} | NOT FOUND")
