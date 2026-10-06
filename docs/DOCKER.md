# Docker & Docker Compose Architecture Guide

This document explains the containerization strategy, multi-stage Docker builds, NGINX reverse-proxy configuration, persistent data volumes, and container orchestration with Docker Compose for the **DevOps Video Streaming Platform**.

---

## 1. Container Architecture & Topology

The Docker Compose configuration encapsulates all platform services within an isolated, private bridge network (`streamops-network`):

```text
                                  USER BROWSER
                                        │
                         ┌──────────────┴──────────────┐
                         │ :3000                       │ :8000 (direct API/Swagger)
                         ▼                             ▼
                 ┌───────────────┐             ┌───────────────┐
                 │   frontend    │             │    backend    │
                 │(NGINX + React)│──── /api ──►│ (FastAPI App) │
                 └───────────────┘             └───────┬───────┘
                                                       │
                                  ┌────────────────────┴────────────────────┐
                                  │                                         │
                                  ▼                                         ▼
                          ┌───────────────┐                         ┌───────────────┐
                          │   postgres    │                         │     minio     │
                          │(PostgreSQL 16)│                         │ (S3 Storage)  │
                          └───────┬───────┘                         └───────┬───────┘
                                  │                                         │
                                  ▼                                         ▼
                           postgres_data                               minio_data
                          (Named Volume)                             (Named Volume)
```

### Service Communication Matrix
| Service | Internal DNS | Internal Port | Host Port | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| **frontend** | `frontend` | `80` | `3000` | HTTP GET `/` (Spider) |
| **backend** | `backend` | `8000` | `8000` | HTTP GET `/api/health/live` |
| **postgres** | `postgres` | `5432` | `5432` | `pg_isready -U streaming_user` |
| **minio** | `minio` | `9000`, `9001` | `9000`, `9001` | TCP / HTTP `/minio/health/live` |
| **minio-init**| `minio-init`| — | — | Runs once to provision `videos` bucket |

---

## 2. Multi-Stage Dockerfile Specifications

### 2.1 Backend Dockerfile (`backend/Dockerfile`)
* **Stage 1 (Builder):** Uses `python:3.11-slim` with `build-essential` and `libpq-dev` to compile wheel binaries with pip into `--prefix=/install`.
* **Stage 2 (Runtime):** Copies compiled packages into `/usr/local`, installs runtime `libpq5` and `curl`, adds an unprivileged user `appuser` (`UID 10001`), and executes as non-root.
* **Security:** Eliminates compiler toolchains and build dependencies from the final image, reducing image attack surface and size.
* **Probes:** Embedded `HEALTHCHECK` periodically verifies `/api/health/live`.

### 2.2 Frontend Dockerfile (`frontend/Dockerfile`)
* **Stage 1 (Builder):** Uses `node:20-alpine` to execute `npm ci` and `npm run build` using Vite.
* **Stage 2 (Runtime):** Uses minimal `nginx:1.25-alpine`, copying the optimized `dist/` directory into `/usr/share/nginx/html`.
* **NGINX Configuration (`frontend/nginx.conf`):**
  * `try_files $uri $uri/ /index.html`: Prevents 404s when navigating client-side React routes directly (`/browse`, `/video/:id`, `/upload`).
  * `client_max_body_size 600M`: Allows direct multipart video uploads up to 500MB+.
  * `proxy_buffering off`: Ensures real-time, low-latency streaming of chunked HTTP 206 video bytes without NGINX memory buffering.
  * `proxy_set_header Range $http_range`: Forwards byte-range headers for instant video seeking.

---

## 3. Data Persistence & Named Volumes

The container architecture guarantees data durability across service restarts:
* **`postgres_data`:** Mounts to `/var/lib/postgresql/data`, maintaining all user accounts, video metadata records, and view logs.
* **`minio_data`:** Mounts to `/data`, maintaining all stored media objects and poster thumbnails.

> [!WARNING]
> Running `docker compose down -v` removes persistent named volumes and deletes all uploaded media files and user accounts. To preserve data, always use `docker compose down` (without the `-v` flag).

---

## 4. Operational Commands

### Build Container Images
```bash
docker compose build
```

### Start Platform Stack
```bash
# Start in foreground with streaming logs
docker compose up

# Start in detached background mode
docker compose up -d
```

### Inspect Container Health & Status
```bash
docker compose ps
```

### View Live Service Logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Stop Services Safely
```bash
# Stop containers while preserving database & object storage data
docker compose down

# Stop and purge volumes (CLEARS ALL DATABASE & VIDEO DATA)
docker compose down -v
```

---

## 5. Verification & Failure Scenarios Tested

1. **Dependency Order Startup:** `backend` waits for both `postgres` and `minio` to become healthy before binding port 8000.
2. **Container Restart Resilience:** When `postgres` or `minio` containers restart, persistent volume mounts ensure zero data loss.
3. **SPA Navigation:** Browser refreshes on nested routes (`http://localhost:3000/video/1`) resolve to `index.html` via NGINX fallback.
