import re
import time
from fastapi import APIRouter, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

try:
    from prometheus_client import (
        Counter,
        Gauge,
        Histogram,
        generate_latest,
        CONTENT_TYPE_LATEST
    )

    # 1. HTTP Traffic & Latency Metrics
    HTTP_REQUESTS_TOTAL = Counter(
        "http_requests_total",
        "Total number of HTTP requests processed by endpoint and status",
        ["method", "route", "status"]
    )

    HTTP_REQUEST_DURATION_SECONDS = Histogram(
        "http_request_duration_seconds",
        "HTTP request latency in seconds for calculating P95/P99 distributions",
        ["method", "route"],
        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
    )

    HTTP_REQUESTS_IN_PROGRESS = Gauge(
        "http_requests_in_progress",
        "Number of concurrent active HTTP requests in flight",
        ["method", "route"]
    )

    # 2. Application-Level Video Streaming Domain Metrics
    VIDEO_UPLOADS_TOTAL = Counter(
        "video_uploads_total",
        "Total number of video uploads initiated and processed",
        ["status"]
    )

    VIDEO_STREAM_REQUESTS_TOTAL = Counter(
        "video_stream_requests_total",
        "Total number of HTTP video streaming requests served",
        ["status"]
    )

    VIDEO_STREAM_FAILURES_TOTAL = Counter(
        "video_stream_failures_total",
        "Total number of streaming failures encountered during chunk delivery"
    )

    VIDEO_VIEWS_TOTAL = Counter(
        "video_views_total",
        "Total recorded video playback view events"
    )

    # 3. Database Operation Telemetry
    DATABASE_OPERATION_DURATION_SECONDS = Histogram(
        "database_operation_duration_seconds",
        "Latency of database transactions in seconds",
        ["operation"],
        buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
    )

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False


def normalize_route_path(path: str) -> str:
    """Normalize path parameters to bounded route templates to prevent high cardinality."""
    path = re.sub(r"/api/videos/\d+/stream", "/api/videos/{video_id}/stream", path)
    path = re.sub(r"/api/videos/\d+/thumbnail", "/api/videos/{video_id}/thumbnail", path)
    path = re.sub(r"/api/videos/\d+/view", "/api/videos/{video_id}/view", path)
    path = re.sub(r"/api/videos/\d+", "/api/videos/{video_id}", path)
    return path


metrics_router = APIRouter(tags=["Monitoring & Telemetry"])


@metrics_router.get("/metrics", summary="Prometheus Metrics Scrape Target", include_in_schema=False)
def metrics():
    """Scrape endpoint queried periodically by Prometheus server."""
    if not PROMETHEUS_AVAILABLE:
        return Response(content="# Prometheus client not available\n", media_type="text/plain")
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not PROMETHEUS_AVAILABLE or request.url.path == "/metrics":
            return await call_next(request)

        method = request.method
        route = normalize_route_path(request.url.path)
        start_time = time.time()

        HTTP_REQUESTS_IN_PROGRESS.labels(method=method, route=route).inc()
        try:
            response = await call_next(request)
            status_code = str(response.status_code)
            duration = time.time() - start_time

            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                route=route,
                status=status_code
            ).inc()

            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=method,
                route=route
            ).observe(duration)

            return response
        except Exception:
            duration = time.time() - start_time
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                route=route,
                status="500"
            ).inc()

            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=method,
                route=route
            ).observe(duration)
            raise
        finally:
            HTTP_REQUESTS_IN_PROGRESS.labels(method=method, route=route).dec()
