"""
VORTEX Oracle Layer
===================
3 oracle nodes vote — 2-of-3 required for release/refund.
Single oracle can freeze (asymmetric design: easy to freeze, hard to release).

For hackathon: 3 local accounts simulate independent oracle nodes.
For production: each node runs on separate server with separate keys.
"""

import os
import logging
from typing import List

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("vortex.oracle")


def _get_algod() -> algod.AlgodClient:
    url = os.getenv("ALGORAND_ALGOD_URL", "http://127.0.0.1:4001")
    token = os.getenv("ALGORAND_ALGOD_TOKEN", "a" * 64)
    return algod.AlgodClient(token, url)


from supabase_client import supabase

def _load_oracle_accounts() -> list:
    """Load 3 oracle accounts from Supabase Vault (Production) or .env (Dev)."""
    accounts = []
    for i in range(1, 4):
        # 1. Try Cloud Vault first
        secret_name = f"oracle_{i}_mnemonic"
        mn = supabase.call_rpc("get_oracle_secret", {"name": secret_name})
        
        # 2. Fallback to environment
        if not mn:
            mn = os.getenv(f"ORACLE_{i}_MNEMONIC", "")
        
        if mn and mn != "word " * 25:
            try:
                pk = mnemonic.to_private_key(mn)
                addr = account.address_from_private_key(pk)
                accounts.append({"private_key": pk, "address": addr, "node": i})
                logger.info(f"Oracle {i} loaded via {'Vault' if secret_name in str(mn) else 'Environment'}")
            except Exception as e:
                logger.warning(f"Oracle {i} mnemonic invalid: {e}")
        else:
            logger.warning(f"Oracle {i} secret not found in Vault or Env")
    return accounts


def _wait_for_confirmation(client: algod.AlgodClient, tx_id: str, rounds: int = 4) -> dict:
    """Wait for transaction confirmation."""
    last_round = client.status()["last-round"]
    while True:
        try:
            tx_info = client.pending_transaction_info(tx_id)
            if tx_info.get("confirmed-round", 0) > 0:
                return tx_info
            if client.status()["last-round"] > last_round + rounds:
                raise TimeoutError(f"TX {tx_id} not confirmed after {rounds} rounds")
        except Exception as e:
            if "confirmed-round" in str(e):
                raise
        last_round += 1


async def cast_release_votes(app_id: int, bounty_id: str) -> List[str]:
    """
    Oracle nodes 1 and 2 vote to release funds to developer.
    2-of-3 consensus prevents single point of control —
    not even VORTEX can steal funds alone.
    
    Returns list of transaction IDs.
    """
    client = _get_algod()
    oracles = _load_oracle_accounts()
    tx_ids = []

    if len(oracles) < 2:
        logger.error("Need at least 2 oracle accounts for release vote")
        raise ValueError("Insufficient oracle accounts configured")

    # Oracle 1 votes release
    try:
        sp = client.suggested_params()
        # Application call to vote_release method
        txn = transaction.ApplicationCallTxn(
            sender=oracles[0]["address"],
            sp=sp,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[b"vote_release", bounty_id.encode()],
        )
        signed = txn.sign(oracles[0]["private_key"])
        tx_id = client.send_transaction(signed)
        _wait_for_confirmation(client, tx_id)
        tx_ids.append(tx_id)
        logger.info(f"Oracle 1 voted RELEASE: {tx_id}")
    except Exception as e:
        logger.error(f"Oracle 1 vote failed: {e}")
        raise

    # Oracle 2 votes release — triggers contract execution on 2nd vote
    try:
        sp = client.suggested_params()
        txn = transaction.ApplicationCallTxn(
            sender=oracles[1]["address"],
            sp=sp,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[b"vote_release", bounty_id.encode()],
        )
        signed = txn.sign(oracles[1]["private_key"])
        tx_id = client.send_transaction(signed)
        _wait_for_confirmation(client, tx_id)
        tx_ids.append(tx_id)
        logger.info(f"Oracle 2 voted RELEASE (contract executes): {tx_id}")
    except Exception as e:
        logger.error(f"Oracle 2 vote failed: {e}")
        raise

    return tx_ids


async def cast_refund_votes(app_id: int, bounty_id: str) -> List[str]:
    """Same 2-of-3 pattern for refunds back to buyer."""
    client = _get_algod()
    oracles = _load_oracle_accounts()
    tx_ids = []

    if len(oracles) < 2:
        raise ValueError("Insufficient oracle accounts")

    for i in range(2):
        try:
            sp = client.suggested_params()
            txn = transaction.ApplicationCallTxn(
                sender=oracles[i]["address"],
                sp=sp,
                index=app_id,
                on_complete=transaction.OnComplete.NoOpOC,
                app_args=[b"vote_refund", bounty_id.encode()],
            )
            signed = txn.sign(oracles[i]["private_key"])
            tx_id = client.send_transaction(signed)
            _wait_for_confirmation(client, tx_id)
            tx_ids.append(tx_id)
            logger.info(f"Oracle {i+1} voted REFUND: {tx_id}")
        except Exception as e:
            logger.error(f"Oracle {i+1} refund vote failed: {e}")
            raise

    return tx_ids


async def cast_freeze_vote(app_id: int, reason: str) -> str:
    """
    Single oracle can freeze — any oracle can halt for safety.
    Asymmetric design: easy to freeze (1-of-3), hard to release (2-of-3).
    Protects users in edge cases.
    """
    client = _get_algod()
    oracles = _load_oracle_accounts()

    if not oracles:
        raise ValueError("No oracle accounts configured")

    sp = client.suggested_params()
    txn = transaction.ApplicationCallTxn(
        sender=oracles[0]["address"],
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[b"trigger_freeze", reason.encode()[:1000]],
    )
    signed = txn.sign(oracles[0]["private_key"])
    tx_id = client.send_transaction(signed)
    _wait_for_confirmation(client, tx_id)
    logger.info(f"Oracle 1 triggered FREEZE: {tx_id} | Reason: {reason[:100]}")
    return tx_id


async def get_oracle_consensus_status(app_id: int) -> dict:
    """Read contract state and return current vote counts."""
    client = _get_algod()
    try:
        app_info = client.application_info(app_id)
        gs = app_info.get("params", {}).get("global-state", [])
        state = {}
        for item in gs:
            key = item["key"]
            val = item["value"]
            import base64
            decoded_key = base64.b64decode(key).decode("utf-8", errors="replace")
            if val["type"] == 2:  # uint
                state[decoded_key] = val["uint"]
            elif val["type"] == 1:  # bytes
                state[decoded_key] = base64.b64decode(val["bytes"]).decode("utf-8", errors="replace")

        return {
            "votes_release": state.get("votes_release", 0),
            "votes_refund": state.get("votes_refund", 0),
            "is_frozen": bool(state.get("is_frozen", 0)),
            "is_settled": bool(state.get("is_settled", 0)),
            "required": 2,
            "total_oracles": 3,
        }
    except Exception as e:
        logger.error(f"Failed to read oracle status: {e}")
        return {"votes_release": 0, "votes_refund": 0, "is_frozen": False,
                "is_settled": False, "required": 2, "total_oracles": 3}
