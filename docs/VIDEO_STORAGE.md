# Video Storage Architecture: MinIO & PostgreSQL Separation

This document specifies the technical design, lifecycle, and operational boundaries of the object storage and relational database layers in the **DevOps Video Streaming Platform**.

---

## 1. Core Architectural Separation

A central tenet of the platform is strict separation between unstructured media binaries and structured relational metadata:

```text
                           ┌─────────────────────────┐
                           │      React Frontend     │
                           └────────────┬────────────┘
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │     FastAPI Backend     │
                           │  (API & Streaming Layer)│
                           └───────┬─────────┬───────┘
                                   │         │
                     Metadata Only │         │ Binary Streams
                                   ▼         ▼
    ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
    │       PostgreSQL Database        │   │        MinIO Object Store        │
    ├──────────────────────────────────┤   ├──────────────────────────────────┤
    │ • User Accounts & Roles (RBAC)   │   │ • Raw Video Binaries (.mp4/.webm)│
    │ • Video Catalog Metadata         │   │ • Video Poster Thumbnails        │
    │ • Storage Keys (UUID paths)      │   │ • S3-Compatible API              │
    │ • Playback Event Audit Records   │   │ • Ranged Byte Streaming Access   │
    │ • View Counts & Durations        │   │ • Chunked Object Storage         │
    └──────────────────────────────────┘   └──────────────────────────────────┘
```

### Why NEVER Store Video Binaries in PostgreSQL?
1. **Database Bloat & Memory Pressure:** Large binary objects (BLOBs/`bytea`) thrash database buffer pools, degrade index scan speeds, and cause rapid table bloat.
2. **Replication & Backup Overhead:** Backing up PostgreSQL with WAL archiving or `pg_dump` becomes impractical when gigabytes of video blobs are mixed with transactional rows.
3. **Connection Saturation:** Database connections are scarce and expensive; keeping a database connection alive while streaming hundreds of megabytes causes pool exhaustion.
4. **S3 Horizontal Scalability:** MinIO provides high-throughput chunked distributed object storage with native S3 API compatibility, erasure coding, and bitrot protection.

---

## 2. MinIO Configuration & Environment Variables

MinIO connectivity is managed strictly through non-committed environment variables with dynamic runtime configuration via Pydantic:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `MINIO_ENDPOINT` | `localhost:9000` | Network endpoint of the S3-compatible MinIO server. |
| `MINIO_ACCESS_KEY` | `minioadmin` | S3 Access Key ID (never hardcoded in application logic). |
| `MINIO_SECRET_KEY` | `minioadmin` | S3 Secret Access Key. |
| `MINIO_BUCKET` | `videos` | Bucket allocated for video objects and thumbnails. |
| `MINIO_SECURE` | `false` | Enable TLS (`https://`) when set to `true`. |
| `MAX_VIDEO_SIZE_MB` | `500` | Maximum allowable payload size for video uploads. |
| `STORAGE_LOCAL_FALLBACK_DIR`| `storage_fallback` | Local disk buffer directory for offline/isolated tests. |

---

## 3. Storage Service Layer (`storage_service.py`)

All interaction with MinIO is encapsulated inside `StorageService`. API routes never call MinIO or S3 SDK methods directly:

- **`upload_file(file_obj, storage_key, content_type, size)`**: Streams bytes from an incoming upload directly to MinIO without loading the entire file into application heap memory.
- **`download_file_stream(storage_key, offset, length)`**: Streams a precise byte window from MinIO, enabling zero-copy HTTP 206 Partial Content range requests.
- **`delete_file(storage_key)`**: Deletes an object from MinIO to prevent orphaned storage when a video is removed.
- **`file_exists(storage_key)`**: Validates object existence and metadata headers (`stat_object`).
- **`get_file_metadata(storage_key)`**: Retrieves content length and content type directly from S3 headers.

---

## 4. Video Upload Lifecycle & Atomic Rollback Flow

When a user submits a video file through the React UI, the platform guarantees data integrity via this deterministic sequence:

```text
User Submits File
       │
       ▼
React (XHR onprogress) ────────► POST /api/videos/upload
                                        │
                                        ▼
                               JWT Authorization Check
                                        │
                                        ▼
                              Validation Pipeline:
                              1. Extension (.mp4, .webm, .mov, .mkv)
                              2. MIME Type (video/mp4, video/webm, etc.)
                              3. File Size <= MAX_VIDEO_SIZE_MB
                                        │
                                        ▼
                              Generate Collision-Resistant Keys:
                              videos/{uuid}.mp4
                              thumbnails/{uuid}.jpg
                                        │
                                        ▼
                              Upload to MinIO Object Storage
                                        │
                                        ▼
                          Attempt PostgreSQL Transaction:
                          INSERT INTO videos (...) VALUES (...)
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                     Success                         Failure
                        │                               │
                        ▼                               ▼
                 Commit Transaction             Rollback MinIO:
                        │                       StorageService.delete_file()
                        ▼                               │
                 Return Video JSON                      ▼
                                                Return 500 Error (Clean State)
```

If the PostgreSQL transaction fails or raises an integrity error, the backend proactively invokes `StorageService.delete_file(storage_key)` so no orphaned objects remain in MinIO.

---

## 5. Security & Credential Boundary

- **No Frontend Exposure:** The browser and client JavaScript never receive MinIO access keys, secret keys, or raw MinIO host URLs.
- **Reverse Proxy Streaming:** All video bytes pass through authenticated FastAPI endpoints (`/api/videos/{id}/stream`), maintaining uniform access control, audit logging, and view metrics tracking.
