from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[Any] = Field(None, description="Optional diagnostic details")


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: DataT
    message: Optional[str] = None
