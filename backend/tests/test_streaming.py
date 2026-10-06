import io
from app.services.storage_service import StorageService
from app.models.video import Video


def create_test_video_with_file(db_session, normal_user):
    """Helper to store actual file bytes in StorageService and create DB record."""
    file_bytes = b"0123456789" * 10  # 100 bytes
    storage_key = "videos/test_stream/streamable.mp4"

    StorageService.upload_file(
        object_name=storage_key,
        file_data=io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type="video/mp4"
    )

    video = Video(
        title="Streaming Benchmark Test",
        description="Testing HTTP 206 Partial Content",
        filename="streamable.mp4",
        storage_key=storage_key,
        category="DevOps",
        duration=30,
        file_size=len(file_bytes),
        views=0,
        uploaded_by=normal_user.id
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video, file_bytes


def test_stream_video_full_content(client, db_session, normal_user):
    """Test GET /api/videos/{id}/stream without Range header returns full content (200 OK)."""
    video, file_bytes = create_test_video_with_file(db_session, normal_user)

    response = client.get(f"/api/videos/{video.id}/stream")
    assert response.status_code == 200
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-length"] == str(len(file_bytes))
    assert response.headers["content-type"] == "video/mp4"
    assert response.content == file_bytes


def test_stream_video_range_request_partial(client, db_session, normal_user):
    """Test GET /api/videos/{id}/stream with Range: bytes=0-49 returns 206 Partial Content."""
    video, file_bytes = create_test_video_with_file(db_session, normal_user)

    headers = {"Range": "bytes=0-49"}
    response = client.get(f"/api/videos/{video.id}/stream", headers=headers)

    assert response.status_code == 206
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-range"] == f"bytes 0-49/{len(file_bytes)}"
    assert response.headers["content-length"] == "50"
    assert response.headers["content-type"] == "video/mp4"
    assert response.content == file_bytes[0:50]


def test_stream_video_range_open_ended(client, db_session, normal_user):
    """Test GET /api/videos/{id}/stream with Range: bytes=50- returns remaining content."""
    video, file_bytes = create_test_video_with_file(db_session, normal_user)

    headers = {"Range": "bytes=50-"}
    response = client.get(f"/api/videos/{video.id}/stream", headers=headers)

    assert response.status_code == 206
    assert response.headers["content-range"] == f"bytes 50-99/{len(file_bytes)}"
    assert response.headers["content-length"] == "50"
    assert response.content == file_bytes[50:100]


def test_stream_video_invalid_range(client, db_session, normal_user):
    """Test GET /api/videos/{id}/stream with out-of-bounds range returns 416."""
    video, file_bytes = create_test_video_with_file(db_session, normal_user)

    headers = {"Range": "bytes=9999-10000"}
    response = client.get(f"/api/videos/{video.id}/stream", headers=headers)

    assert response.status_code == 416
    assert f"bytes */{len(file_bytes)}" in response.headers["content-range"]


def test_stream_video_not_found(client):
    """Test streaming non-existent video returns 404."""
    response = client.get("/api/videos/88888/stream")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"


def test_record_video_view(client, db_session, normal_user):
    """Test recording view on a video increments view count."""
    video, _ = create_test_video_with_file(db_session, normal_user)
    assert video.views == 0

    response = client.post(f"/api/videos/{video.id}/view")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["views"] == 1

    # Second view
    response2 = client.post(f"/api/videos/{video.id}/view")
    assert response2.json()["data"]["views"] == 2
