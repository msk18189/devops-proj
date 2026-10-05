import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("streamops.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = f"{process_time:.4f}s"

            logger.info(
                "%s - \"%s %s\" %d (%.2fms)",
                client_ip,
                request.method,
                request.url.path,
                response.status_code,
                process_time * 1000
            )
            return response
        except Exception:
            process_time = time.time() - start_time
            logger.error(
                "%s - \"%s %s\" 500 (%.2fms)",
                client_ip,
                request.method,
                request.url.path,
                process_time * 1000
            )
            raise
