import io
import os
import logging
from typing import BinaryIO, Dict, Generator, Optional, Tuple, Union
from pathlib import Path
from minio.error import S3Error

from app.core.config import settings
from app.core.minio_client import minio_manager
from app.core.errors import DatabaseException, NotFoundException

logger = logging.getLogger("streamops.storage")


class StorageService:
    """Abstracts MinIO object storage operations with graceful local fallback support."""

    @classmethod
    def _get_local_fallback_path(cls, object_name: str) -> Path:
        base_dir = Path(settings.STORAGE_LOCAL_FALLBACK_DIR) / settings.MINIO_BUCKET
        base_dir.mkdir(parents=True, exist_ok=True)
        # Ensure subdirectories exist
        file_path = base_dir / object_name.replace("/", os.sep)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        return file_path

    @classmethod
    def upload_file(
        cls,
        object_name: str,
        file_data: BinaryIO,
        length: int,
        content_type: str = "application/octet-stream"
    ) -> str:
        """Upload a file stream to MinIO object storage."""
        client = minio_manager.get_client()
        bucket = settings.MINIO_BUCKET

        if client and minio_manager.ensure_bucket_exists():
            try:
                client.put_object(
                    bucket_name=bucket,
                    object_name=object_name,
                    data=file_data,
                    length=length,
                    content_type=content_type
                )
                logger.info("Uploaded object '%s' (%d bytes) to MinIO bucket '%s'", object_name, length, bucket)
                return object_name
            except Exception as exc:
                minio_manager.mark_offline()
                logger.warning("MinIO upload failed for '%s': %s. Using local fallback.", object_name, exc)

        # Fallback to local storage
        try:
            local_path = cls._get_local_fallback_path(object_name)
            if hasattr(file_data, "seek"):
                file_data.seek(0)
            with open(local_path, "wb") as f:
                while chunk := file_data.read(1024 * 1024):
                    f.write(chunk)
            logger.info("Saved object '%s' to local storage fallback at %s", object_name, local_path)
            return object_name
        except Exception as exc:
            logger.error("Failed to store object '%s' in fallback storage: %s", object_name, exc)
            raise DatabaseException(f"Storage failed: {exc}", code="STORAGE_ERROR")

    @classmethod
    def file_exists(cls, object_name: str) -> bool:
        """Check if an object exists in MinIO or local storage."""
        client = minio_manager.get_client()
        bucket = settings.MINIO_BUCKET

        if client:
            try:
                client.stat_object(bucket, object_name)
                return True
            except S3Error as err:
                if err.code != "NoSuchKey":
                    logger.warning("Error checking MinIO file existence: %s", err)
            except Exception:
                minio_manager.mark_offline()

        # Check local fallback
        local_path = cls._get_local_fallback_path(object_name)
        return local_path.is_file()

    @classmethod
    def get_file_metadata(cls, object_name: str) -> Dict[str, Union[int, str]]:
        """Retrieve size, content_type and metadata for an object."""
        client = minio_manager.get_client()
        bucket = settings.MINIO_BUCKET

        if client:
            try:
                stat = client.stat_object(bucket, object_name)
                return {
                    "size": stat.size,
                    "content_type": stat.content_type or "video/mp4",
                    "etag": stat.etag,
                    "last_modified": stat.last_modified
                }
            except Exception as exc:
                minio_manager.mark_offline()
                logger.warning("MinIO stat_object failed for '%s': %s", object_name, exc)

        # Check local fallback
        local_path = cls._get_local_fallback_path(object_name)
        if local_path.is_file():
            stat = local_path.stat()
            return {
                "size": stat.st_size,
                "content_type": "video/mp4",
                "etag": f'"{stat.st_mtime}"',
                "last_modified": stat.st_mtime
            }

        raise NotFoundException(f"Object '{object_name}' not found in storage", code="OBJECT_NOT_FOUND")

    @classmethod
    def download_file_stream(
        cls,
        object_name: str,
        offset: int = 0,
        length: Optional[int] = None,
        chunk_size: int = 256 * 1024
    ) -> Generator[bytes, None, None]:
        """Stream chunks of a file for HTTP partial/full responses."""
        client = minio_manager.get_client()
        bucket = settings.MINIO_BUCKET

        if client:
            try:
                response = client.get_object(
                    bucket_name=bucket,
                    object_name=object_name,
                    offset=offset,
                    length=length if length is not None else 0
                )
                try:
                    for chunk in response.stream(chunk_size):
                        yield chunk
                    return
                finally:
                    response.close()
                    response.release_conn()
            except Exception as exc:
                minio_manager.mark_offline()
                logger.warning("MinIO get_object stream failed for '%s': %s. Attempting fallback.", object_name, exc)

        # Local storage fallback
        local_path = cls._get_local_fallback_path(object_name)
        if not local_path.is_file():
            raise NotFoundException(f"Object '{object_name}' not found", code="OBJECT_NOT_FOUND")

        with open(local_path, "rb") as f:
            f.seek(offset)
            remaining = length if length is not None else (local_path.stat().st_size - offset)
            while remaining > 0:
                read_amount = min(chunk_size, remaining)
                data = f.read(read_amount)
                if not data:
                    break
                remaining -= len(data)
                yield data

    @classmethod
    def delete_file(cls, object_name: str) -> bool:
        """Remove an object from storage."""
        if not object_name:
            return False

        client = minio_manager.get_client()
        bucket = settings.MINIO_BUCKET

        deleted = False
        if client:
            try:
                client.remove_object(bucket, object_name)
                deleted = True
                logger.info("Deleted object '%s' from MinIO", object_name)
            except Exception as exc:
                minio_manager.mark_offline()
                logger.warning("MinIO remove_object failed for '%s': %s", object_name, exc)

        # Clean local fallback
        local_path = cls._get_local_fallback_path(object_name)
        if local_path.is_file():
            try:
                local_path.unlink()
                deleted = True
                logger.info("Deleted local object at %s", local_path)
            except Exception as exc:
                logger.error("Failed to delete local object file %s: %s", local_path, exc)

        return deleted
