from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.base import Base
from app.database.session import get_db
from app.models.user import User
from app.models.video import Video
from app.core.security import hash_password, create_access_token

# In-memory SQLite for isolated, fast, reliable unit & integration tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create fresh database tables for each test function and roll back after."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def normal_user(db_session):
    """Create a standard registered user with USER role."""
    user = User(
        name="John Doe",
        email="john@example.com",
        password_hash=hash_password("ValidPassword123!"),
        role="USER"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    """Create an administrator user with ADMIN role."""
    admin = User(
        name="Admin Ops",
        email="admin@streamops.io",
        password_hash=hash_password("AdminSecurePassword123!"),
        role="ADMIN"
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def user_token(normal_user):
    """Generate a valid JWT token for normal user."""
    return create_access_token({
        "sub": str(normal_user.id),
        "email": normal_user.email,
        "role": normal_user.role
    })


@pytest.fixture
def admin_token(admin_user):
    """Generate a valid JWT token for admin user."""
    return create_access_token({
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role
    })


@pytest.fixture
def sample_video(db_session, normal_user):
    """Create a sample video metadata record."""
    video = Video(
        title="Introduction to Kubernetes HPA",
        description="Learn how to autoscale workloads based on CPU and custom metrics.",
        filename="intro_k8s.mp4",
        storage_key="videos/2026/05/intro_k8s.mp4",
        thumbnail_key="thumbs/2026/05/intro_k8s.jpg",
        category="DevOps",
        duration=745,
        file_size=52428800,
        views=42,
        uploaded_by=normal_user.id
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video
