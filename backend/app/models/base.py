from datetime import datetime
from sqlalchemy import Column, DateTime, func
from app.database.base import Base


class TimestampMixin:
    """Reusable mixin for created_at and updated_at timestamps."""
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=func.now(),
        nullable=False,
        index=True
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
