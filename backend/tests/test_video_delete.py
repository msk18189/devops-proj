import io
from app.services.storage_service import StorageService
from app.models.video import Video


def create_deletable_video(db_session, owner):
    """Helper to create a video and store file in storage."""
    file_bytes = b"Video to be deleted"
    storage_key = f"videos/delete_test/{owner.id}_del.mp4"

    StorageService.upload_file(
        object_name=storage_key,
        file_data=io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type="video/mp4"
    )

    video = Video(
        title="Ephemeral Video",
        filename="del.mp4",
        storage_key=storage_key,
        category="General",
        uploaded_by=owner.id
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video


def test_owner_can_delete_own_video(client, db_session, normal_user, user_token):
    """Test video owner successfully deletes their video."""
    video = create_deletable_video(db_session, normal_user)
    headers = {"Authorization": f"Bearer {user_token}"}

    response = client.delete(f"/api/videos/{video.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["deleted"] is True

    # Verify removed from database
    assert db_session.query(Video).filter_by(id=video.id).first() is None
    # Verify removed from storage
    assert StorageService.file_exists(video.storage_key) is False


def test_admin_can_delete_any_video(client, db_session, normal_user, admin_token):
    """Test user with ADMIN role can delete any video."""
    video = create_deletable_video(db_session, normal_user)
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.delete(f"/api/videos/{video.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["deleted"] is True
    assert db_session.query(Video).filter_by(id=video.id).first() is None


def test_other_user_cannot_delete_video(client, db_session, normal_user):
    """Test non-owner non-admin user receives 403 Forbidden."""
    from app.models.user import User
    from app.core.security import hash_password, create_access_token

    # Create another regular user
    other_user = User(
        name="Other User",
        email="other@user.org",
        password_hash=hash_password("Pass123!"),
        role="USER"
    )
    db_session.add(other_user)
    db_session.commit()
    other_token = create_access_token({"sub": str(other_user.id), "email": other_user.email, "role": "USER"})

    video = create_deletable_video(db_session, normal_user)
    headers = {"Authorization": f"Bearer {other_token}"}

    response = client.delete(f"/api/videos/{video.id}", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
