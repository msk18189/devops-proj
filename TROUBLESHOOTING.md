# Troubleshooting Guide - Video Streaming Platform

Common operational issues, debugging procedures, and resolutions across the DevOps lifecycle.

---

## 1. Database & Connectivity

### Problem: `/api/health/ready` returns HTTP 503 `DATABASE_UNAVAILABLE`
* **Root Cause**: FastAPI backend cannot reach PostgreSQL on port 5432 or credentials in `.env` / `k8s/secret.yaml` are mismatched.
* **Diagnosis**:
  ```bash
  # Check if postgres container is running
  docker ps | grep postgres

  # Test connectivity from backend container
  docker exec -it streamops-backend python -c "from app.database.session import engine; engine.connect()"
  ```
* **Resolution**:
  * Verify `DATABASE_URL` matches the running Postgres instance.
  * In Docker Compose, ensure `backend` has `depends_on: postgres: condition: service_healthy`.

---

## 2. Authentication & JWT Issues

### Problem: `GET /api/auth/me` returns HTTP 401 `INVALID_TOKEN` or `TOKEN_EXPIRED`
* **Diagnosis**:
  * Verify client sends the header formatted as:
    `Authorization: Bearer <token>`
  * Check server system clock synchronization (drift can cause premature token expiration).
  * Ensure `JWT_SECRET` in environment has not been rotated or changed between token issuance and verification.

---

## 3. Kubernetes Common Errors

### Problem: Pod status is `CrashLoopBackOff`
* **Diagnosis**:
  ```bash
  kubectl logs -n streamops <pod-name> --previous
  kubectl describe pod -n streamops <pod-name>
  ```
* **Common Causes**:
  * Liveness probe timeout set too aggressively.
  * Missing environment variable in `k8s/configmap.yaml` or `k8s/secret.yaml`.

### Problem: Pod status is `0/1 Running` (Readiness Probe Failing)
* **Diagnosis**:
  ```bash
  kubectl describe pod -n streamops <pod-name>
  ```
* Look for `Readiness probe failed: HTTP probe failed with statuscode: 503`.
* Check if backend database migrations completed or if PostgreSQL connection pool is saturated.

---

## 4. CORS Issues on Frontend

### Problem: Browser console error: `Access to XMLHttpRequest has been blocked by CORS policy`
* **Diagnosis**:
  * Check `backend/app/core/config.py` `CORS_ORIGINS`.
  * Ensure the frontend origin (`http://localhost:3000` or `http://localhost:5173`) is explicitly included in `CORS_ORIGINS`.
