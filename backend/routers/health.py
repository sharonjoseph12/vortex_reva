from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import redis
import os
import time
from database import get_db, DATABASE_URL
from celery_app import app as celery_app

router = APIRouter(prefix="/health", tags=["Health"])

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

@router.get("")
async def global_health_check(db: Session = Depends(get_db)):
    """
    Comprehensive health check for production systems.
    Checks Database, Redis, and Worker availability.
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

    # 1. Check Database
    try:
        db.execute("SELECT 1")
        health["services"]["database"] = "healthy"
    except Exception as e:
        health["services"]["database"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"

    # 2. Check Redis
    try:
        r = redis.from_url(REDIS_URL)
        r.ping()
        health["services"]["redis"] = "healthy"
    except Exception as e:
        health["services"]["redis"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"

    # 3. Check Celery Workers
    try:
        inspector = celery_app.control.inspect()
        active = inspector.active()
        if active:
            health["services"]["workers"] = f"healthy ({len(active)} nodes)"
        else:
            health["services"]["workers"] = "unhealthy: no active workers found"
            health["status"] = "degraded"
    except Exception as e:
        health["services"]["workers"] = f"error checking workers: {str(e)}"
        health["status"] = "degraded"

    if health["status"] == "degraded":
        # We still return 200 for health checks usually, but could return 503 if mission critical
        pass

    return health
