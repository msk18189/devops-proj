import math
import os
import uuid
import re
from typing import BinaryIO, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.core.config import settings
from app.core.errors import BadRequestException, ForbiddenException, NotFoundException
from app.models.user import User
from app.models.video import Video
from app.models.video_view import VideoView
from app.schemas.video import VideoCreate, CreatorInfo, VideoResponse
from app.services.storage_service import StorageService


class VideoService:
    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Sanitize filename to alphanumeric and safe characters."""
        base, ext = os.path.splitext(filename)
        clean_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base)
        return f"{clean_base[:50]}{ext.lower()}"

    @classmethod
    def validate_video_file(cls, filename: str, content_type: str, file_size: int) -> None:
        """Validate extension, MIME type, and size constraints."""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
            raise BadRequestException(
                f"Unsupported video extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}",
                code="INVALID_VIDEO_FORMAT"
            )

        if content_type not in settings.ALLOWED_MIME_TYPES:
            raise BadRequestException(
                f"Invalid MIME content type '{content_type}'. Must be a supported video format.",
                code="INVALID_MIME_TYPE"
            )

        max_bytes = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise BadRequestException(
                f"File size ({file_size / (1024*1024):.1f}MB) exceeds maximum allowed size of {settings.MAX_VIDEO_SIZE_MB}MB",
                code="FILE_TOO_LARGE"
            )

    @classmethod
    def upload_and_create_video(
        cls,
        db: Session,
        title: str,
        description: Optional[str],
        category: str,
        video_filename: str,
        video_content_type: str,
        video_data: BinaryIO,
        video_size: int,
        uploaded_by_user: User,
        thumbnail_filename: Optional[str] = None,
        thumbnail_data: Optional[BinaryIO] = None,
        thumbnail_size: Optional[int] = None,
        thumbnail_content_type: Optional[str] = None
    ) -> Video:
        """Handle validation, MinIO S3 storage, and database persistence with rollback."""
        cls.validate_video_file(video_filename, video_content_type, video_size)

        video_uuid = str(uuid.uuid4())
        safe_filename = cls._sanitize_filename(video_filename)
        storage_key = f"videos/{video_uuid}/{safe_filename}"

        # Upload video to MinIO
        StorageService.upload_file(
            object_name=storage_key,
            file_data=video_data,
            length=video_size,
            content_type=video_content_type
        )

        thumbnail_key = None
        if thumbnail_filename and thumbnail_data and thumbnail_size:
            thumb_ext = os.path.splitext(thumbnail_filename)[1].lower() or ".jpg"
            thumbnail_key = f"thumbnails/{video_uuid}{thumb_ext}"
            try:
                StorageService.upload_file(
                    object_name=thumbnail_key,
                    file_data=thumbnail_data,
                    length=thumbnail_size,
                    content_type=thumbnail_content_type or "image/jpeg"
                )
            except Exception:
                thumbnail_key = None

        # Save metadata to PostgreSQL with cleanup rollback on failure
        try:
            video = Video(
                title=title.strip(),
                description=description.strip() if description else None,
                filename=safe_filename,
                storage_key=storage_key,
                thumbnail_key=thumbnail_key,
                category=category.strip() if category else "General",
                duration=0,
                file_size=video_size,
                views=0,
                uploaded_by=uploaded_by_user.id
            )
            db.add(video)
            db.commit()
            db.refresh(video)
            return video
        except Exception as exc:
            db.rollback()
            # Clean up MinIO objects to prevent orphaned data
            StorageService.delete_file(storage_key)
            if thumbnail_key:
                StorageService.delete_file(thumbnail_key)
            raise exc

    @staticmethod
    def get_videos(
        db: Session,
        page: int = 1,
        page_size: int = 12,
        search: Optional[str] = None,
        category: Optional[str] = None,
        sort: str = "latest",
        user_id: Optional[int] = None
    ) -> Tuple[List[Video], int, int]:
        """Query paginated videos with optional search, category, sort, and user filters."""
        query = db.query(Video)

        if user_id is not None:
            query = query.filter(Video.uploaded_by == user_id)

        if category and category.lower() != "all":
            query = query.filter(Video.category.ilike(category))

        if search and search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Video.title.ilike(search_term),
                    Video.description.ilike(search_term),
                    Video.category.ilike(search_term)
                )
            )

        total = query.count()
        total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1

        # Sorting
        if sort == "oldest":
            query = query.order_by(asc(Video.created_at))
        elif sort in ("popular", "views"):
            query = query.order_by(desc(Video.views), desc(Video.created_at))
        elif sort == "title":
            query = query.order_by(asc(Video.title))
        else:  # default "latest"
            query = query.order_by(desc(Video.created_at))

        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total, total_pages

    @staticmethod
    def get_video_by_id(db: Session, video_id: int) -> Video:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise NotFoundException(
                message=f"Video with ID {video_id} not found",
                code="RESOURCE_NOT_FOUND"
            )
        return video

    @classmethod
    def delete_video(cls, db: Session, video_id: int, current_user: User) -> bool:
        """Delete a video with owner or admin authorization check and MinIO cleanup."""
        video = cls.get_video_by_id(db, video_id)

        # Authorization: owner or ADMIN
        if video.uploaded_by != current_user.id and current_user.role != "ADMIN":
            raise ForbiddenException(
                message="You do not have permission to delete this video",
                code="FORBIDDEN"
            )

        storage_key = video.storage_key
        thumbnail_key = video.thumbnail_key

        # Delete database record
        db.delete(video)
        db.commit()

        # Delete from MinIO
        StorageService.delete_file(storage_key)
        if thumbnail_key:
            StorageService.delete_file(thumbnail_key)

        return True

    @staticmethod
    def record_view(
        db: Session,
        video_id: int,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> int:
        """Increment view counter and log view audit trail."""
        video = VideoService.get_video_by_id(db, video_id)
        video.views += 1

        view_entry = VideoView(
            video_id=video.id,
            user_id=user_id,
            ip_address=ip_address
        )
        db.add(view_entry)
        db.commit()
        db.refresh(video)
        return video.views

    @staticmethod
    def format_video_response(video: Video) -> VideoResponse:
        """Helper to build VideoResponse with creator metadata and stream URL."""
        creator_info = None
        if video.uploader:
            creator_info = CreatorInfo(
                id=video.uploader.id,
                name=video.uploader.name,
                email=video.uploader.email
            )

        return VideoResponse(
            id=video.id,
            title=video.title,
            description=video.description,
            filename=video.filename,
            storage_key=video.storage_key,
            thumbnail_key=video.thumbnail_key,
            category=video.category,
            duration=video.duration,
            file_size=video.file_size,
            views=video.views,
            uploaded_by=video.uploaded_by,
            creator=creator_info,
            stream_url=f"/api/videos/{video.id}/stream",
            created_at=video.created_at,
            updated_at=video.updated_at
        )
