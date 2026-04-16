"""
VORTEX Authentication
=====================
Wallet-based auth — zero passwords.
Nonce challenge → algosdk signature verify → JWT.
"""

import os
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from algosdk import encoding, mnemonic
from algosdk.transaction import wait_for_confirmation
import hashlib
import base64
import redis
import logging

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("vortex.auth")

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE-ME-32-CHAR-RANDOM-STRING!!")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

# ═══════════════════════════════════════════════
# NONCE STORE (In-Memory for local dev without Redis)
# ═══════════════════════════════════════════════

NONCE_TTL_SECONDS = 300  # 5 minutes
_nonce_store = {}


def generate_nonce(wallet_address: str) -> str:
    """Generate a random 32-byte hex nonce and store in-memory with TTL."""
    nonce = secrets.token_hex(32)
    key = f"auth_nonce:{wallet_address}"
    _nonce_store[key] = {"nonce": nonce, "expires": time.time() + NONCE_TTL_SECONDS}
    return nonce


# ═══════════════════════════════════════════════
# SIGNATURE VERIFICATION
# ═══════════════════════════════════════════════

def verify_algo_signature(wallet_address: str, nonce: str, stxn_b64: str) -> bool:
    """
    Verify an Algorand signed transaction against the auth challenge.
    The transaction should be a 0-algo payment to self with "VORTEX_AUTH:{nonce}" in the note.
    """
    import msgpack
    from nacl.signing import VerifyKey
    from nacl.exceptions import BadSignatureError

    # 1. Check nonce
    key = f"auth_nonce:{wallet_address}"
    nonce_entry = _nonce_store.get(key)
    if not nonce_entry or time.time() > nonce_entry["expires"]:
        logger.warning(f"[VERIFY] No nonce or expired for wallet: {wallet_address}")
        return False
    if nonce_entry["nonce"] != nonce:
        logger.warning(f"[VERIFY] Nonce mismatch for wallet: {wallet_address}")
        return False

    try:
        # 2. Decode signed transaction bytes
        stxn_bytes = base64.b64decode(stxn_b64)

        # 3. Unpack — raw=False: msgpack str keys → Python str, bin values → Python bytes
        decoded = msgpack.unpackb(stxn_bytes, raw=False, strict_map_key=False)
        raw_sig = decoded.get('sig')      # 64-byte ed25519 signature
        raw_txn_dict = decoded.get('txn') # transaction fields dict

        if not raw_sig or not raw_txn_dict:
            logger.warning("[VERIFY] Missing sig or txn in signed message")
            return False

        # 4. Validate sender and note via algosdk.
        #    NOTE: encoding.msgpack_decode() expects a base64 STRING, not raw bytes.
        stxn_obj = encoding.msgpack_decode(stxn_b64)
        txn_obj = stxn_obj.transaction

        sender = txn_obj.sender if isinstance(txn_obj.sender, str) else encoding.encode_address(txn_obj.sender)
        if sender != wallet_address:
            logger.warning(f"[VERIFY] Sender mismatch: {sender} vs {wallet_address}")
            return False

        note_bytes = getattr(txn_obj, 'note', b'')
        note_text = note_bytes.decode('utf-8', errors='replace') if note_bytes else ""
        if f"VORTEX_AUTH:{nonce}" not in note_text:
            logger.warning(f"[VERIFY] Invalid note: {note_text!r}")
            return False

        # 5. Reconstruct signed message: b"TX" + canonical msgpack of the txn dict.
        #    Repacking with use_bin_type=True is byte-identical to what the wallet signed
        #    because raw=False preserved the original str key types and dict order.
        repacked = msgpack.packb(raw_txn_dict, use_bin_type=True)
        msg_to_verify = b"TX" + repacked

        # 6. Verify ed25519 signature directly (b"TX" domain, not b"MX" from util.verify_bytes)
        verify_key = VerifyKey(encoding.decode_address(wallet_address))
        try:
            verify_key.verify(msg_to_verify, bytes(raw_sig))
            _nonce_store.pop(key, None)
            logger.info(f"[VERIFY] Auth success: {wallet_address}")
            return True
        except BadSignatureError:
            logger.warning("[VERIFY] Signature crypto check failed")
            return False

    except Exception as e:
        logger.error(f"[VERIFY] Exception: {e}", exc_info=True)
        return False




# ═══════════════════════════════════════════════
# JWT
# ═══════════════════════════════════════════════

def create_jwt(wallet_address: str, role: str) -> str:
    """Create a JWT token with wallet address and role."""
    payload = {
        "wallet": wallet_address,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_jwt(token: str) -> dict:
    """Decode and validate a JWT token. Returns payload dict."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


# ═══════════════════════════════════════════════
# FASTAPI DEPENDENCIES
# ═══════════════════════════════════════════════

async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate JWT and return current user payload."""
    return verify_jwt(credentials.credentials)


async def require_buyer(
    user: dict = Depends(require_auth),
) -> dict:
    """Require authenticated user with buyer role."""
    if user.get("role") != "buyer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Buyer role required",
        )
    return user


async def require_seller(
    user: dict = Depends(require_auth),
) -> dict:
    """Require authenticated user with seller role."""
    if user.get("role") != "seller":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller role required",
        )
    return user
