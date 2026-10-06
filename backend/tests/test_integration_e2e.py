import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.storage_service import StorageService
from app.models.video import Video


def test_full_video_lifecycle_e2e(client: TestClient, db_session: Session):
    """
    End-to-End Integration Flow:
    1. Register user
    2. Login
    3. Receive JWT authentication token
    4. Upload video (multipart/form-data)
    5. Verify PostgreSQL metadata
    6. Verify MinIO object storage existence
    7. Verify video appears in browse catalog (/api/videos)
    8. Open video details (/api/videos/{id})
    9. Request HTTP 206 partial range byte stream
    10. Stream full video content
    11. Record video playback view (/api/videos/{id}/view)
    12. Query My Videos catalog (/api/videos?user_id=...)
    13. Delete video (/api/videos/{id})
    14. Verify PostgreSQL database cleanup
    15. Verify MinIO storage object cleanup
    """
    # -------------------------------------------------------------------------
    # 1. Register User
    # -------------------------------------------------------------------------
    register_payload = {
        "name": "DevOps Engineer",
        "email": "devops.engineer@streamops.io",
        "password": "ProductionPassword2026!"
    }
    reg_res = client.post("/api/auth/register", json=register_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_data = reg_res.json()["data"]
    user_id = user_data["id"]
    assert user_data["email"] == register_payload["email"]

    # -------------------------------------------------------------------------
    # 2 & 3. Login and Receive Authentication Token
    # -------------------------------------------------------------------------
    login_payload = {
        "email": "devops.engineer@streamops.io",
        "password": "ProductionPassword2026!"
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()["data"]
    access_token = token_data["access_token"]
    assert access_token is not None
    auth_headers = {"Authorization": f"Bearer {access_token}"}

    # -------------------------------------------------------------------------
    # 4. Upload Video (multipart/form-data)
    # -------------------------------------------------------------------------
    raw_video_bytes = b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2avc1mp41" + (b"\xaa" * 500)
    video_upload_file = ("kubernetes_devops.mp4", io.BytesIO(raw_video_bytes), "video/mp4")

    upload_data = {
        "title": "Kubernetes Self-Healing and Orchestration",
        "description": "Comprehensive tutorial on pod lifecycle, replica sets, and deployment rollout.",
        "category": "Technology"
    }

    upload_res = client.post(
        "/api/videos/upload",
        headers=auth_headers,
        data=upload_data,
        files={"video": video_upload_file}
    )
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    uploaded_video = upload_res.json()["data"]
    video_id = uploaded_video["id"]
    storage_key = uploaded_video["storage_key"]

    assert uploaded_video["title"] == upload_data["title"]
    assert uploaded_video["category"] == upload_data["category"]
    assert uploaded_video["uploaded_by"] == user_id

    # -------------------------------------------------------------------------
    # 5. Verify PostgreSQL Metadata
    # -------------------------------------------------------------------------
    db_video = db_session.query(Video).filter(Video.id == video_id).first()
    assert db_video is not None
    assert db_video.title == upload_data["title"]
    assert db_video.storage_key == storage_key
    assert db_video.file_size == len(raw_video_bytes)
    assert db_video.views == 0

    # -------------------------------------------------------------------------
    # 6. Verify MinIO Object Existence
    # -------------------------------------------------------------------------
    assert StorageService.file_exists(storage_key) is True
    file_meta = StorageService.get_file_metadata(storage_key)
    assert file_meta["size"] == len(raw_video_bytes)

    # -------------------------------------------------------------------------
    # 7. Video Appears in Browse Page (/api/videos)
    # -------------------------------------------------------------------------
    browse_res = client.get("/api/videos?page=1&page_size=20&sort=latest")
    assert browse_res.status_code == 200
    browse_data = browse_res.json()["data"]
    video_ids_in_browse = [v["id"] for v in browse_data["items"]]
    assert video_id in video_ids_in_browse

    # -------------------------------------------------------------------------
    # 8. Open Video Details (/api/videos/{id})
    # -------------------------------------------------------------------------
    details_res = client.get(f"/api/videos/{video_id}")
    assert details_res.status_code == 200
    details_data = details_res.json()["data"]
    assert details_data["id"] == video_id
    assert details_data["creator"]["email"] == "devops.engineer@streamops.io"

    # -------------------------------------------------------------------------
    # 9. Request HTTP 206 Partial Range Byte Stream
    # -------------------------------------------------------------------------
    range_res = client.get(
        f"/api/videos/{video_id}/stream",
        headers={"Range": "bytes=0-99"}
    )
    assert range_res.status_code == 206
    assert range_res.headers["Accept-Ranges"] == "bytes"
    assert range_res.headers["Content-Range"] == f"bytes 0-99/{len(raw_video_bytes)}"
    assert range_res.headers["Content-Length"] == "100"
    assert len(range_res.content) == 100
    assert range_res.content == raw_video_bytes[0:100]

    # -------------------------------------------------------------------------
    # 10. Stream Full Video
    # -------------------------------------------------------------------------
    full_stream_res = client.get(f"/api/videos/{video_id}/stream")
    assert full_stream_res.status_code == 200
    assert full_stream_res.headers["Content-Type"] == "video/mp4"
    assert full_stream_res.content == raw_video_bytes

    # -------------------------------------------------------------------------
    # 11. Record Playback View (/api/videos/{id}/view)
    # -------------------------------------------------------------------------
    view_res = client.post(f"/api/videos/{video_id}/view")
    assert view_res.status_code == 200
    assert view_res.json()["data"]["views"] == 1

    # Verify view in database
    db_session.refresh(db_video)
    assert db_video.views == 1

    # -------------------------------------------------------------------------
    # 12. Query My Videos (/api/videos?user_id=...)
    # -------------------------------------------------------------------------
    my_videos_res = client.get(f"/api/videos?user_id={user_id}")
    assert my_videos_res.status_code == 200
    my_items = my_videos_res.json()["data"]["items"]
    assert len(my_items) == 1
    assert my_items[0]["id"] == video_id

    # -------------------------------------------------------------------------
    # 13. Delete Video (/api/videos/{id})
    # -------------------------------------------------------------------------
    delete_res = client.delete(f"/api/videos/{video_id}", headers=auth_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["data"]["deleted"] is True

    # -------------------------------------------------------------------------
    # 14. Verify Database Cleanup
    # -------------------------------------------------------------------------
    not_found_res = client.get(f"/api/videos/{video_id}")
    assert not_found_res.status_code == 404
    deleted_db_record = db_session.query(Video).filter(Video.id == video_id).first()
    assert deleted_db_record is None

    # -------------------------------------------------------------------------
    # 15. Verify MinIO Storage Cleanup
    # -------------------------------------------------------------------------
    assert StorageService.file_exists(storage_key) is False
