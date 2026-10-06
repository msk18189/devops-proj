import io
from app.services.storage_service import StorageService


def test_storage_upload_and_exists():
    """Test uploading a file stream and verifying existence."""
    content = b"fake MP4 video binary header and content"
    stream = io.BytesIO(content)
    object_name = "test/videos/sample_test.mp4"

    uploaded = StorageService.upload_file(
        object_name=object_name,
        file_data=stream,
        length=len(content),
        content_type="video/mp4"
    )
    assert uploaded == object_name
    assert StorageService.file_exists(object_name) is True

    # Check metadata
    meta = StorageService.get_file_metadata(object_name)
    assert meta["size"] == len(content)

    # Test download stream
    downloaded = b"".join(StorageService.download_file_stream(object_name))
    assert downloaded == content

    # Test range stream
    range_data = b"".join(StorageService.download_file_stream(object_name, offset=5, length=10))
    assert range_data == content[5:15]

    # Delete
    deleted = StorageService.delete_file(object_name)
    assert deleted is True
    assert StorageService.file_exists(object_name) is False
