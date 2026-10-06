import io
import pytest
from app.core.config import settings


def test_upload_video_success(client, normal_user, user_token):
    """Test successful multipart video upload by authenticated user."""
    video_bytes = b"MP4 dummy video content bytes header" * 100
    headers = {"Authorization": f"Bearer {user_token}"}

    files = {
        "video": ("kubernetes_deep_dive.mp4", io.BytesIO(video_bytes), "video/mp4")
    }
    data = {
        "title": "Kubernetes Architecture Deep Dive",
        "description": "An end-to-end guide to control planes and worker nodes.",
        "category": "Kubernetes"
    }

    response = client.post("/api/videos/upload", headers=headers, data=data, files=files)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    video_data = body["data"]
    assert video_data["title"] == "Kubernetes Architecture Deep Dive"
    assert video_data["category"] == "Kubernetes"
    assert "videos/" in video_data["storage_key"]
    assert video_data["file_size"] == len(video_bytes)
    assert video_data["creator"]["id"] == normal_user.id


def test_upload_video_with_thumbnail(client, normal_user, user_token):
    """Test uploading video with accompanying custom thumbnail."""
    video_bytes = b"WebM video test stream data" * 50
    thumb_bytes = b"JPEG fake image bytes" * 10
    headers = {"Authorization": f"Bearer {user_token}"}

    files = {
        "video": ("demo_clip.webm", io.BytesIO(video_bytes), "video/webm"),
        "thumbnail": ("cover.jpg", io.BytesIO(thumb_bytes), "image/jpeg")
    }
    data = {
        "title": "Cloud Native Observability",
        "category": "Monitoring"
    }

    response = client.post("/api/videos/upload", headers=headers, data=data, files=files)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert "thumbnails/" in body["data"]["thumbnail_key"]


def test_upload_video_unauthenticated(client):
    """Test upload rejected with 401 when no token is present."""
    files = {
        "video": ("clip.mp4", io.BytesIO(b"content"), "video/mp4")
    }
    data = {"title": "No Auth Video"}

    response = client.post("/api/videos/upload", data=data, files=files)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "MISSING_TOKEN"


def test_upload_video_invalid_extension(client, user_token):
    """Test upload rejected when file has forbidden extension."""
    files = {
        "video": ("malicious_script.exe", io.BytesIO(b"binary"), "video/mp4")
    }
    data = {"title": "Bad File"}
    headers = {"Authorization": f"Bearer {user_token}"}

    response = client.post("/api/videos/upload", headers=headers, data=data, files=files)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_VIDEO_FORMAT"


def test_upload_video_invalid_mime_type(client, user_token):
    """Test upload rejected when MIME type is not a valid video type."""
    files = {
        "video": ("document.mp4", io.BytesIO(b"text data"), "text/plain")
    }
    data = {"title": "Spoofed MIME"}
    headers = {"Authorization": f"Bearer {user_token}"}

    response = client.post("/api/videos/upload", headers=headers, data=data, files=files)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_MIME_TYPE"


def test_upload_video_too_large(client, user_token, monkeypatch):
    """Test upload rejected when file exceeds MAX_VIDEO_SIZE_MB."""
    # Set limit to 0.001 MB (approx 1KB) for test
    monkeypatch.setattr(settings, "MAX_VIDEO_SIZE_MB", 0.001)

    large_bytes = b"A" * 5000  # 5KB > 1KB
    files = {
        "video": ("large.mp4", io.BytesIO(large_bytes), "video/mp4")
    }
    data = {"title": "Too Large Video"}
    headers = {"Authorization": f"Bearer {user_token}"}

    response = client.post("/api/videos/upload", headers=headers, data=data, files=files)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
