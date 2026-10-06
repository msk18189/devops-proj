import os
import mimetypes
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    Query,
    Request,
    Response,
    UploadFile,
    status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, require_authenticated_user
from app.core.errors import BadRequestException, NotFoundException
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User
from app.schemas.video import (
    VideoResponse,
    VideoListResponse,
    VideoViewResponse,
    VideoDeleteResponse
)
from app.services.video_service import VideoService
from app.services.storage_service import StorageService
from app.monitoring.metrics import (
    VIDEO_UPLOADS_TOTAL,
    VIDEO_STREAM_REQUESTS_TOTAL,
    VIDEO_STREAM_FAILURES_TOTAL,
    VIDEO_VIEWS_TOTAL
)

router = APIRouter(prefix="/videos", tags=["Videos & Streaming"])


@router.get("", summary="List and search video catalog")
def list_videos(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query string"),
    category: Optional[str] = Query(None, description="Category filter"),
    sort: str = Query("latest", description="Sort order: latest, oldest, popular, title"),
    user_id: Optional[int] = Query(None, description="Filter videos by creator ID"),
    db: Session = Depends(get_db)
):
    """Retrieve paginated video collection with search, category filtering, and sorting."""
    items, total, total_pages = VideoService.get_videos(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        category=category,
        sort=sort,
        user_id=user_id
    )

    formatted_items = [VideoService.format_video_response(v) for v in items]

    return {
        "success": True,
        "data": {
            "items": [item.model_dump() for item in formatted_items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    }


@router.get("/{id}", summary="Get video details")
def get_video(
    id: int,
    db: Session = Depends(get_db)
):
    """Fetch video metadata and creator details by ID."""
    video = VideoService.get_video_by_id(db=db, video_id=id)
    return {
        "success": True,
        "data": VideoService.format_video_response(video).model_dump()
    }


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload video file to MinIO storage"
)
async def upload_video(
    video: UploadFile = File(..., description="Video binary file"),
    title: str = Form(..., min_length=1, max_length=255, description="Video title"),
    description: Optional[str] = Form(None, description="Video description"),
    category: str = Form("General", description="Video category"),
    thumbnail: Optional[UploadFile] = File(None, description="Optional custom thumbnail"),
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Upload a video file to MinIO object storage and store metadata in PostgreSQL."""
    if not video.filename:
        raise BadRequestException("Video file must have a valid filename", code="INVALID_FILENAME")

    # Read video content to inspect size and stream
    video_bytes = await video.read()
    video_size = len(video_bytes)
    video_content_type = video.content_type or mimetypes.guess_type(video.filename)[0] or "video/mp4"

    import io
    video_stream = io.BytesIO(video_bytes)

    thumbnail_stream = None
    thumb_size = None
    thumb_name = None
    thumb_type = None

    if thumbnail and thumbnail.filename:
        thumb_bytes = await thumbnail.read()
        thumb_size = len(thumb_bytes)
        thumb_name = thumbnail.filename
        thumb_type = thumbnail.content_type or "image/jpeg"
        thumbnail_stream = io.BytesIO(thumb_bytes)

    try:
        created_video = VideoService.upload_and_create_video(
            db=db,
            title=title,
            description=description,
            category=category,
            video_filename=video.filename,
            video_content_type=video_content_type,
            video_data=video_stream,
            video_size=video_size,
            uploaded_by_user=current_user,
            thumbnail_filename=thumb_name,
            thumbnail_data=thumbnail_stream,
            thumbnail_size=thumb_size,
            thumbnail_content_type=thumb_type
        )
        VIDEO_UPLOADS_TOTAL.labels(status="success").inc()
    except Exception:
        VIDEO_UPLOADS_TOTAL.labels(status="failure").inc()
        raise

    return {
        "success": True,
        "data": VideoService.format_video_response(created_video).model_dump()
    }


@router.delete(
    "/{id}",
    status_code=status.HTTP_200_OK,
    summary="Delete video from storage and database"
)
def delete_video(
    id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Delete video metadata from PostgreSQL and remove binary object from MinIO."""
    VideoService.delete_video(db=db, video_id=id, current_user=current_user)
    return {
        "success": True,
        "data": VideoDeleteResponse(id=id, deleted=True).model_dump()
    }


@router.post(
    "/{id}/view",
    status_code=status.HTTP_200_OK,
    summary="Record video view event"
)
def record_video_view(
    id: int,
    request: Request,
    token: Optional[str] = Query(None, description="Optional bearer token for tracking authenticated viewer"),
    db: Session = Depends(get_db)
):
    """Record an authentic view event and increment view counter."""
    user_id = None
    if token:
        try:
            payload = decode_access_token(token)
            user_id = int(payload.get("sub"))
        except Exception:
            pass

    client_ip = request.client.host if request.client else None
    views = VideoService.record_view(db=db, video_id=id, user_id=user_id, ip_address=client_ip)
    VIDEO_VIEWS_TOTAL.inc()

    return {
        "success": True,
        "data": VideoViewResponse(video_id=id, views=views).model_dump()
    }


@router.get(
    "/{id}/stream",
    summary="Stream video with HTTP byte-range support"
)
def stream_video(
    id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Stream video content directly from MinIO with HTTP 206 partial content range support."""
    video = VideoService.get_video_by_id(db=db, video_id=id)

    # Check file exists in storage
    if not StorageService.file_exists(video.storage_key):
        VIDEO_STREAM_FAILURES_TOTAL.inc()
        raise NotFoundException("Video media object not found in storage", code="VIDEO_FILE_MISSING")

    metadata = StorageService.get_file_metadata(video.storage_key)
    file_size = int(metadata["size"])
    content_type = str(metadata.get("content_type") or mimetypes.guess_type(video.filename)[0] or "video/mp4")

    # Parse HTTP Range header (e.g., 'bytes=0-1048576' or 'bytes=1048576-')
    range_header = request.headers.get("Range")

    if not range_header or not range_header.startswith("bytes="):
        # Full content response
        VIDEO_STREAM_REQUESTS_TOTAL.labels(status="200").inc()
        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
            "Content-Disposition": f'inline; filename="{video.filename}"'
        }
        return StreamingResponse(
            StorageService.download_file_stream(video.storage_key),
            status_code=status.HTTP_200_OK,
            headers=headers,
            media_type=content_type
        )

    # Handle Range request
    range_val = range_header.replace("bytes=", "").strip()
    range_parts = range_val.split("-")

    status_416 = getattr(status, "HTTP_416_RANGE_NOT_SATISFIABLE", 416)
    try:
        start = int(range_parts[0]) if range_parts[0] else 0
        end = int(range_parts[1]) if len(range_parts) > 1 and range_parts[1] else file_size - 1
    except ValueError:
        VIDEO_STREAM_FAILURES_TOTAL.inc()
        return Response(
            status_code=status_416,
            headers={"Content-Range": f"bytes */{file_size}"}
        )

    if start >= file_size or end >= file_size or start > end:
        VIDEO_STREAM_FAILURES_TOTAL.inc()
        return Response(
            status_code=status_416,
            headers={"Content-Range": f"bytes */{file_size}"}
        )

    chunk_length = end - start + 1
    VIDEO_STREAM_REQUESTS_TOTAL.labels(status="206").inc()
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_length),
        "Content-Type": content_type,
        "Content-Disposition": f'inline; filename="{video.filename}"'
    }

    return StreamingResponse(
        StorageService.download_file_stream(video.storage_key, offset=start, length=chunk_length),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        headers=headers,
        media_type=content_type
    )


@router.get(
    "/{id}/thumbnail",
    summary="Get video thumbnail image"
)
def get_thumbnail(
    id: int,
    db: Session = Depends(get_db)
):
    """Serve the thumbnail image for a video if available."""
    video = VideoService.get_video_by_id(db=db, video_id=id)
    if not video.thumbnail_key or not StorageService.file_exists(video.thumbnail_key):
        raise NotFoundException("Thumbnail not found for this video", code="THUMBNAIL_NOT_FOUND")

    metadata = StorageService.get_file_metadata(video.thumbnail_key)
    content_type = str(metadata.get("content_type") or "image/jpeg")

    return StreamingResponse(
        StorageService.download_file_stream(video.thumbnail_key),
        status_code=status.HTTP_200_OK,
        media_type=content_type
    )
