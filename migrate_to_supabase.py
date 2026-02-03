
import os
import sys
import sqlite3
import psycopg2
from psycopg2 import sql
from datetime import datetime

# Local SQLite Path (Try instance folder first, then local)
SQLITE_DB = 'instance/easypos.db'
if not os.path.exists(SQLITE_DB):
    SQLITE_DB = 'easypos.db'

print(f"=== Antigravity Migration Tool v1.0 ===")
print(f"Source Database: {SQLITE_DB}")

if not os.path.exists(SQLITE_DB):
    print(f"ERROR: Cannot find {SQLITE_DB}")
    sys.exit(1)

# Ask for Postgres Connection String
print("\nEnter your Supabase Connection String (URI):")
print("Example: postgresql://postgres.abc:password@db.abc.supabase.co:6543/postgres")
pg_url = input("Paste here: ").strip()

if not pg_url:
    print("Error: No connection string provided.")
    sys.exit(1)

# Fix for SQLAlchemy format if user provides (though we use psycopg2 directly for speed)
if pg_url.startswith("postgres://"):
    pg_url = pg_url.replace("postgres://", "postgresql://", 1)

try:
    # 1. Connect to SQLite
    print(f"\n[1/3] Connecting to Local SQLite...")
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sq_cur = sqlite_conn.cursor()

    # 2. Connect to Postgres
    print(f"[2/3] Connecting to Remote PostgreSQL...")
    pg_conn = psycopg2.connect(pg_url)
    pg_cur = pg_conn.cursor()
    
    # --- CLEAN SLATE OPTION ---
    print("\n[?] Do you want to WIPE all existing data on Cloud before migrating? (Clean Slate)")
    print("    This fixes specific ID conflicts and ensures a clean import.")
    wipe = input("    Type 'DELETE' to confirm wipe, or Enter to skip: ").strip()
    
    if wipe == 'DELETE':
        print("\n[!] Wiping Cloud Database...", end=" ", flush=True)
        # Use TRUNCATE CASCADE to remove data and all dependent children
        # We exclude 'user' table to prevent locking ourselves out, unless logic dictates otherwise
        # But 'user' data is in SQLite too. Let's wipe everything except maybe User if ID conflict?
        # Actually, let's wipe BUSINESS data.
        
        tables_to_wipe = [
            '"order"', 'order_detail', 'cash_voucher', 'bank_transaction',
            'customer_price', 'combo_item', 'voice_alias', 
            'product', 'partner', 'bank_account', 'print_template', 'app_setting'
        ]
        
        # We can do one big TRUNCATE with CASCADE
        # Note: "user" table is risky. If we wipe it, we must ensure SQLite has users.
        # Let's wipe everything to be safe for a full restore.
        # Including "user" but be careful.
        
        all_tables = ", ".join(tables_to_wipe) + ', "user"'
        try:
            pg_cur.execute(f"TRUNCATE TABLE {all_tables} RESTART IDENTITY CASCADE;")
            pg_conn.commit()
            print("Done! (All clean)")
        except Exception as e:
            pg_conn.rollback()
            print(f"Failed to wipe: {e}")
            print("Continuing with merge attempt...")

    # 3. Migration Wrapper
    def migrate_table(table_name, columns, conflict_col='id', table_quoted=None, bool_cols=None):
        target_table = table_quoted if table_quoted else table_name
        print(f"  > Migrating table '{table_name}'...", end=" ", flush=True)
        try:
            # Fetch from SQLite
            col_str = ", ".join(columns)
            # SQLite allows "order" unquoted usually, or we quote it
            sq_cur.execute(f"SELECT {col_str} FROM \"{table_name}\"") # Quote for safety
            rows = sq_cur.fetchall()
            
            if not rows:
                print(f"Skipped (0 rows)")
                return

            # Insert into Postgres
            count = 0
            for row in rows:
                # Prepare values with explicit Bool casting
                values = []
                for col in columns:
                    val = row[col]
                    if bool_cols and col in bool_cols:
                         if val is not None:
                             val = bool(val)
                    values.append(val)
                
                values = tuple(values)
                
                placeholders = ", ".join(["%s"] * len(columns))
                update_clause = ", ".join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'])
                
                if not update_clause: 
                    stmt = f"INSERT INTO {target_table} ({col_str}) VALUES ({placeholders}) ON CONFLICT ({conflict_col}) DO NOTHING"
                else:
                    stmt = f"INSERT INTO {target_table} ({col_str}) VALUES ({placeholders}) ON CONFLICT ({conflict_col}) DO UPDATE SET {update_clause}"

                pg_cur.execute(stmt, values)
                count += 1
            
            print(f"Done ({count} rows)")
        
        except sqlite3.OperationalError as e:
            # Maybe table doesn't exist or column mismatch
            print(f"Skipped (Local issue: {e})")
        except Exception as e:
            print(f"FAILED: {e}")
            pg_conn.rollback() # Rollback so next queries can run

    # --- DEFINE TABLES AND COLUMNS TO MIGRATE ---
    # Be careful with Foreign Keys order!
    
    print("\n[3/3] Starting Data Transfer...")

    # 1. Users
    # "user" is a reserved keyword in Postgres, so we must quote it
    migrate_table('user', ['id', 'username', 'password_hash', 'display_name', 'role', 'created_at'], table_quoted='"user"')
    
    # 2. Settings
    migrate_table('app_setting', ['id', 'setting_key', 'setting_value'], conflict_col='setting_key')
    
    # 3. Product dependencies (VoiceAlias)
    # Wait, tables order: Product -> then VoiceAlias / ComboItem
    migrate_table('product', ['id', 'name', 'code', 'unit', 'secondary_unit', 'multiplier', 
                              'cost_price', 'sale_price', 'stock', 'expiry_date', 
                              'active_ingredient', 'brand', 'is_combo'], 
                              bool_cols=['is_combo'])
                              
    migrate_table('voice_alias', ['id', 'product_id', 'alias_name'])
    
    migrate_table('combo_item', ['id', 'combo_id', 'product_id', 'quantity'])

    # 4. Partners
    migrate_table('partner', ['id', 'name', 'type', 'is_customer', 'is_supplier', 
                              'cccd', 'phone', 'address', 'debt_balance'],
                              bool_cols=['is_customer', 'is_supplier'])
                              
    migrate_table('customer_price', ['id', 'partner_id', 'product_id', 'price'])

    # 5. Orders & Details
    # "order" is a reserved keyword in Postgres, so we must quote it
    migrate_table('order', ['id', 'date', 'partner_id', 'total_amount', 'payment_method', 
                            'type', 'note', 'amount_paid', 'old_debt', 'display_id'], table_quoted='"order"')
                            
    # 6. Order Detail
    migrate_table('order_detail', ['id', 'order_id', 'product_id', 'product_name_override', 'quantity', 'price'])
    
    # 7. Cash Voucher
    migrate_table('cash_voucher', ['id', 'partner_id', 'amount', 'date', 'note', 'type', 'source', 'order_id'])

    # 8. Bank
    migrate_table('bank_account', ['id', 'bank_name', 'account_number', 'account_holder', 'balance', 'created_at'])
    
    migrate_table('bank_transaction', ['id', 'account_id', 'amount', 'date', 'type', 'note', 'partner_id', 'order_id'])
    
    # 9. Templates
    migrate_table('print_template', ['id', 'name', 'module', 'is_default', 'config', 'content_config'],
                  bool_cols=['is_default'])

    # Commit
    pg_conn.commit()
    print("\n=== SUCCESS: Migration Completed! ===")
    print("Please reload your website to see the data.")

except Exception as e:
    print(f"\nCRITICAL ERROR: {e}")
    if 'pg_conn' in locals() and pg_conn:
        pg_conn.rollback()

finally:
    if 'sqlite_conn' in locals() and sqlite_conn: sqlite_conn.close()
    if 'pg_conn' in locals() and pg_conn: pg_conn.close()
