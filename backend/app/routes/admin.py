from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.video import Video

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


@router.get("/dashboard-stats", status_code=status.HTTP_200_OK, summary="Admin Dashboard Stats")
def get_admin_dashboard_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Restricted endpoint accessible exclusively to users with the ADMIN role."""
    total_users = db.query(User).count()
    total_videos = db.query(Video).count()

    return {
        "success": True,
        "data": {
            "authorized_admin": admin_user.email,
            "system_metrics": {
                "total_users": total_users,
                "total_videos": total_videos
            }
        }
    }
