import time
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette import status


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware that injects defense-in-depth security response headers."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking mitigation
        response.headers["X-Frame-Options"] = "DENY"

        # Cross-Site Scripting protection for legacy browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer privacy policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy (allows self and safe inline styles/media)
        if "Content-Security-Policy" not in response.headers:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self' 'unsafe-inline' data: blob:; "
                "img-src 'self' data: blob: http: https:; "
                "media-src 'self' data: blob: http: https:; "
                "frame-ancestors 'none';"
            )

        return response


class SimpleRateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Lightweight in-memory rate limiter for sensitive authentication & upload endpoints.
    Protects against brute force and resource exhaustion without external cache dependency.
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Maps (client_ip, bucket_key) -> list of request timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def _is_rate_limited(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        # Prune older timestamps
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        if len(self.requests[key]) >= self.max_requests:
            return True

        self.requests[key].append(now)
        return False

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Only apply rate limiting to sensitive routes
        is_sensitive = any(
            path.startswith(prefix)
            for prefix in [
                "/api/auth/login",
                "/api/auth/register",
                "/api/videos/upload"
            ]
        )

        if is_sensitive and request.method == "POST":
            client_ip = request.client.host if request.client else "unknown"
            bucket_key = f"{client_ip}:{path}"

            # Check if testing bypass header is set or if rate limited
            if self._is_rate_limited(bucket_key):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "success": False,
                        "error": {
                            "code": "TOO_MANY_REQUESTS",
                            "message": "Rate limit exceeded. Please wait before retrying."
                        }
                    },
                    headers={"Retry-After": str(self.window_seconds)}
                )

        return await call_next(request)
