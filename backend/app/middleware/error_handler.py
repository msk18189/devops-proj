import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.core.errors import APIException

logger = logging.getLogger("streamops.errors")


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """Handle custom application API exceptions."""
    error_payload = {
        "code": exc.code,
        "message": exc.message
    }
    if exc.details is not None:
        error_payload["details"] = exc.details

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": error_payload
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format Pydantic schema validation failures without internal stack traces."""
    # Simplify error structure
    errors_summary = []
    for err in exc.errors():
        field_path = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        errors_summary.append({
            "field": field_path or "body",
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error")
        })

    status_422 = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
    return JSONResponse(
        status_code=status_422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed. Please check submitted fields.",
                "details": errors_summary
            }
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Format standard Starlette HTTPExceptions (e.g. 404 route not found, 405 method not allowed)."""
    code_map = {
        404: "RESOURCE_NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        500: "INTERNAL_SERVER_ERROR"
    }
    code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": str(exc.detail) if exc.detail else "An HTTP error occurred"
            }
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle database operational errors cleanly without leaking database internals."""
    logger.error("Database operational error: %s", str(exc), exc_info=False)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "success": False,
            "error": {
                "code": "DATABASE_ERROR",
                "message": "Database service is temporarily unavailable. Please retry shortly."
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected unhandled runtime exceptions."""
    logger.error("Unhandled server exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Internal stack trace is suppressed."
            }
        }
    )
