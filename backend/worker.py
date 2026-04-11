import time
import os
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal, Transaction, TransactionStatus
# In production, use algosdk to verify. For now, we simulate the Indexer match.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vortex-worker")

def verify_on_chain(tx_hash: str) -> bool:
    """
    Simulates querying the Algorand Indexer.
    In production: 
    response = indexer_client.search_transactions(txid=tx_hash)
    return len(response['transactions']) > 0
    """
    # Simulate network latency and 90% success for demo
    time.sleep(1) 
    return True

def sync_ledger():
    db: Session = SessionLocal()
    try:
        pending_txs = db.query(Transaction).filter(
            Transaction.status == TransactionStatus.PENDING
        ).all()
        
        if not pending_txs:
            return

        logger.info(f"Syncing {len(pending_txs)} pending transactions with Algorand Indexer...")
        
        for tx in pending_txs:
            if verify_on_chain(tx.tx_hash):
                tx.status = TransactionStatus.CONFIRMED
                logger.info(f"Transaction {tx.tx_hash[:12]}... CONFIRMED on-chain.")
        
        db.commit()
    except Exception as e:
        logger.error(f"Sync error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("VORTEX Indexer Sync Worker started.")
    while True:
        sync_ledger()
        time.sleep(30) # Poll indexer every 30s
