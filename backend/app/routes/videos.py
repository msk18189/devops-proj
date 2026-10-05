from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_authenticated_user
from app.models.user import User
from app.schemas.video import VideoCreate, VideoResponse, VideoListResponse
from app.services.video_service import VideoService

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.get("", summary="List published videos with pagination")
def list_videos(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    db: Session = Depends(get_db)
):
    """Fetch paginated video catalog from the database."""
    items, total = VideoService.get_videos(
        db=db,
        page=page,
        page_size=page_size,
        category=category
    )
    return {
        "success": True,
        "data": [VideoResponse.model_validate(v) for v in items],
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/{id}", summary="Get video details by ID")
def get_video(
    id: int,
    db: Session = Depends(get_db)
):
    """Retrieve metadata for a specific video by database ID."""
    video = VideoService.get_video_by_id(db=db, video_id=id)
    return {
        "success": True,
        "data": VideoResponse.model_validate(video)
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create video record (Authenticated)"
)
def create_video(
    payload: VideoCreate,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Create a new video metadata record associated with the authenticated user."""
    video = VideoService.create_video(db=db, payload=payload, uploaded_by=current_user.id)
    return {
        "success": True,
        "data": VideoResponse.model_validate(video)
    }
