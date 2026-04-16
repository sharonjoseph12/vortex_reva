"""
VORTEX Modular Sovereign Hub (v4.0.0-PRO)
========================================
Central bootstrap for modularized VORTEX protocol services.
"""
import os
import uuid
import structlog
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ── Sentry Error Tracking (no-ops if SENTRY_DSN not set) ──
_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        send_default_pii=False,  # GDPR: no PII in reports
    )

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

    await asyncio.to_thread(init_db)

    algod_ok = await asyncio.to_thread(check_algod_connection)
    if algod_ok:
        logger.info("✓ Algorand Network: Connected")

    docker_ok = await asyncio.to_thread(check_docker_available)
    if docker_ok:
        asyncio.create_task(asyncio.to_thread(preload_docker_image))
        logger.info("✓ Sovereign Sandbox: Background initialization started")

    yield
    logger.info("═══ VORTEX Modular Hub Shutdown ═══")


# ── Environment ──
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# ── CORS Origins — read from env, comma-separated ──
_cors_env = os.getenv("CORS_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]

# ── Rate Limiter ──
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="VORTEX Protocol",
    description="Refactored Sovereign Modular Architecture",
    version="4.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Trusted Host Middleware (production only) ──
if IS_PRODUCTION:
    from fastapi.middleware.trustedhost import TrustedHostMiddleware
    allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "*")
    allowed_hosts = [h.strip() for h in allowed_hosts_env.split(",")]
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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


# ── Request ID Middleware (attach to every response for log tracing) ──
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Global Exception Handler (clean 500s — no raw tracebacks leaked to clients) ──
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "unhandled_exception",
        path=str(request.url),
        method=request.method,
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=not IS_PRODUCTION)
