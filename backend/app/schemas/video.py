import math
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class VideoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    category: str = Field("General", max_length=100)


class VideoCreate(VideoBase):
    filename: str = Field(..., max_length=255)
    storage_key: str = Field(..., max_length=500)
    thumbnail_key: Optional[str] = Field(None, max_length=500)
    duration: int = Field(0, ge=0)
    file_size: int = Field(0, ge=0)


class CreatorInfo(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class VideoResponse(VideoBase):
    id: int
    filename: str
    storage_key: str
    thumbnail_key: Optional[str] = None
    duration: int
    file_size: int
    views: int
    uploaded_by: int
    creator: Optional[CreatorInfo] = None
    stream_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VideoListResponse(BaseModel):
    items: List[VideoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int = 1


class VideoViewResponse(BaseModel):
    video_id: int
    views: int
    message: str = "View recorded successfully"


class VideoDeleteResponse(BaseModel):
    id: int
    deleted: bool = True
    message: str = "Video deleted successfully"
