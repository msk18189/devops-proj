import io
import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.security import create_access_token
from app.core.config import settings
from app.models.user import User
from app.models.video import Video
from app.services.video_service import VideoService
from app.services.storage_service import StorageService


@pytest.fixture
def client(db_session: Session):
    """Provide a TestClient with overridden database session."""
    from app.database.session import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_invalid_jwt_signature(client: TestClient):
    """Verify that requests with a forged JWT signature return HTTP 401."""
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.forged_signature_here"
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert "error" in data


def test_expired_jwt_token(client: TestClient, normal_user: User):
    """Verify that expired tokens are immediately rejected with HTTP 401."""
    expired_token = create_access_token(
        data={"sub": str(normal_user.id), "role": normal_user.role},
        expires_delta=timedelta(seconds=-60)
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401


def test_unauthorized_access_to_protected_route(client: TestClient):
    """Verify that endpoints requiring authentication reject unauthenticated requests."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_admin_only_endpoint_forbidden_for_user(client: TestClient, normal_user: User):
    """Verify that standard users cannot access admin endpoints (RBAC enforcement)."""
    user_token = create_access_token(
        data={"sub": str(normal_user.id), "role": normal_user.role}
    )
    response = client.get(
        "/api/admin/dashboard-stats",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_user_cannot_delete_other_users_video(
    client: TestClient,
    db_session: Session,
    normal_user: User,
    admin_user: User
):
    """Verify that User A cannot delete a video belonging to User B."""
    # Create video owned by admin_user
    video = Video(
        title="Admin Secret Video",
        filename="admin_vid.mp4",
        storage_key="videos/admin_secret/admin_vid.mp4",
        category="Tech",
        file_size=1024,
        views=0,
        uploaded_by=admin_user.id
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)

    # User A tries to delete it
    user_token = create_access_token(
        data={"sub": str(normal_user.id), "role": normal_user.role}
    )
    response = client.delete(
        f"/api/videos/{video.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_upload_rejects_disallowed_extension(
    client: TestClient,
    normal_user: User
):
    """Verify that uploads with unauthorized extensions (e.g. .exe, .sh) are rejected."""
    user_token = create_access_token(
        data={"sub": str(normal_user.id), "role": normal_user.role}
    )
    payload = {
        "title": "Malicious Executable",
        "category": "Tech"
    }
    files = {
        "video": ("exploit.exe", io.BytesIO(b"MZ\x90\x00malicious binary"), "application/x-dosexec")
    }
    response = client.post(
        "/api/videos/upload",
        data=payload,
        files=files,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_VIDEO_FORMAT"


def test_upload_rejects_disallowed_mime_type(
    client: TestClient,
    normal_user: User
):
    """Verify that uploads with invalid MIME type are rejected."""
    user_token = create_access_token(
        data={"sub": str(normal_user.id), "role": normal_user.role}
    )
    payload = {
        "title": "Invalid MIME",
        "category": "Tech"
    }
    files = {
        "video": ("video.mp4", io.BytesIO(b"fake data"), "application/x-php")
    }
    response = client.post(
        "/api/videos/upload",
        data=payload,
        files=files,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_MIME_TYPE"


def test_upload_rejects_oversized_file(
    client: TestClient,
    normal_user: User,
    monkeypatch
):
    """Verify that uploads exceeding MAX_VIDEO_SIZE_MB trigger HTTP 400."""
    user_token = create_access_token(
        data={"sub": str(normal_user.id), "role": normal_user.role}
    )
    # Mock max size to 1MB for unit test
    monkeypatch.setattr(settings, "MAX_VIDEO_SIZE_MB", 1)

    payload = {"title": "Oversized", "category": "General"}
    large_bytes = b"0" * (2 * 1024 * 1024)  # 2MB
    files = {
        "video": ("big_video.mp4", io.BytesIO(large_bytes), "video/mp4")
    }
    response = client.post(
        "/api/videos/upload",
        data=payload,
        files=files,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_filename_sanitization_prevents_path_traversal():
    """Verify that path traversal filenames like '../../etc/passwd.mp4' are sanitized."""
    malicious_filename = "../../../etc/shadow.mp4"
    sanitized = VideoService._sanitize_filename(malicious_filename)
    assert ".." not in sanitized
    assert "/" not in sanitized
    assert "\\" not in sanitized
    assert sanitized.endswith(".mp4")


def test_sql_injection_resilient_search(client: TestClient):
    """Verify that malicious SQL injection search inputs are safely escaped and do not cause syntax errors."""
    sql_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE videos; --",
        "1 UNION SELECT 1, 'admin', 'hash', 'ADMIN' --"
    ]
    for payload in sql_payloads:
        response = client.get(f"/api/videos?search={payload}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"]["items"], list)


def test_security_headers_present(client: TestClient):
    """Verify that defense-in-depth HTTP security headers are set on responses."""
    response = client.get("/api/health")
    assert response.status_code == 200
    headers = response.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in headers


def test_error_response_does_not_leak_stacktrace(client: TestClient):
    """Verify that 404 and 500 error responses do not leak python tracebacks or credentials."""
    response = client.get("/api/videos/99999999")
    assert response.status_code == 404
    body = response.text
    assert "Traceback" not in body
    assert "postgresql://" not in body
    assert "password" not in body.lower()
