import time
from fastapi import APIRouter, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

try:
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

    HTTP_REQUESTS_TOTAL = Counter(
        "http_requests_total",
        "Total number of HTTP requests processed",
        ["method", "endpoint", "status_code"]
    )

    HTTP_REQUEST_DURATION_SECONDS = Histogram(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        ["method", "endpoint"],
        buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False


metrics_router = APIRouter(tags=["Monitoring & Telemetry"])


@metrics_router.get("/metrics", summary="Prometheus Metrics Scrape Target", include_in_schema=False)
def metrics():
    """Endpoint scraped by Prometheus server."""
    if not PROMETHEUS_AVAILABLE:
        return Response(content="# Prometheus client not installed\n", media_type="text/plain")
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not PROMETHEUS_AVAILABLE or request.url.path == "/metrics":
            return await call_next(request)

        method = request.method
        path = request.url.path
        start_time = time.time()

        try:
            response = await call_next(request)
            duration = time.time() - start_time
            status_code = str(response.status_code)

            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                endpoint=path,
                status_code=status_code
            ).inc()

            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=method,
                endpoint=path
            ).observe(duration)

            return response
        except Exception:
            duration = time.time() - start_time
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                endpoint=path,
                status_code="500"
            ).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=method,
                endpoint=path
            ).observe(duration)
            raise
