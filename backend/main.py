"""
VORTEX Modular Sovereign Hub (v4.0.0-PRO)
========================================
Central bootstrap for modularized VORTEX protocol services.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from algorand_client import check_algod_connection
from sandbox import check_docker_available, preload_docker_image
from routers import identity, marketplace, pipeline, governance, telemetry, comments

logger = logging.getLogger("vortex.hub")
logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═══ VORTEX Modular Hub Starting ═══")
    init_db()
    
    if check_algod_connection():
        logger.info("✓ Algorand Network: Connected")
    
    if check_docker_available():
        import asyncio
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
