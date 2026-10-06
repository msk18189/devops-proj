from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.dependencies import require_admin
from app.database.session import get_db, check_db_connection
from app.models.user import User
from app.models.video import Video
from app.models.video_view import VideoView
from app.schemas.video import VideoResponse
from app.services.video_service import VideoService

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


@router.get("/dashboard-stats", status_code=status.HTTP_200_OK, summary="Admin Dashboard Operational Metrics")
def get_admin_dashboard_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Serve real database-backed operational metrics for the Admin Dashboard."""
    total_users = db.query(User).count()
    total_videos = db.query(Video).count()

    total_views = db.query(func.coalesce(func.sum(Video.views), 0)).scalar() or 0
    total_audit_views = db.query(VideoView).count()

    # Recent 5 uploaded videos
    recent_videos = (
        db.query(Video)
        .order_by(desc(Video.created_at))
        .limit(5)
        .all()
    )

    db_connected, db_msg = check_db_connection()

    return {
        "success": True,
        "data": {
            "authorized_admin": admin_user.email,
            "admin_profile": {
                "id": admin_user.id,
                "name": admin_user.name,
                "email": admin_user.email,
                "role": admin_user.role
            },
            "metrics": {
                "total_users": total_users,
                "total_videos": total_videos,
                "total_views": int(total_views),
                "total_view_events": total_audit_views
            },
            "system_metrics": {
                "total_users": total_users,
                "total_videos": total_videos,
                "total_views": int(total_views)
            },
            "recent_videos": [
                VideoService.format_video_response(v).model_dump()
                for v in recent_videos
            ],
            "system_health": {
                "database": "connected" if db_connected else "disconnected",
                "database_message": db_msg,
                "status": "operational" if db_connected else "degraded"
            }
        }
    }


@router.get("/videos", summary="Admin video management list")
def admin_list_videos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-level catalog query for monitoring and content moderation."""
    items, total, total_pages = VideoService.get_videos(
        db=db,
        page=page,
        page_size=page_size,
        sort="latest"
    )
    return {
        "success": True,
        "data": {
            "items": [VideoService.format_video_response(v).model_dump() for v in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    }
