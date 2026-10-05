from sqlalchemy import Column, Integer, BigInteger, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.base import TimestampMixin


class Video(Base, TimestampMixin):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    storage_key = Column(String(500), unique=True, index=True, nullable=False)
    thumbnail_key = Column(String(500), nullable=True)
    category = Column(String(100), default="General", index=True, nullable=False)
    duration = Column(Integer, default=0, nullable=False)  # Duration in seconds
    file_size = Column(BigInteger, default=0, nullable=False)  # File size in bytes
    views = Column(Integer, default=0, nullable=False, index=True)

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Relationships
    uploader = relationship("User", back_populates="videos")
    video_views = relationship(
        "VideoView",
        back_populates="video",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Video id={self.id} title='{self.title}' views={self.views}>"
