# Performance Optimization Guide

This document outlines the architectural optimizations and benchmarks implemented to ensure high throughput, minimal latency, and horizontal scalability across the **DevOps for a Video Streaming Platform**.

---

## 1. Video Streaming & Partial Content (HTTP 206)

The core streaming engine avoids reading large video files into server memory:

```text
Browser Client                     FastAPI Backend                 MinIO Object Store
      │                                  │                                  │
      │── GET /api/videos/1/stream ─────>│                                  │
      │   Range: bytes=1048576-2097151   │                                  │
      │                                  │── GetObject(offset, length) ────>│
      │                                  │<── Chunk Stream (1MB) ───────────│
      │<── HTTP 206 Partial Content ─────│                                  │
      │    Content-Range: 1M-2M/50M      │                                  │
      │    (Memory: < 2MB buffered)      │                                  │
```

### Key Performance Benefits:
- **Zero Full In-Memory Loading**: Videos are served via generator chunks (`StreamingResponse`). A 1GB video consumes only ~1–2MB of RAM on the backend while streaming.
- **Fast Media Seeking**: Browsers can jump to arbitrary timestamps instantly by requesting specific byte offsets rather than downloading the entire file.
- **NGINX Buffering Disabled**: Reverse proxy directives `proxy_buffering off` and `proxy_request_buffering off` prevent disk I/O bottlenecks during concurrent video streaming and uploads.

---

## 2. Database Indexing & Query Architecture

PostgreSQL tables utilize targeted composite and single-column indexes reflecting actual query patterns:

| Table | Index Target | Query Pattern Optimized |
| :--- | :--- | :--- |
| `users` | `email` (Unique Index) | O(1) user lookup during login and registration |
| `users` | `role` | Fast filtering for administrative authorization checks |
| `videos` | `created_at` (DESC) | Default chronological catalog browsing (`sort=latest`) |
| `videos` | `views` (DESC) | High-performance sorting for popular content (`sort=popular`) |
| `videos` | `category` | Category filtering across video catalog |
| `videos` | `uploaded_by` (FK Index) | Instant queries for "My Videos" creator dashboards |
| `videos` | `storage_key` (Unique Index) | MinIO object lookup and deduplication checks |

### Query Guardrails:
- **Mandatory Pagination**: All catalog endpoints enforce bounded pagination (`page_size <= 100`) to eliminate unbounded database queries.
- **Eager Relationship Loading**: SQLAlchemy uses `lazy="selectin"` for user and view relationships, preventing the classic $N+1$ query overhead.

---

## 3. Kubernetes Autoscaling & Resource Allocation

### Tuned Resource Thresholds:
```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```
- Requests are tuned to match real application idle/normal footprints (~184MiB RAM, 10–30m CPU).
- The HPA target is configured at **70% average CPU utilization**.
- Scale-up surges up to 100% capacity or 2 pods every 15 seconds to rapidly absorb traffic spikes.
- Scale-down includes a 60-second stabilization window to prevent oscillation (flapping).

---

## 4. Frontend Performance & Bundle Optimization

### Production Build Statistics:
- **Total JavaScript Bundle**: `211.87 kB` (`61.10 kB` gzipped).
- **Total CSS Stylesheet**: `7.32 kB` (`2.16 kB` gzipped).
- **Vite Production Bundler**: Automated tree-shaking, code splitting, and asset minification.
- **Static Asset Caching & Compression**: NGINX compresses all JSON, CSS, and JS responses via Gzip with high compression levels.
- **Debounced Catalog Search**: Search queries on the frontend are debounced to prevent flooding backend API search endpoints on every keystroke.
