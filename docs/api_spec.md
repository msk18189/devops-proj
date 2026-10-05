# API Specification - StreamOps Platform

All API responses adhere to a consistent envelope structure.

## Base URL
`/api`

## Response Envelopes

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource could not be located"
  }
}
```

---

## Endpoints

### 1. Health & Probes
* `GET /api/health` - Overall system health metadata.
* `GET /api/health/live` - Liveness probe (process up).
* `GET /api/health/ready` - Readiness probe (database connection active).

### 2. Authentication & Authorization
* `POST /api/auth/register` - Register a new user account.
  * Body: `{"name": "Alice", "email": "alice@example.com", "password": "securePassword123"}`
* `POST /api/auth/login` - Authenticate credentials and retrieve JWT.
  * Body: `{"email": "alice@example.com", "password": "securePassword123"}`
  * Response: `{"access_token": "...", "token_type": "bearer", "expires_in": 3600, "user": {...}}`
* `GET /api/auth/me` - Retrieve current user profile (requires `Bearer <token>`).

### 3. Videos
* `GET /api/videos` - List published videos (supports `page`, `page_size`, `category` query params).
* `GET /api/videos/{id}` - Fetch single video metadata by ID.
