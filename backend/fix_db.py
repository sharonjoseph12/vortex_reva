import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "vortex.db")

def fix_schema():
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Adding 'forensic_report' column to 'submissions' table...")
        cursor.execute("ALTER TABLE submissions ADD COLUMN forensic_report JSON;")
        print("Column 'forensic_report' added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column 'forensic_report' already exists.")
        else:
            print(f"Error adding column: {e}")
            
    conn.commit()
    conn.close()
    print("Database sync complete.")

if __name__ == "__main__":
    fix_schema()
