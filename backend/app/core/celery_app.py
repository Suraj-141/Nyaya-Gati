from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "nyaya_gati",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.ml_tasks", "app.tasks.notification_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max for heavy ML tasks
)

# Optional: Configuration for specific queues
celery_app.conf.task_routes = {
    "app.tasks.ml_tasks.*": {"queue": "ml_tasks"},
    "app.tasks.notification_tasks.*": {"queue": "notifications"},
}
