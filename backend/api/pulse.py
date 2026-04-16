import json
import asyncio
from datetime import datetime, timezone
from supabase_client import supabase

def emit_pulse_event(event_type: str, data: dict):
    """
    Broadcasts a protocol event to all connected pulse clients.
    Uses Supabase Realtime Edge Network.
    """
    payload = {
        "event": event_type, 
        "data": {
            **data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    # 1. Broadast to Supabase Realtime
    supabase.broadcast("protocol_pulse", event_type, payload)
    
    # 2. Local Fallback (keep print for logs)
    print(f"[VORTEX-PULSE] {event_type} | {json.dumps(data)[:100]}...")

async def pulse_generator():
    """
    SSE Generator for local frontend compatibility.
    In Production, the frontend should listen to Supabase Realtime directly.
    """
    # This remains as a placeholder for local dev streaming
    while True:
        yield {
            "event": "heartbeat",
            "data": json.dumps({"status": "healthy", "ts": datetime.now(timezone.utc).isoformat()})
        }
        await asyncio.sleep(10)
