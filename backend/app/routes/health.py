from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.core.minio_client import minio_manager
from app.database.session import check_db_connection

router = APIRouter(prefix="/health", tags=["Health & Observability"])


@router.get("", summary="General Health Status")
def get_health():
    """Retrieve comprehensive application health and runtime status."""
    db_connected, db_msg = check_db_connection()
    minio_connected, minio_msg = minio_manager.check_connection()

    is_healthy = db_connected and (minio_connected or settings.ENVIRONMENT != "production")

    return {
        "success": True,
        "data": {
            "status": "healthy" if is_healthy else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "database": {
                "status": "connected" if db_connected else "disconnected",
                "message": db_msg
            },
            "storage": {
                "status": "connected" if minio_connected else ("fallback_active" if settings.ENVIRONMENT != "production" else "disconnected"),
                "message": minio_msg
            }
        }
    }


@router.get("/live", summary="Kubernetes Liveness Probe")
def liveness_probe():
    """
    Kubernetes Liveness Probe:
    Confirms the application process is running and event loop is responsive.
    Does NOT depend on external database or storage availability to prevent
    unnecessary pod termination cycles when downstream dependencies fail temporarily.
    """
    return {"status": "alive"}


@router.get("/ready", summary="Kubernetes Readiness Probe")
def readiness_probe(response: Response):
    """
    Kubernetes Readiness Probe:
    Confirms external dependencies (PostgreSQL and MinIO) are available to safely handle client traffic.
    Fails with HTTP 503 if primary database connectivity is lost, instructing Kubernetes to remove
    this pod from the Service endpoints without killing the process.
    """
    db_connected, db_msg = check_db_connection()
    minio_connected, minio_msg = minio_manager.check_connection()

    if not db_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "reason": "Database connection failed",
            "details": db_msg,
            "dependencies": {
                "database": "disconnected",
                "storage": "connected" if minio_connected else "disconnected"
            }
        }

    return {
        "status": "ready",
        "dependencies": {
            "database": "connected",
            "storage": "connected" if minio_connected else ("fallback_active" if settings.ENVIRONMENT != "production" else "disconnected")
        }
    }
