"""
VORTEX Protocol Genesis Reset (v4.0)
=====================================
Wipes the local SQLite database and re-initializes all tables.
USE WITH CAUTION: This will delete all bounty and user data.
"""
import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db

def reset_protocol():
    # Use absolute path to ensure we target the correct DB file regardless of CWD
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "vortex.db")
    
    if os.path.exists(db_path):
        print(f"DELETING protocol state at {db_path}...")
        os.remove(db_path)
    
    print("INITIALIZING Genesis State...")
    init_db()
    print("VORTEX Protocol: RE-INITIALIZED")

if __name__ == "__main__":
    reset_protocol()
