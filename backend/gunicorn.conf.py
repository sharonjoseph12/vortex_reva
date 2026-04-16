"""
Gunicorn production configuration for VORTEX Protocol.
Usage: gunicorn main:app -c gunicorn.conf.py
"""
import os
import multiprocessing

# ─── Server ──────────────────────────────────────────────
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
worker_class = "uvicorn.workers.UvicornWorker"

# 2-4 workers per CPU core is standard for async apps
workers = int(os.getenv("WEB_CONCURRENCY", max(2, multiprocessing.cpu_count())))

# ─── Timeouts ────────────────────────────────────────────
timeout = 120           # AI pipeline calls can be slow
graceful_timeout = 30
keepalive = 5

# ─── Logging ─────────────────────────────────────────────
loglevel = os.getenv("LOG_LEVEL", "info").lower()
accesslog = "-"         # stdout
errorlog = "-"          # stderr
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sμs'

# ─── Process naming ──────────────────────────────────────
proc_name = "vortex-api"
