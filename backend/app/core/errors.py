from typing import Any, Optional


class APIException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        details: Optional[Any] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class NotFoundException(APIException):
    def __init__(self, message: str = "Resource not found", code: str = "RESOURCE_NOT_FOUND", details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=404, details=details)


class BadRequestException(APIException):
    def __init__(self, message: str = "Bad request", code: str = "BAD_REQUEST", details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=400, details=details)


class UnauthorizedException(APIException):
    def __init__(self, message: str = "Unauthorized", code: str = "UNAUTHORIZED", details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=401, details=details)


class ForbiddenException(APIException):
    def __init__(self, message: str = "Forbidden", code: str = "FORBIDDEN", details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=403, details=details)


class ConflictException(APIException):
    def __init__(self, message: str = "Conflict", code: str = "CONFLICT", details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=409, details=details)


class DatabaseException(APIException):
    def __init__(self, message: str = "Database operation failed", code: str = "DATABASE_ERROR", details: Optional[Any] = None):
        super().__init__(message=message, code=code, status_code=503, details=details)
