from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.database.session import check_db_connection

router = APIRouter(prefix="/health", tags=["Health & Observability"])


@router.get("", summary="General Health Status")
def get_health():
    """Retrieve comprehensive application health and runtime status."""
    db_connected, db_msg = check_db_connection()
    return {
        "success": True,
        "data": {
            "status": "healthy" if db_connected else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "database": {
                "status": "connected" if db_connected else "disconnected",
                "message": db_msg
            }
        }
    }


@router.get("/live", summary="Kubernetes Liveness Probe")
def liveness_probe():
    """Liveness probe to confirm the application process is running."""
    return {"status": "alive"}


@router.get("/ready", summary="Kubernetes Readiness Probe")
def readiness_probe(response: Response):
    """Readiness probe to confirm external dependencies (PostgreSQL) are operational."""
    db_connected, db_msg = check_db_connection()
    if not db_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "reason": "Database connection failed",
            "details": db_msg
        }

    return {
        "status": "ready",
        "dependencies": {
            "database": "connected"
        }
    }
