"""
VORTEX Modular Sovereign Hub (v4.0.0-PRO)
========================================
Central bootstrap for modularized VORTEX protocol services.
"""
import os
import structlog
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from algorand_client import check_algod_connection
from sandbox import check_docker_available, preload_docker_image
from routers import identity, marketplace, pipeline, governance, telemetry, comments, health

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger("vortex.hub")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═══ VORTEX Modular Hub Starting ═══")
    import asyncio
    
    # Run DB init in thread to be safe if it's sync
    await asyncio.to_thread(init_db)
    
    # Don't block the main event loop with synchronous network/docker checks
    algod_ok = await asyncio.to_thread(check_algod_connection)
    if algod_ok:
        logger.info("✓ Algorand Network: Connected")
    
    docker_ok = await asyncio.to_thread(check_docker_available)
    if docker_ok:
        asyncio.create_task(asyncio.to_thread(preload_docker_image))
        logger.info("✓ Sovereign Sandbox: Background initialization started")
    
    yield
    logger.info("═══ VORTEX Modular Hub Shutdown ═══")

app = FastAPI(
    title="VORTEX Protocol",
    description="Refactored Sovereign Modular Architecture",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Modular Routers ──
app.include_router(identity.router)
app.include_router(marketplace.router)
app.include_router(pipeline.router)
app.include_router(governance.router)
app.include_router(telemetry.router)
app.include_router(comments.router)
app.include_router(health.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
