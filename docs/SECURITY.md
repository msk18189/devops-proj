# Security Architecture & Hardening Manual

This document details the multi-layered security controls implemented across the **DevOps for a Video Streaming Platform** repository, encompassing application code, authentication, data persistence, containerization, and Kubernetes cluster configuration.

---

## 1. Security Architecture Overview

```text
                  Incoming Traffic
                         │
                         ▼
        ┌───────────────────────────────────┐
        │        Kubernetes Ingress         │
        └────────────────┬──────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────┐
        │       NGINX Reverse Proxy         │
        │  • Security Headers (nosniff,     │
        │    SAMEORIGIN, XSS-Protection)    │
        │  • 600M Body Limit for Uploads    │
        └────────────────┬──────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────┐
        │         FastAPI Backend           │
        │  • SecurityHeadersMiddleware      │
        │  • SimpleRateLimiterMiddleware    │
        │  • Strict CORS Origin Whitelist   │
        │  • Parameterized SQLAlchemy ORM   │
        │  • Non-root User (UID 10001)      │
        └───────┬───────────────────┬───────┘
                │                   │
                ▼                   ▼
        ┌──────────────┐     ┌──────────────┐
        │  PostgreSQL  │     │    MinIO     │
        │  • Bcrypt    │     │  • UUID Keys │
        │    Hashing   │     │  • MIME/Ext  │
        │  • Scoped DB │     │    Whitelist │
        │    Roles     │     │  • S3 Auth   │
        └──────────────┘     └──────────────┘
```

---

## 2. Secrets Management & Repository Hygiene

- **No Committed Secrets**: Real API keys, passwords, database credentials, and cryptographic signing keys are excluded from version control.
- **`.gitignore` Rules**: `.env` and `.env.*` files are explicitly ignored while maintaining a template [.env.example](file:///.env.example).
- **Environment Isolation**: Production values are injected dynamically via Kubernetes `Secrets` (`streamops-secrets`) and `ConfigMaps` (`streamops-config`).

---

## 3. Authentication & Authorization (RBAC)

### 3.1 Password Security
- Passwords are never stored in plaintext. Passwords undergo irreversible salting and hashing using **Bcrypt** prior to database persistence.
- Registration enforces strong password constraints (minimum length and character complexity).

### 3.2 JWT Token Security
- Tokens are signed with **HS256** using an environment-injected secret key (`JWT_SECRET`).
- Tokens have explicit expiration lifespans (`ACCESS_TOKEN_EXPIRE_MINUTES: 60`).
- Expired, malformed, or signature-tampered tokens are rejected with `HTTP 401 Unauthorized`.

### 3.3 Role-Based Access Control (RBAC)
- User identities carry cryptographic role claims (`USER` vs `ADMIN`).
- Sensitive operations (e.g. accessing system metrics, deleting foreign video catalog entries) enforce server-side role validation via `require_admin` and ownership checks in `VideoService.delete_video`. Standard users cannot access administrator capabilities.

---

## 4. File Upload & Media Storage Security

- **UUID-Based Storage Keys**: Original client-submitted filenames are never used directly as MinIO S3 object keys. Every upload generates a cryptographically random UUID prefix:
  ```text
  videos/<uuid4>/<sanitized_filename>
  ```
- **Path Traversal Prevention**: Filenames are sanitized through `VideoService._sanitize_filename` removing directory traversal sequences (`../`, `..\`), special characters, and path separators.
- **Extension & MIME Validation**: Uploads are restricted to whitelisted media formats (`.mp4`, `.webm`, `.mov`, `.mkv`) and verified MIME types. Non-video formats (e.g. `.exe`, `.sh`, `.php`) are rejected with `HTTP 400 Bad Request`.
- **Maximum File Size**: Uploads exceeding `MAX_VIDEO_SIZE_MB` (500MB) are rejected before storage allocation.
- **Orphan Cleanup on Failure**: If a database transaction fails after file transfer, an automated rollback immediately purges the uploaded object from MinIO to prevent storage leakage.

---

## 5. SQL Injection & Search Hardening

- All database interactions utilize **SQLAlchemy ORM** parameterized queries.
- Catalog searches with wildcard queries use parameterized `.ilike()` bindings:
  ```python
  search_term = f"%{search.strip()}%"
  query.filter(or_(Video.title.ilike(search_term), Video.description.ilike(search_term)))
  ```
- Sorting parameters (`sort`) are matched against a strict whitelist (`latest`, `oldest`, `popular`, `title`), preventing arbitrary SQL identifiers or injection payloads.

---

## 6. HTTP Defense-in-Depth & Security Headers

Every HTTP response from the backend and NGINX includes protective security headers:

| Header | Value | Protection |
| :--- | :--- | :--- |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type confusion attacks |
| `X-Frame-Options` | `DENY` / `SAMEORIGIN` | Mitigates clickjacking in third-party frames |
| `X-XSS-Protection` | `1; mode=block` | Cross-Site Scripting filter for legacy browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects sensitive path information in referrer headers |
| `Content-Security-Policy` | Whitelisted sources | Restricts executable script and style origins |

---

## 7. Rate Limiting & Denial of Service Protection

- The backend registers `SimpleRateLimiterMiddleware` which tracks client request rates on sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/videos/upload`).
- Requests exceeding burst thresholds return `HTTP 429 Too Many Requests` with a `Retry-After` header.

---

## 8. Logging Hygiene & Safe Error Responses

- **Zero Credential Logging**: `RequestLoggingMiddleware` records only the HTTP method, URL path, response status code, and execution duration. Request headers (including `Authorization`), request bodies, and passwords are never logged.
- **Suppressed Error Tracebacks**: Unhandled runtime exceptions caught by `generic_exception_handler` log full stack traces internally to server logs while returning generic error payloads (`INTERNAL_SERVER_ERROR`) to API clients, ensuring no stack traces, database connection strings, or system paths leak into responses.

---

## 9. Container & Kubernetes Hardening

- **Non-Root Execution**: Both Docker container images run as an unprivileged user (`appuser` with UID `10001` in backend; unprivileged worker in NGINX).
- **Kubernetes Security Context**:
  ```yaml
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    allowPrivilegeEscalation: false
    capabilities:
      drop:
        - ALL
  ```
- **Strict Resource Boundaries**: All pods declare CPU and Memory requests and limits to mitigate noisy neighbor resource exhaustion and denial-of-service starvation.

---

## 10. Automated Security Test Verification

The repository includes a dedicated security test suite in [`backend/tests/test_security.py`](file:///backend/tests/test_security.py) verifying:

1. `test_invalid_jwt_signature`: Rejection of tampered tokens (HTTP 401).
2. `test_expired_jwt_token`: Rejection of expired tokens (HTTP 401).
3. `test_unauthorized_access_to_protected_route`: Guarding of private endpoints.
4. `test_admin_only_endpoint_forbidden_for_user`: Role-based authorization enforcement (HTTP 403).
5. `test_user_cannot_delete_other_users_video`: Cross-tenant deletion prevention (HTTP 403).
6. `test_upload_rejects_disallowed_extension`: Blocking dangerous file types.
7. `test_upload_rejects_disallowed_mime_type`: Blocking spoofed MIME payloads.
8. `test_upload_rejects_oversized_file`: Enforcing maximum payload limits.
9. `test_filename_sanitization_prevents_path_traversal`: Blocking `../` traversal attacks.
10. `test_sql_injection_resilient_search`: Safe escaping of SQL injection strings.
11. `test_security_headers_present`: Verifying defense-in-depth headers.
12. `test_error_response_does_not_leak_stacktrace`: Verifying stack trace suppression.
