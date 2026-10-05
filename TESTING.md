# Testing Strategy - Video Streaming Platform

This document outlines the testing methodology, suite execution, and test cases covering unit, integration, authentication, and load validation.

---

## 1. Testing Pyramid

```text
       / \
      /   \     Load & Stress Tests (Locust)
     /-----\
    /       \   End-to-End & Integration (API HTTPX / Pytest)
   /---------\
  /           \ Unit Tests (Schemas, Security, Core, Utils)
 /-------------\
```

---

## 2. Test Execution

### Running Backend Pytest Suite
```bash
cd backend
pytest -v
```

### Running with Code Coverage
```bash
cd backend
pytest -v --cov=app --cov-report=term-missing
```

---

## 3. Test Cases Implemented

### Health & Probes
* `test_startup`: Confirms application boots, routes are mounted, and OpenAPI schema `/docs` is generated.
* `test_health_overview`: Verifies `GET /api/health` returns operational metadata.
* `test_liveness_probe`: Verifies `GET /api/health/live` returns HTTP 200 `{"status": "alive"}`.
* `test_readiness_probe`: Verifies `GET /api/health/ready` validates database connectivity.

### Database & Relational Persistence
* `test_database_connection`: Verifies SQLAlchemy session commits and queries.
* `test_user_model_creation`: Verifies User entity defaults, role enum, and timestamps.
* `test_video_model_relationships`: Verifies Video to User foreign keys and cascade rules.

### Video API
* `test_list_videos_empty`: Verifies empty list response structure.
* `test_list_videos_populated`: Verifies returned video items match schema.
* `test_get_video_by_id_success`: Fetches existing video record.
* `test_get_video_by_id_not_found`: Verifies non-existent ID yields HTTP 404 with standardized error JSON:
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Video with ID ... not found"
    }
  }
  ```

### Authentication & Role-Based Access Control (Phase 3)
* `test_register_success`: Registers valid user, validates bcrypt hashed password in DB, verifies password is not in response.
* `test_register_duplicate_email`: Rejects duplicate registration with HTTP 409 `EMAIL_ALREADY_EXISTS`.
* `test_register_invalid_password`: Validates password length constraint (< 8 characters rejected).
* `test_login_success`: Validates password, returns valid JWT token and token expiry.
* `test_login_invalid_credentials`: Rejects incorrect passwords with HTTP 401 `INVALID_CREDENTIALS`.
* `test_me_authenticated`: Validates `/api/auth/me` with valid Bearer token.
* `test_me_missing_token`: Rejects unauthenticated requests with HTTP 401 `MISSING_TOKEN`.
* `test_me_invalid_token`: Rejects forged tokens with HTTP 401 `INVALID_TOKEN`.
* `test_me_expired_token`: Rejects expired JWT with HTTP 401 `TOKEN_EXPIRED`.
* `test_admin_authorization_success`: Grants access to admin-only operations when role is `ADMIN`.
* `test_admin_authorization_forbidden`: Denies access with HTTP 403 `FORBIDDEN` when a regular `USER` attempts admin actions.

---

## 4. Load Testing with Locust

Load test scenarios are defined in `load-testing/locustfile.py`.

### Running Locust
```bash
cd load-testing
pip install -r requirements.txt
locust -f locustfile.py --host=http://localhost:8000
```
Then open `http://localhost:8089` in a browser to launch stress tests simulating concurrent viewers and monitoring backend latency and HPA pod scaling.
