"""
VORTEX Supabase Client Utility
==============================
Centralized wrapper for Supabase REST and Storage APIs.
Uses service_role key for backend operations.
"""

import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("vortex.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class SupabaseClient:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        self.base_headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }

    def upload_artifact(self, bucket: str, path: str, content: str) -> str:
        """Upload content to Supabase Storage and return public URL."""
        if not self.url or not self.key:
            logger.warning("Supabase credentials missing. Falling back to local/simulation.")
            return f"local://{path}"

        upload_url = f"{self.url}/storage/v1/object/{bucket}/{path}"
        try:
            with httpx.Client() as client:
                res = client.post(
                    upload_url,
                    headers={**self.base_headers, "Content-Type": "text/plain"},
                    content=content
                )
                if res.status_code in [200, 201]:
                    return f"{self.url}/storage/v1/object/public/{bucket}/{path}"
                else:
                    logger.error(f"Upload failed: {res.text}")
                    return f"error://upload-failed"
        except Exception as e:
            logger.error(f"Supabase connection error: {e}")
            return f"error://{str(e)}"

    def call_rpc(self, function_name: str, params: dict) -> any:
        """Call a Postgres function (RPC) via PostgREST."""
        rpc_url = f"{self.url}/rest/v1/rpc/{function_name}"
        try:
            with httpx.Client() as client:
                res = client.post(rpc_url, headers=self.base_headers, json=params)
                res.raise_for_status()
                return res.json()
        except Exception as e:
            logger.error(f"RPC call failed: {e}")
            return None

    def broadcast(self, channel: str, event: str, payload: dict) -> bool:
        """Emit a Realtime Broadcast event via Supabase server-side API."""
        if not self.url or not self.key:
            return False

        # Supabase server-side broadcast: POST /realtime/v1/api/broadcast
        # Body must be {"messages": [{"topic": ..., "event": ..., "payload": ...}]}
        broadcast_url = f"{self.url}/realtime/v1/api/broadcast"
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.post(
                    broadcast_url,
                    headers={
                        **self.base_headers,
                        "Content-Type": "application/json",
                    },
                    json={
                        "messages": [
                            {
                                "topic": channel,
                                "event": event,
                                "payload": payload,
                            }
                        ]
                    }
                )
                if res.status_code not in [200, 202]:
                    logger.warning(f"Broadcast got {res.status_code}: {res.text[:120]}")
                return res.status_code in [200, 202]
        except Exception as e:
            logger.error(f"Broadcast failed: {e}")
            return False

supabase = SupabaseClient()
