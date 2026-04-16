import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "vortex",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["worker"]
)

# Optional configuration, see the celery documentation
app.conf.update(
    result_expires=3600,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300, # 5 minutes hard limit
    # task_always_eager removed: running pipeline via FastAPI BackgroundTasks instead
)

if __name__ == "__main__":
    app.start()
