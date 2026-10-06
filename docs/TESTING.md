# Automated Testing & Quality Assurance Guide

This document details the testing architecture, test suites, coverage reports, and execution commands for both the FastAPI backend and React frontend of the **DevOps Video Streaming Platform**.

---

## 1. Test Architecture Overview

The testing strategy validates the entire software pipeline before containerization and deployment:

```text
┌─────────────────────────────────────────────────────────────┐
│                 Frontend Unit & Service Tests               │
│         (Vitest 1.6, React Testing Library, In-Memory)      │
├──────────────────────────────┬──────────────────────────────┤
│ • Authentication & JWT Token │ • Video Endpoint Builders    │
│ • Local Storage Management   │ • Data Formatters (Size/Dur) │
└──────────────────────────────┴──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend Unit & Integration Tests             │
│            (Pytest, FastAPI TestClient, SQLite Pool)        │
├──────────────────────────────┬──────────────────────────────┤
│ • Authentication & Hashing   │ • MinIO S3 Abstraction       │
│ • RBAC Role Permissions      │ • HTTP 206 Byte-Range Stream │
│ • Liveness & Readiness Probes│ • Multipart Video Upload     │
│ • Database Schema Relations  │ • View Counting & Deduplicat │
└──────────────────────────────┴──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 End-to-End Lifecycle Flow                   │
│             (test_full_video_lifecycle_e2e)                 │
├─────────────────────────────────────────────────────────────┤
│ Register ➔ Login ➔ Upload ➔ PostgreSQL Metadata ➔ MinIO S3 │
│ ➔ Browse ➔ Details ➔ Range Stream ➔ Full Stream ➔ View Audit │
│ ➔ My Videos ➔ Delete ➔ DB Clean ➔ MinIO Clean               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Test Environments & Isolation

To ensure tests never alter or destroy production or development data:
* **Backend Database:** Uses isolated in-memory SQLite with `StaticPool` (`sqlite:///:memory:`). Each test function runs against fresh schema tables created and dropped in `conftest.py`.
* **MinIO Storage:** Uses ephemeral test bucket keys and isolated filesystem fallbacks (`storage_fallback/`), auto-cleaned after test runs.
* **Frontend Storage:** Uses isolated in-memory mock implementation of `localStorage`.

---

## 3. Test Suites & Important Scenarios

### 3.1 Backend Test Suites (`backend/tests/`)
1. **`test_auth.py` (12 tests):** Registration validation, duplicate email detection, weak password rejection, login verification, token generation, role verification (`USER` vs `ADMIN`).
2. **`test_database.py` (3 tests):** Database connectivity, transactional persistence, cascade relations between `User`, `Video`, and `VideoView`.
3. **`test_health.py` (4 tests):** General health, liveness probe (`/api/health/live`), readiness probe (`/api/health/ready` with mock healthy/unhealthy DB).
4. **`test_startup.py` (2 tests):** Root endpoint redirection and OpenAPI Swagger documentation accessibility.
5. **`test_storage.py` (1 test):** Direct MinIO object storage verification (`upload_file`, `file_exists`, `get_file_metadata`).
6. **`test_streaming.py` (6 tests):** HTTP 206 Partial Content byte ranges, open-ended ranges (`bytes=100-`), invalid range rejection (`416 Range Not Satisfiable`), nonexistent stream `404`, and view recording.
7. **`test_video_delete.py` (3 tests):** Owner deletion authorization, administrator deletion authorization, unauthorized user rejection (`403 Forbidden`).
8. **`test_video_upload.py` (6 tests):** Multipart upload success, thumbnail upload, unauthenticated rejection (`401`), disallowed extension rejection (`400`), invalid MIME rejection (`400`), size limit rejection (`413`).
9. **`test_videos.py` (6 tests):** Empty catalog, populated catalog, pagination, ID lookup, category filtering, search queries, and sorting.
10. **`test_integration_e2e.py` (1 comprehensive test):** Full 15-step end-to-end integration lifecycle from user registration to upload, range streaming, view logging, and atomic deletion cleanup.

### 3.2 Frontend Test Suites (`frontend/src/__tests__/`)
1. **`authService.test.ts` (3 tests):** JWT token persistence in `localStorage`, user role decoding, clean logout token invalidation, profile retrieval.
2. **`videoService.test.ts` (5 tests):** Query parameter assembly (`page`, `pageSize`, `search`, `category`, `sort`, `userId`), stream URL generation, view incrementing, delete requests.
3. **`formatters.test.ts` (3 tests):** File size formatting (`B`, `KB`, `MB`, `GB`), duration formatting (`MM:SS`), ISO timestamp conversion.

---

## 4. Test Commands

### Backend Tests
```bash
# Navigate to backend directory
cd backend

# Run all automated tests
python -m pytest -v

# Run with code coverage reporting
python -m pytest --cov=app --cov-report=term-missing

# Run specific End-to-End integration test
python -m pytest -v tests/test_integration_e2e.py
```

### Frontend Tests & Quality Checks
```bash
# Navigate to frontend directory
cd frontend

# Run unit tests via Vitest
npm test

# Run TypeScript typecheck & production build
npm run build
```

---

## 5. Test Results Summary

| Suite | Total Tests | Passed | Failed | Skipped | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Unit & Integration** | 43 | 43 | 0 | 0 | **PASS (100%)** |
| **Backend End-to-End Lifecycle**| 1 | 1 | 0 | 0 | **PASS (100%)** |
| **Frontend Unit Suites** | 11 | 11 | 0 | 0 | **PASS (100%)** |
| **Frontend Production Build** | — | — | — | — | **PASS (0 errors)** |
| **Total Test Assertions** | **55** | **55** | **0** | **0** | **PASS** |

### Known Limitations
* Live Kubernetes rolling update testing requires an active Kubernetes cluster engine (e.g. Minikube or Docker Desktop Kubernetes enabled).
* Full load testing benchmarks with 500+ virtual users are executed via Locust during Phase 11.
