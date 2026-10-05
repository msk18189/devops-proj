from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database.base import Base


class VideoView(Base):
    __tablename__ = "video_views"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    video_id = Column(
        Integer,
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    ip_address = Column(String(45), nullable=True)
    watched_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=func.now(),
        nullable=False,
        index=True
    )

    # Relationships
    video = relationship("Video", back_populates="video_views")
    user = relationship("User", back_populates="views")

    def __repr__(self) -> str:
        return f"<VideoView id={self.id} video_id={self.video_id} watched_at='{self.watched_at}'>"
