import logging
from typing import Optional
import urllib3
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger("streamops.minio")


class MinioClientManager:
    """Manages MinIO client connection, bucket verification, and error handling."""

    _instance: Optional["MinioClientManager"] = None
    _client: Optional[Minio] = None
    _bucket_verified: bool = False
    _is_offline: bool = False

    def __new__(cls) -> "MinioClientManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            self._initialize_client()

    def _initialize_client(self):
        try:
            endpoint = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
            # Fast timeout for local/dev fallback when MinIO server is not active
            timeout = urllib3.Timeout(connect=0.5, read=2.0)
            http_client = urllib3.PoolManager(
                timeout=timeout,
                retries=urllib3.Retry(total=1, connect=1, read=0)
            )
            self._client = Minio(
                endpoint=endpoint,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
                http_client=http_client
            )
            self._is_offline = False
            logger.info("MinIO client initialized for endpoint: %s", endpoint)
        except Exception as exc:
            logger.error("Failed to initialize MinIO client: %s", exc)
            self._client = None
            self._is_offline = True

    def get_client(self) -> Optional[Minio]:
        if self._is_offline:
            return None
        if self._client is None:
            self._initialize_client()
        return self._client

    def ensure_bucket_exists(self) -> bool:
        """Check if bucket exists; create if missing. Cached to avoid per-request checks."""
        if self._bucket_verified:
            return True

        client = self.get_client()
        if client is None:
            return False

        try:
            found = client.bucket_exists(settings.MINIO_BUCKET)
            if not found:
                client.make_bucket(settings.MINIO_BUCKET)
                logger.info("Created MinIO bucket '%s'", settings.MINIO_BUCKET)
            self._bucket_verified = True
            return True
        except Exception as exc:
            logger.warning("MinIO bucket verification failed: %s. Using local fallback.", exc)
            self._is_offline = True
            return False

    def mark_offline(self):
        self._is_offline = True

    def check_connection(self) -> tuple[bool, str]:
        """Verify real connectivity to MinIO."""
        client = self.get_client()
        if client is None:
            return False, "MinIO is offline or uninitialized"
        try:
            client.list_buckets()
            return True, "connected"
        except Exception as exc:
            self._is_offline = True
            return False, str(exc)


minio_manager = MinioClientManager()


def get_minio_client() -> Optional[Minio]:
    return minio_manager.get_client()
