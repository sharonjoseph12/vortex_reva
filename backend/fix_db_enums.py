
import sqlite3
import os

db_path = "vortex.db"
print(f"Checking {db_path}...")

if not os.path.exists(db_path):
    print("DB not found at current path. Checking parent...")
    db_path = os.path.join("..", "vortex.db")

if not os.path.exists(db_path):
    print("CRITICAL: DB NOT FOUND")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables_cols = {
    "bounties": ["status", "difficulty", "category", "asset_type"],
    "users": ["role"],
    "submissions": ["status"],
    "transactions": ["type", "status"],
    "disputes": ["status"]
}

for table, cols in tables_cols.items():
    print(f"Cleaning {table}...")
    try:
        for col in cols:
            cursor.execute(f"UPDATE {table} SET {col} = UPPER({col})")
        conn.commit()
        print(f"[OK] {table} normalized.")
    except Exception as e:
        print(f"[ERROR] on {table}: {e}")

print("FINAL SYNC COMPLETE.")

# Check for 'CODE' (uppercase)
cursor.execute("SELECT DISTINCT asset_type FROM bounties")
print("Bounty Asset Types currently in DB:", cursor.fetchall())

conn.close()
