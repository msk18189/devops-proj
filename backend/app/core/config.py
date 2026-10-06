import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Video Streaming DevOps Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql://streaming_user:streaming_secure_password_replace_in_prod@localhost:5432/streaming_db"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    # Authentication & JWT
    JWT_SECRET: str = "super_secret_jwt_key_replace_with_openssl_rand_hex_32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # MinIO / Object Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_PUBLIC_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minio_admin_user"
    MINIO_SECRET_KEY: str = "minio_admin_secure_password"
    MINIO_BUCKET: str = "video-stream-bucket"
    MINIO_SECURE: bool = False

    # Upload Constraints
    MAX_VIDEO_SIZE_MB: int = 500
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".webm", ".mov", ".mkv"]
    ALLOWED_MIME_TYPES: List[str] = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-matroska",
        "application/octet-stream"  # Some browsers send this for MKV/MOV
    ]
    STORAGE_LOCAL_FALLBACK_DIR: str = "storage_data"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
