# DevOps Guide - Video Streaming Platform

This guide outlines operational practices, deployment strategies, monitoring procedures, and auto-scaling rules for the StreamOps platform.

---

## 1. Container Strategy (Docker)

### Multi-Stage Builds
* **Backend**:
  * Base: `python:3.11-slim` (or `python:3.14-slim`).
  * Non-root user: Containers run as non-privileged `appuser` (UID 10001) for container breakout mitigation.
  * Dependency isolation: Pip wheel cache leveraged during build.
* **Frontend**:
  * Build stage: Node.js alpine runs `npm run build`.
  * Production stage: Light Nginx alpine serving static assets with gzip and caching headers.

---

## 2. Kubernetes Deployment Topology

Deployments are defined in `k8s/`:
```text
k8s/
├── configmap.yaml            # Environment variables (CORS, URLs, Ports)
├── secret.yaml               # DB credentials, JWT secret, MinIO tokens
├── postgres-pvc.yaml         # PersistentVolumeClaim for DB storage
├── postgres-deployment.yaml  # Stateful single-replica or cluster DB
├── postgres-service.yaml     # Internal ClusterIP for DB
├── minio-pvc.yaml            # PersistentVolumeClaim for Video blobs
├── minio-deployment.yaml     # MinIO S3 container
├── minio-service.yaml        # MinIO S3 API & Console services
├── backend-deployment.yaml   # FastAPI app with liveness/readiness probes & resources
├── backend-service.yaml      # ClusterIP service
├── backend-hpa.yaml          # HorizontalPodAutoscaler (CPU/Memory)
├── frontend-deployment.yaml  # Nginx frontend app
├── frontend-service.yaml     # Frontend ClusterIP
└── ingress.yaml              # Ingress routing rules
```

### Applying Manifests to a Kubernetes Cluster
```bash
# Create namespace
kubectl create namespace streamops

# Apply configurations and secrets
kubectl apply -f k8s/configmap.yaml -n streamops
kubectl apply -f k8s/secret.yaml -n streamops

# Apply storage & stateful services
kubectl apply -f k8s/postgres-pvc.yaml -n streamops
kubectl apply -f k8s/postgres-service.yaml -n streamops
kubectl apply -f k8s/postgres-deployment.yaml -n streamops

kubectl apply -f k8s/minio-pvc.yaml -n streamops
kubectl apply -f k8s/minio-service.yaml -n streamops
kubectl apply -f k8s/minio-deployment.yaml -n streamops

# Apply application workloads
kubectl apply -f k8s/backend-service.yaml -n streamops
kubectl apply -f k8s/backend-deployment.yaml -n streamops
kubectl apply -f k8s/backend-hpa.yaml -n streamops

kubectl apply -f k8s/frontend-service.yaml -n streamops
kubectl apply -f k8s/frontend-deployment.yaml -n streamops

# Apply ingress router
kubectl apply -f k8s/ingress.yaml -n streamops
```

---

## 3. Horizontal Pod Autoscaler (HPA)

Backend auto-scaling is governed by `k8s/backend-hpa.yaml`:
* **Metric**: Average CPU utilization > 70% or Average Memory > 80%.
* **Boundaries**:
  * Minimum replicas: 2 (guaranteeing high availability across nodes).
  * Maximum replicas: 10 (absorbing burst video catalog reads).
* **Scaling Behavior**:
  * Scale-up: Immediate (stabilization window 0s) to absorb sudden load spikes.
  * Scale-down: Cooldown window 300s to avoid flapping.

---

## 4. Self-Healing & Health Probing

Kubernetes maintains application reliability using two distinct probes:
1. **Liveness Probe (`/api/health/live`)**:
   * Evaluates if the Python event loop and uvicorn process are operational.
   * If non-responsive for 3 consecutive intervals (failureThreshold: 3), Kubernetes restarts the pod.
2. **Readiness Probe (`/api/health/ready`)**:
   * Actively runs a lightweight `SELECT 1` query against PostgreSQL.
   * If the database is unreachable or saturated, the pod reports HTTP 503.
   * Kubernetes immediately unregisters the pod from the Service endpoints without killing it, shielding active users from failed connections until the database recovers.

---

## 5. Continuous Integration / Continuous Deployment (CI/CD)

The GitHub Actions pipeline (`.github/workflows/ci.yml`) triggers on every Pull Request and merge to `main`:
1. **Linting & Code Style**:
   * Backend: `flake8`, `black --check`.
   * Frontend: `eslint`, `tsc --noEmit`.
2. **Automated Testing**:
   * Backend: `pytest` with coverage report threshold.
3. **Container Build Verification**:
   * Builds Docker images using GitHub cache to ensure no dependency drift.
