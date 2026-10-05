import pytest
from sqlalchemy import text
from app.models.user import User
from app.models.video import Video
from app.models.video_view import VideoView
from app.core.security import hash_password


def test_database_connection(db_session):
    """Test raw database session execution."""
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1


def test_user_persistence(db_session):
    """Test creating, reading, and querying User model."""
    user = User(
        name="Grace Hopper",
        email="grace@navy.mil",
        password_hash=hash_password("CompilerPioneer123!"),
        role="ADMIN"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.name == "Grace Hopper"
    assert user.role == "ADMIN"
    assert user.created_at is not None
    assert user.updated_at is not None

    queried = db_session.query(User).filter_by(email="grace@navy.mil").first()
    assert queried is not None
    assert queried.id == user.id


def test_video_and_views_relationship(db_session, normal_user):
    """Test Video model creation, foreign key relationship, and view tracking."""
    video = Video(
        title="PostgreSQL Indexing Deep Dive",
        description="B-tree, Hash, GIN, and BRIN indexes explained.",
        filename="pg_indexing.mp4",
        storage_key="videos/pg_indexing.mp4",
        thumbnail_key="thumbs/pg_indexing.jpg",
        category="Databases",
        duration=1200,
        file_size=104857600,
        views=0,
        uploaded_by=normal_user.id
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)

    assert video.uploader.id == normal_user.id
    assert video.uploader.name == normal_user.name

    # Add a view record
    view = VideoView(
        video_id=video.id,
        user_id=normal_user.id,
        ip_address="192.168.1.100"
    )
    db_session.add(view)
    video.views += 1
    db_session.commit()

    assert len(video.video_views) == 1
    assert video.video_views[0].ip_address == "192.168.1.100"
    assert video.views == 1
