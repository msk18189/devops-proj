from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.errors import NotFoundException
from app.models.video import Video
from app.models.video_view import VideoView
from app.schemas.video import VideoCreate


class VideoService:
    @staticmethod
    def get_videos(
        db: Session,
        page: int = 1,
        page_size: int = 12,
        category: Optional[str] = None
    ) -> Tuple[List[Video], int]:
        query = db.query(Video)
        if category and category.lower() != "all":
            query = query.filter(Video.category.ilike(category))

        total = query.count()
        offset = (page - 1) * page_size
        items = query.order_by(desc(Video.created_at)).offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def get_video_by_id(db: Session, video_id: int) -> Video:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise NotFoundException(
                message=f"Video with ID {video_id} not found",
                code="RESOURCE_NOT_FOUND"
            )
        return video

    @staticmethod
    def create_video(db: Session, payload: VideoCreate, uploaded_by: int) -> Video:
        video = Video(
            title=payload.title,
            description=payload.description,
            filename=payload.filename,
            storage_key=payload.storage_key,
            thumbnail_key=payload.thumbnail_key,
            category=payload.category,
            duration=payload.duration,
            file_size=payload.file_size,
            views=0,
            uploaded_by=uploaded_by
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        return video

    @staticmethod
    def record_view(
        db: Session,
        video_id: int,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> None:
        video = VideoService.get_video_by_id(db, video_id)
        video.views += 1

        view_entry = VideoView(
            video_id=video.id,
            user_id=user_id,
            ip_address=ip_address
        )
        db.add(view_entry)
        db.commit()
