from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import redis
import os
import time
from database import get_db
from celery_app import app as celery_app

router = APIRouter(prefix="/health", tags=["Health"])

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

@router.get("")
async def global_health_check(db: Session = Depends(get_db)):
    """
    Comprehensive health check for production uptime monitors.
    Returns 200 if healthy, 503 if any service is degraded.
    """
    health = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "database": "unknown",
            "redis": "unknown",
            "workers": "unknown"
        }
    }

    # 1. Check Database (text() required for SQLAlchemy 2.x)
    try:
        db.execute(text("SELECT 1"))
        health["services"]["database"] = "healthy"
    except Exception as e:
        health["services"]["database"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"

    # 2. Check Redis
    try:
        r = redis.from_url(REDIS_URL, socket_connect_timeout=2)
        r.ping()
        health["services"]["redis"] = "healthy"
    except Exception as e:
        health["services"]["redis"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"

    # 3. Check Celery Workers (timeout so inspect() doesn't hang)
    try:
        inspector = celery_app.control.inspect(timeout=3)
        active = inspector.ping()
        if active:
            health["services"]["workers"] = f"healthy ({len(active)} nodes)"
        else:
            health["services"]["workers"] = "no active workers"
            health["status"] = "degraded"
    except Exception as e:
        health["services"]["workers"] = f"error: {str(e)}"
        health["status"] = "degraded"

    # Return 503 so uptime monitors (UptimeRobot, Railway, etc.) detect failures
    status_code = 200 if health["status"] == "healthy" else 503
    return JSONResponse(content=health, status_code=status_code)
