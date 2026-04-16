import hashlib
import base64
import logging
from supabase_client import supabase

logger = logging.getLogger("vortex.storage")

def upload_to_vortex_storage(content: str, filename: str) -> str:
    """
    Production-grade artifact storage.
    Uploads to Supabase 'artifacts' bucket.
    """
    # 1. Generate a stable CID-like identifier for the filename
    sha256_hash = hashlib.sha256(content.encode("utf-8")).digest()
    base32_hash = base64.b32encode(sha256_hash).decode("utf-8").lower().strip("=")
    cid = f"bafy{base32_hash}"
    
    # 2. Upload to Supabase Storage
    # We use the CID as the filename to ensure deduplication
    public_url = supabase.upload_artifact("artifacts", f"{cid}.txt", content)
    
    logger.info(f"[VORTEX-STORAGE] Artifact Stored. URL: {public_url} | CID: {cid}")
    return public_url, cid

def generate_ipfs_cid(content: str) -> str:
    """Legacy compatibility for NFT metadata."""
    sha256_hash = hashlib.sha256(content.encode("utf-8")).digest()
    base32_hash = base64.b32encode(sha256_hash).decode("utf-8").lower().strip("=")
    return f"bafy{base32_hash}"
