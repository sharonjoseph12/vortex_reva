import asyncio
import json
from datetime import datetime, timezone
from typing import List
from sse_starlette.sse import EventSourceResponse

# Global Event Queue for Pulse
# In production, use Redis pub/sub. For local, we use a shared memory queue.
pulse_queue = asyncio.Queue()

async def emit_pulse_event(event_type: str, data: dict):
    """Broadcasts a protocol event to all connected pulse clients."""
    event = {
        "event": event_type, # e.g. "SETTLEMENT", "DISPUTE", "MASTERY"
        "data": {
            **data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    await pulse_queue.put(event)

async def pulse_generator():
    """Generator for the Pulse SSE stream."""
    while True:
        event = await pulse_queue.get()
        yield {
            "event": event["event"],
            "data": json.dumps(event["data"])
        }

# FastAPI Route (should be integrated in main.py)
# @app.get("/pulse")
# async def protocol_pulse():
#     return EventSourceResponse(pulse_generator())
