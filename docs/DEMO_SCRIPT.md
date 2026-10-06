# Live Demonstration Script: DevOps for a Video Streaming Platform

This script provides an exact, step-by-step guide for presenting the **DevOps for a Video Streaming Platform** during evaluations, presentations, and technical reviews.

---

## 1. Problem Statement & DevOps Solution (1 Minute)

> **Speaker**: *"Modern video streaming platforms face three core operational challenges: sudden traffic surges during popular broadcasts, dependency and service failures that can cause cascade outages, and the need for frequent zero-downtime feature releases. Rather than relying on static servers or manual intervention, this project demonstrates a fully automated, cloud-native DevOps platform built with FastAPI, React, PostgreSQL, MinIO, Docker, Kubernetes, HPA, Prometheus, Grafana, and GitHub Actions."*

---

## 2. Live Application Flow (2 Minutes)

1. **Browse Catalog**:
   - Open browser at `http://localhost/` (or via Ingress).
   - Demonstrate category filtering (`Tech`, `Gaming`, `Education`) and sort orders (`Latest`, `Most Popular`).
2. **Search**:
   - Type in the search box; show instant debounced search query execution.
3. **Video Playback & Seeking**:
   - Click a video to open the player.
   - Jump forward in the timeline to demonstrate **HTTP 206 Partial Content Range streaming** (instant seek without waiting for full download).
4. **Authentication**:
   - Log in with test account (`john@example.com` / `Password123!`).
5. **Video Upload**:
   - Navigate to `/upload`, upload an `.mp4` video with title and category.
   - Show instantaneous processing, MinIO S3 storage, and redirect to the player.
6. **Admin Dashboard**:
   - Log in with `admin@example.com` (`AdminPass123!`).
   - Navigate to `/admin` to display real database-backed operational metrics (total users, videos, total views, database health).

---

## 3. Kubernetes Infrastructure Inspection (1 Minute)

Run in terminal:
```bash
kubectl get all -n video-streaming
```
**Highlight to Audience**:
- 2 Backend pods with rolling update strategy
- 2 Frontend NGINX pods
- Dedicated PostgreSQL and MinIO Stateful pods with PersistentVolumeClaims
- ClusterIP services and Kubernetes Ingress
- Backend HorizontalPodAutoscaler targeting 70% CPU

---

## 4. Health Checks & Resiliency Demo (1.5 Minutes)

1. Show distinction between liveness and readiness:
   ```bash
   # Liveness (FastAPI process event loop)
   curl http://localhost:8000/api/health/live

   # Readiness (Postgres + MinIO connectivity)
   curl http://localhost:8000/api/health/ready
   ```
2. **Self-Healing Test**:
   - Delete an active backend pod:
     ```bash
     kubectl delete pod <backend-pod-name> -n video-streaming
     ```
   - Run watch command:
     ```bash
     kubectl get pods -n video-streaming -w
     ```
   - **Show**: Kubernetes detects missing replica, immediately schedules a new pod, executes startup probe, and marks it Ready within ~6 seconds while the application experiences zero downtime.

---

## 5. Observability Stack: Prometheus & Grafana (2 Minutes)

1. Access Prometheus at `http://localhost:9090`:
   - Show `/metrics` scrape target is in state **UP**.
   - Query `http_requests_total` and `rate(http_requests_total[1m])`.
2. Access Grafana at `http://localhost:3000`:
   - **Dashboard 1: Application Overview**: Show real-time RPS, P95 Latency, 4xx/5xx Error Rates, and Active Requests.
   - **Dashboard 2: Media Metrics**: Show Video Uploads, Stream Requests (200 vs 206 Partial Content), Video Views, and Failures.
   - **Dashboard 3: Kubernetes Overview**: Show Pod counts, container restarts, CPU core usage, and memory footprints.
   - **Dashboard 4: Autoscaling Overview**: Show Current vs Desired Replicas, CPU utilization against the 70% target, and RPS correlation.

---

## 6. Real-Time Load Testing & HPA Autoscaling Demo (2.5 Minutes)

1. Start headless Locust load test with 50 concurrent users:
   ```bash
   locust -f loadtest/locustfile.py --headless -u 50 -r 5 --run-time 3m --host http://localhost:8000
   ```
2. Watch Kubernetes HPA scale out:
   ```bash
   kubectl get hpa backend-hpa -n video-streaming -w
   ```
3. Watch Pod replicas increase:
   ```bash
   kubectl get pods -n video-streaming -l app=backend -w
   ```
4. **Correlate in Grafana**:
   - Point to Grafana Autoscaling Dashboard:
     - Curve 1: Request Rate spikes to 60+ RPS
     - Curve 2: CPU utilization climbs above 70%
     - Curve 3: HPA increments desired replicas (2 → 4 → 6 pods)
     - Curve 4: New pods become Ready and CPU load distributes back below 70%
5. Stop Locust and observe stabilization window before gradual scale-down.

---

## 7. CI/CD & Security Overview (1 Minute)

1. Open `.github/workflows/ci.yml` and `.github/workflows/cd.yml`:
   - Show automated testing with PostgreSQL & MinIO service containers.
   - Show commit SHA-based container tagging to GHCR.
   - Show Kubernetes rolling update and automated rollback on failure (`kubectl rollout undo`).
2. Show Security Hardening:
   - Non-root container execution (`runAsNonRoot: true`, UID `10001`).
   - Bcrypt password hashing & JWT token validation.
   - Strict file upload validation (UUID keys, MIME/extension whitelisting, path traversal prevention).

---

## 8. Conclusion (30 Seconds)

> **Speaker**: *"Through automated CI/CD testing, containerization, Kubernetes orchestration, intelligent health probes, automated HPA scaling, and full-stack observability with Prometheus and Grafana, we have built a self-healing, scalable, and production-ready DevOps video streaming platform."*
