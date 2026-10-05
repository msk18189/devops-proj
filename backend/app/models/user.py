from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="USER", nullable=False, index=True)

    # Relationships
    videos = relationship(
        "Video",
        back_populates="uploader",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    views = relationship(
        "VideoView",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
