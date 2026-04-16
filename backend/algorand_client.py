"""
VORTEX Algorand Client
======================
Algorand node connections, state reading, transaction helpers.
"""

import os
import base64
import logging
from typing import Optional

from algosdk import account, mnemonic, transaction, encoding, logic
from algosdk.v2client import algod, indexer
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("vortex.algorand")


def get_algod_client() -> algod.AlgodClient:
    """Connect to Algorand node (localnet default)."""
    url = os.getenv("ALGORAND_ALGOD_URL", "http://127.0.0.1:4001")
    token = os.getenv("ALGORAND_ALGOD_TOKEN", "a" * 64)
    return algod.AlgodClient(token, url)


def get_indexer_client() -> indexer.IndexerClient:
    """Connect to Algorand indexer (localnet default)."""
    url = os.getenv("ALGORAND_INDEXER_URL", "http://127.0.0.1:8980")
    return indexer.IndexerClient("", url)


def get_account_balance(address: str) -> float:
    """Return ALGO balance as float."""
    try:
        client = get_algod_client()
        info = client.account_info(address)
        return info.get("amount", 0) / 1_000_000  # microALGO to ALGO
    except Exception as e:
        logger.error(f"Balance check failed for {address}: {e}")
        return 0.0


def verify_escrow_deposit(app_id: int, expected_algo: float) -> bool:
    """
    Verify that the smart contract's escrow address holds the promised reward.
    This is the core 'Anti-Fraud' check for the production launch.
    """
    try:
        app_address = logic.get_application_address(app_id)
        actual_balance = get_account_balance(app_address)
        
        # Buffer for minimum balance requirement (0.1 ALGO)
        # Contracts need min balance to exist/hold state
        is_funded = actual_balance >= (expected_algo + 0.1)
        
        if not is_funded:
            logger.warning(
                f"Escrow funding mismatch for App {app_id}. "
                f"Expected: {expected_algo}, Actual: {actual_balance}"
            )
        return is_funded
    except Exception as e:
        logger.error(f"Escrow verification system failure: {e}")
        return False


def get_contract_state(app_id: int) -> dict:
    """Read and decode all global state from an application."""
    try:
        client = get_algod_client()
        app_info = client.application_info(app_id)
        gs = app_info.get("params", {}).get("global-state", [])
        state = {}
        for item in gs:
            key = base64.b64decode(item["key"]).decode("utf-8", errors="replace")
            val = item["value"]
            if val["type"] == 2:
                state[key] = val["uint"]
            elif val["type"] == 1:
                state[key] = base64.b64decode(val["bytes"]).decode("utf-8", errors="replace")
        return state
    except Exception as e:
        logger.error(f"Failed to read state for app {app_id}: {e}")
        return {}


def wait_for_confirmation(tx_id: str, rounds: int = 4) -> dict:
    """Poll algod until transaction confirmed. Raise on timeout."""
    client = get_algod_client()
    last = client.status()["last-round"]
    while True:
        info = client.pending_transaction_info(tx_id)
        if info.get("confirmed-round", 0) > 0:
            return info
        if client.status()["last-round"] > last + rounds:
            raise TimeoutError(f"TX {tx_id} not confirmed after {rounds} rounds")


def get_transaction_info(tx_id: str) -> Optional[dict]:
    """Fetch full transaction details from indexer."""
    try:
        idx = get_indexer_client()
        return idx.transaction(tx_id)
    except Exception as e:
        logger.error(f"Indexer lookup failed for {tx_id}: {e}")
        return None


def create_escrow_contract(
    buyer_private_key: str,
    developer_address: str,
    oracle_1: str,
    oracle_2: str,
    oracle_3: str,
    bounty_amount_algo: float,
    app_id: int,
) -> dict:
    """
    Fund the escrow contract with the bounty amount.
    The smart contract should already be deployed (app_id provided).
    This sends a payment + app call to lock funds.
    """
    client = get_algod_client()
    buyer_address = account.address_from_private_key(buyer_private_key)
    amount_micro = int(bounty_amount_algo * 1_000_000)

    sp = client.suggested_params()

    # Payment to fund the contract's escrow address
    pay_txn = transaction.PaymentTxn(
        sender=buyer_address,
        sp=sp,
        receiver=encoding.encode_address(
            encoding.decode_address(buyer_address)  # Contract app address
        ),
        amt=amount_micro,
    )

    # Application call to initialize the bounty
    app_txn = transaction.ApplicationCallTxn(
        sender=buyer_address,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            b"create_bounty",
            encoding.decode_address(developer_address),
            encoding.decode_address(oracle_1),
            encoding.decode_address(oracle_2),
            encoding.decode_address(oracle_3),
        ],
    )

    # Group the transactions
    gid = transaction.calculate_group_id([pay_txn, app_txn])
    pay_txn.group = gid
    app_txn.group = gid

    signed_pay = pay_txn.sign(buyer_private_key)
    signed_app = app_txn.sign(buyer_private_key)

    tx_id = client.send_transactions([signed_pay, signed_app])
    result = wait_for_confirmation(tx_id)
    logger.info(f"Escrow funded: {bounty_amount_algo} ALGO, app_id={app_id}, tx={tx_id}")

    return {"app_id": app_id, "tx_id": tx_id, "confirmed_round": result.get("confirmed-round")}


def get_account_info(address: str) -> dict:
    """Return full account details including app states."""
    try:
        client = get_algod_client()
        return client.account_info(address)
    except Exception as e:
        logger.error(f"Account info failed for {address}: {e}")
        return {}


def mint_mastery_nft(
    solver_address: str,
    bounty_title: str,
    ipfs_cid: str
) -> dict:
    """
    Mint a Sovereign Mastery NFT (ASA) for the solver.
    Immortalizes the achievement on Algorand logic.
    """
    client = get_algod_client()
    # For demo: use Oracle 1 as the minter/authority
    mn = os.getenv("ORACLE_1_MNEMONIC", "")
    if not mn:
        raise ValueError("ORACLE_1_MNEMONIC not found for minting")
    
    minter_pk = mnemonic.to_private_key(mn)
    minter_addr = account.address_from_private_key(minter_pk)
    
    sp = client.suggested_params()
    
    # 1. Create ASA (NFT)
    txn = transaction.AssetConfigTxn(
        sender=minter_addr,
        sp=sp,
        total=1,
        default_frozen=False,
        unit_name="VRTX-M",
        asset_name=f"VORTEX Mastery: {bounty_title[:20]}",
        manager=minter_addr,
        reserve=minter_addr,
        freeze=minter_addr,
        clawback=minter_addr,
        url=f"ipfs://{ipfs_cid}",
        decimals=0
    )
    
    signed = txn.sign(minter_pk)
    tx_id = client.send_transaction(signed)
    result = wait_for_confirmation(tx_id)
    
    # Get the asset index
    asset_id = result.get("asset-index")
    logger.info(f"Mastery NFT Minted: asset_id={asset_id}, tx={tx_id}")
    
    # 2. In a real scenario, the Solver would need to OP-IN to the asset.
    # For this demo, we assume the Solver address is provided and the minting
    # itself is the benchmark of success.
    
    return {
        "asset_id": asset_id, 
        "tx_id": tx_id, 
        "confirmed_round": result.get("confirmed-round")
    }


def check_algod_connection() -> bool:
    """Verify Algorand node is reachable."""
    try:
        client = get_algod_client()
        client.status()
        return True
    except Exception:
        return False
