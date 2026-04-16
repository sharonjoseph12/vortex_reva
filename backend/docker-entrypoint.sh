#!/bin/sh
set -e

# Run Alembic migrations on startup if we are running the API web server
if [ "$ROLE" = "api" ]; then
    echo "Running Database Migrations..."
    alembic upgrade head
    
    echo "Starting FastAPI Application..."
    # Gunicorn with Uvicorn workers for high concurrency
    exec gunicorn main:app -c gunicorn.conf.py
elif [ "$ROLE" = "worker" ]; then
    echo "Starting Celery Worker..."
    # concurrency matches number of cores
    exec celery -A celery_app worker --loglevel=info --concurrency=4
else
    echo "Unknown ROLE environment variable. Valid options: 'api' or 'worker'."
    exit 1
fi
