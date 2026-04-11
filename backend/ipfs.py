"""
VORTEX Web3 Pinning Service Simulator
=====================================
Generates realistic IPFS CIDv1 hashes for mission artifacts to demonstrate 
the decentralized storage pipeline without relying on external third-party API keys.
"""

import hashlib
import base64
import logging

logger = logging.getLogger("vortex.ipfs")

def generate_ipfs_cid(content: str) -> str:
    """
    Computes a realistic-looking IPFS CIDv1 for the content.
    CIDv1 (base32) typically starts with 'bafy...'.
    """
    # Hash the raw artifact content
    sha256_hash = hashlib.sha256(content.encode("utf-8")).digest()
    
    # Encode as Base32 and lowercase to match IPFS CIDv1 conventions
    base32_hash = base64.b32encode(sha256_hash).decode("utf-8").lower().strip("=")
    
    # 'bafy' is the standard multicodec prefix for base32 encoded raw data/dag-pb in IPFS
    cid = f"bafy{base32_hash}"
    logger.info(f"[VORTEX-IPFS] Artifact Pinned. CID: {cid}")
    return cid

def upload_to_ipfs(content: str) -> str:
    """
    Simulates uploading directly to an IPFS node and pinning the layer.
    Returns standard ipfs:// URI
    """
    cid = generate_ipfs_cid(content)
    return f"ipfs://{cid}"
