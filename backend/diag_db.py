import os
import sys

# Add the project root to sys.path to resolve 'backend' imports
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base, Bounty, Submission, User

db_path = os.path.join("backend", "vortex.db")
engine = create_engine(f"sqlite:///{db_path}")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("--- Checking Bounties ---")
try:
    bounties = db.query(Bounty).all()
    for b in bounties:
        try:
            deadline_str = b.deadline.isoformat() if b.deadline else "No deadline"
            print(f"Bounty {b.id}: {b.title}, Status: {b.status}, Deadline: {deadline_str}")
        except Exception as e:
            print(f"Error formatting bounty {b.id}: {e}")
except Exception as e:
    print(f"Error querying bounties: {e}")

print("\n--- Checking Users ---")
try:
    users = db.query(User).all()
    for u in users:
        print(f"User {u.wallet_address}: Role: {u.role}")
except Exception as e:
    print(f"Error querying users: {e}")

print("\n--- Checking Submissions ---")
try:
    subs = db.query(Submission).all()
    for s in subs:
        print(f"Submission {s.id}: Bounty: {s.bounty_id}, Status: {s.status}")
except Exception as e:
    print(f"Error querying submissions: {e}")

db.close()
