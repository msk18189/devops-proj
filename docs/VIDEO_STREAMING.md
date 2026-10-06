# Video Streaming Architecture & HTTP Range Requests

This document details the video streaming architecture, HTTP 206 Partial Content byte-range negotiation, streaming endpoints, and browser HTML5 playback mechanics in the **DevOps Video Streaming Platform**.

---

## 1. High-Level Streaming Architecture

The streaming pipeline streams chunks directly from MinIO through FastAPI into the client's HTML5 video player without loading full media files into memory:

```text
 HTML5 Video Player                   FastAPI Backend                  MinIO Storage
(Browser DOM / React)              (Streaming Controller)          (S3 Object Storage)
         │                                   │                              │
         │─── GET /api/videos/12/stream ────►│                              │
         │    Range: bytes=0-1048575         │                              │
         │                                   │─── GetObject(offset, len) ──►│
         │                                   │◄── Byte Stream Chunk ────────│
         │◄── HTTP/1.1 206 Partial Content ──│                              │
         │    Accept-Ranges: bytes           │                              │
         │    Content-Range: bytes 0-1048575/10485760                        │
         │    Content-Length: 1048576        │                              │
         │    Content-Type: video/mp4        │                              │
         │                                   │                              │
         │ [User seeks to middle of video]   │                              │
         │─── GET /api/videos/12/stream ────►│                              │
         │    Range: bytes=5242880-6291455 ──│                              │
         │                                   │─── GetObject(offset, len) ──►│
         │                                   │◄── Byte Stream Chunk ────────│
         │◄── HTTP/1.1 206 Partial Content ──│                              │
```

---

## 2. HTTP Byte-Range Requests Specification

### Standard Headers Handled

When the browser requests video segments, it transmits the `Range` HTTP header:

```http
Range: bytes=0-1048575
```

The FastAPI backend parses the requested byte boundaries:

1. **Start-End Range (`bytes=0-1048575`):** Requests bytes from index 0 to 1,048,575 inclusive.
2. **Open-Ended Range (`bytes=1048576-`):** Requests from byte 1,048,576 up to the end of the file.
3. **Suffix Range (`bytes=-524288`):** Requests the final 524,288 bytes of the file.

### Backend Response Headers (206 Partial Content)

When a valid range is processed, the backend responds with status `206 Partial Content` and mandatory HTTP headers:

```http
HTTP/1.1 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-1048575/10485760
Content-Length: 1048576
Content-Type: video/mp4
Cache-Control: public, max-age=3600
```

Where:
- `Accept-Ranges: bytes`: Informs the client that arbitrary byte offsets can be requested.
- `Content-Range: bytes {start}-{end}/{total_file_size}`: Specifies the exact byte span provided and the total object size.
- `Content-Length`: Size of the byte slice in the current HTTP response.
- `Content-Type`: Actual media MIME type (`video/mp4`, `video/webm`, etc.), never generic `application/octet-stream`.

### Out-of-Bounds Range Handling (416 Range Not Satisfiable)

If `start >= total_size` or `start > end`, the streaming endpoint immediately returns:

```http
HTTP/1.1 416 Range Not Satisfiable
Content-Range: bytes */10485760
```

---

## 3. Streaming Endpoints

### 1. `GET /api/videos/{video_id}/stream`
- **Description:** Primary video streaming endpoint supporting full and partial byte-range requests.
- **Authentication:** Accessible for streaming playback while keeping storage credentials secure.
- **Query / Headers:** Accepts standard `Range: bytes=start-end`.
- **Response:** FastAPI `StreamingResponse` with generator chunk iterator (default chunk size: 64 KB).

### 2. `POST /api/videos/{video_id}/view`
- **Description:** Registers an authenticated or anonymous view event for a video.
- **Deduplication Strategy:** The React frontend invokes this endpoint only after playback starts and playback progress exceeds 2 seconds, preventing rapid view counter exploitation during rapid clicks.
- **Audit Persistence:** Increments the aggregate `views` counter on `Video` and inserts an immutable audit row into `VideoView`.

---

## 4. HTML5 Video Player Integration

The frontend uses the native HTML5 `<video>` element styled with custom overlay controls and error boundaries:

- **Buffering & Waiting Indicators:** Listens to `onWaiting` and `onPlaying` events to display a smooth CSS spinner during network latency.
- **Error Recovery:** Catches network timeouts and corrupted stream responses through `onError`, showing a user-friendly retry button rather than a broken player.
- **Cross-Browser Range Compatibility:** Modern browsers (Chrome, Firefox, Safari, Edge) automatically send `Range` headers as video data buffers, enabling seamless instant seeking without downloading unviewed sections.
