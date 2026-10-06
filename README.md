# DevOps for a Video Streaming Platform

A production-grade, self-healing, horizontally scalable video streaming platform engineered to demonstrate modern cloud-native DevOps principles across the full software delivery lifecycle.

---

## Problem Statement

Modern video streaming systems encounter three fundamental challenges in production:
1. **Unpredictable Traffic Spikes**: Flash crowds during viral media releases can saturate CPU and memory, causing cascading outages.
2. **Component Degradation & Node Failures**: Temporary database outages or media storage dropouts frequently cause application pods to crash-loop unnecessarily if liveness and readiness probes are conflated.
3. **Delivery Bottlenecks**: Manual deployments risk configuration drift, lack of automated rollbacks, and potential downtime during application releases.

---

## Solution

This project solves these challenges by combining a modular video streaming application with an automated DevOps platform:
- **FastAPI + React Architecture**: Decouples relational metadata in PostgreSQL from binary media objects in MinIO S3 storage, serving video content via RFC 7233 HTTP 206 Partial Content byte ranges.
- **Autonomous Orchestration**: Deployed to Kubernetes with independent Startup, Liveness, and Readiness probes ensuring zero crash-loops during dependency interruptions.
- **Horizontal Pod Autoscaling (HPA)**: Dynamically scales backend replicas between 2 and 10 pods when CPU utilization crosses 70%, verified through realistic Locust load testing.
- **Observability Stack**: Prometheus scrapes application metrics (RPS, latency histograms, in-flight requests, video uploads/views), visualized across 4 Grafana dashboards.
- **Automated CI/CD Pipeline**: GitHub Actions workflows validate linting, run 57 backend tests and 11 frontend tests against containerized service dependencies, build multi-stage Docker images to GitHub Container Registry (GHCR), and manage rolling updates with automated rollback.

---

## Key Features

- **Authentication & RBAC**: Secure user registration, Bcrypt password hashing, and HS256 JWT tokens distinguishing regular users from administrators.
- **HTTP Range Streaming**: Instant seek support without loading entire video binaries into memory.
- **MinIO S3 Storage**: Collision-resistant UUID-prefixed object keys with automatic transaction rollback to prevent orphaned files.
- **Kubernetes Self-Healing**: Automated pod replacement within 6 seconds upon container failure.
- **Zero-Downtime Deployments**: Rolling updates with `maxSurge: 25%` and `maxUnavailable: 0`.
- **Automated Rollback**: Instant reversion to previous stable revisions via `kubectl rollout undo`.
- **Comprehensive Observability**: 4 provisioned Grafana dashboards tracking Application Overview, Media Metrics, Kubernetes Infrastructure, and HPA Autoscaling correlation.
- **Security Hardening**: Non-root container execution (UID 10001), defense-in-depth security headers, in-memory rate limiting, and parameter-sanitized database queries.

---

## Architecture

```mermaid
graph TD
    User["Clients / Locust Load Generator"] --> Ingress["Kubernetes Ingress (Port 80)"]
    
    subgraph Frontend Tier
        Ingress -->|"/"| FrontendSvc["frontend-service (ClusterIP:80)"]
        FrontendSvc --> FrontendPods["Frontend NGINX Pods (2 Replicas)"]
    end
    
    subgraph Backend Tier
        Ingress -->|"/api"| BackendSvc["backend-service (ClusterIP:8000)"]
        BackendSvc --> BackendPods["FastAPI Backend Pods (2 - 10 Replicas)"]
    end
    
    subgraph Storage Tier
        BackendPods -->|"SQLAlchemy ORM"| PostgresSvc["postgres-service (ClusterIP:5432)"]
        PostgresSvc --> PostgresPod["PostgreSQL Stateful Pod"]
        PostgresPod --> PostgresPVC[("postgres-pvc (10Gi)")]
        
        BackendPods -->|"S3 Object API"| MinioSvc["minio-service (ClusterIP:9000)"]
        MinioSvc --> MinioPod["MinIO Object Store Pod"]
        MinioPod --> MinioPVC[("minio-pvc (20Gi)")]
    end
    
    subgraph Autoscaling Engine
        BackendPods -.->|CPU & Memory| MetricsServer["Kubernetes Metrics Server"]
        MetricsServer -.->|Pod Telemetry| HPA["Horizontal Pod Autoscaler (HPA v2)"]
        HPA ==>|Scale Replicas| BackendPods
    end
    
    subgraph Observability Tier
        BackendPods -->|"/metrics"| Prometheus["Prometheus Server (Port 9090)"]
        Prometheus -->|"PromQL Queries"| Grafana["Grafana Server (Port 3000)"]
        Grafana --> Dashboards["4 Provisioned Dashboards"]
    end
    
    subgraph CI/CD Automation
        Developer["Git Push"] --> GitHub["GitHub Repository"]
        GitHub --> GHActions["GitHub Actions CI/CD"]
        GHActions -->|Lint & Test| ServiceContainers["Postgres & MinIO Services"]
        GHActions -->|Buildx| GHCR["GitHub Container Registry (GHCR)"]
        GHCR -->|Rolling Deploy| BackendPods
    end
```

---

## Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Vite | React 18, Vite 5 | Single Page Application, HTML5 player, upload manager |
| **Frontend Testing**| Vitest | 1.6.1 | Unit testing for auth, video services, and formatters |
| **Backend** | Python, FastAPI | Python 3.11+, FastAPI 0.111 | High-throughput asynchronous REST API & streaming |
| **Backend Testing** | Pytest, Pytest-Cov | Pytest 9.1 | 57 automated unit, metrics, and security tests |
| **Database** | PostgreSQL | 15 / 16 | Relational persistence, metadata, indexed search |
| **Object Store** | MinIO (S3-Compatible) | RELEASE.2024+ | Binary video files and thumbnail images |
| **Container Engine**| Docker, Docker Compose | 24+ | Multi-stage production container images |
| **Orchestrator** | Kubernetes | 1.28+ | Declarative deployments, services, probes, ingress |
| **Autoscaling** | Kubernetes HPA | `autoscaling/v2` | CPU-driven dynamic pod scaling (2 to 10 pods) |
| **Load Testing** | Locust | 2.24+ | Realistic weighted user traffic simulation |
| **Metrics** | Prometheus | 2.51+ | Application & cluster metrics time-series store |
| **Dashboards** | Grafana | 10.4+ | Production visualization of metrics & alerts |
| **CI/CD** | GitHub Actions | Workflows v4 | Automated testing, GHCR build/push, rolling deploy |

---

## Project Structure

```text
devops-video-streaming/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI: lint, backend/frontend tests, GHCR Docker build
│       └── cd.yml                 # CD: Kubernetes rolling update, smoke test & auto-rollback
├── backend/
│   ├── app/
│   │   ├── core/                  # Configuration, security, errors, dependencies
│   │   ├── database/              # SQLAlchemy session and Base metadata
│   │   ├── middleware/            # Logging, error handlers, security headers, rate limiting
│   │   ├── models/                # User, Video, VideoView ORM models
│   │   ├── monitoring/            # Prometheus metrics middleware and domain counters
│   │   ├── routes/                # API endpoints (auth, videos, admin, health)
│   │   ├── schemas/               # Pydantic validation schemas
│   │   └── services/              # Business logic (VideoService, StorageService)
│   ├── tests/                     # 57 automated tests (auth, streaming, security, metrics)
│   ├── Dockerfile                 # Multi-stage production build (non-root UID 10001)
│   └── requirements.txt
├── frontend/
│   ├── src/                       # React components, pages, hooks, services, types
│   ├── nginx.conf                 # NGINX reverse proxy, security headers, /health probe
│   ├── Dockerfile                 # Multi-stage Node.js build to NGINX alpine
│   └── package.json
├── k8s/
│   ├── namespace.yaml             # Namespace: video-streaming
│   ├── secret.yaml & configmap.yaml
│   ├── postgres-*.yaml            # PVC, Deployment, Service
│   ├── minio-*.yaml               # PVC, Deployment, Service
│   ├── backend-*.yaml             # Deployment (with probes & securityContext), Service
│   ├── frontend-*.yaml            # Deployment (with /health probe), Service
│   ├── backend-hpa.yaml           # HPA v2 (CPU 70%, 2 to 10 replicas)
│   ├── ingress.yaml               # Ingress routing rules
│   └── monitoring/                # Prometheus & Grafana manifests, PVCs, ConfigMaps
├── loadtest/
│   ├── locustfile.py              # Realistic weighted load testing scenarios
│   └── README.md
├── monitoring/
│   └── dashboards/                # 4 pre-configured Grafana JSON dashboards
├── docs/                          # Comprehensive technical manuals
│   ├── CICD.md                    # CI/CD architecture and rollback procedures
│   ├── SECURITY.md                # Security controls and hardening manual
│   ├── PERFORMANCE.md             # Performance benchmarks and query optimizations
│   ├── HEALTH_AND_SELF_HEALING.md # Tripartite probes & healing lifecycle
│   ├── HPA.md                     # Autoscaling architecture & stabilization
│   ├── LOAD_TESTING.md            # Staged load testing progression
│   ├── LOAD_TEST_RESULTS.md       # Measured benchmark metrics
│   ├── MONITORING.md              # Prometheus scraping & metrics dictionary
│   ├── GRAFANA.md                 # Dashboard panel catalog & PromQL queries
│   ├── FAILURE_TESTING.md         # 11 chaos scenarios & reliability scorecard
│   ├── DEMO_SCRIPT.md             # Step-by-step presentation script
│   └── FINAL_VERIFICATION.md      # Full 16-phase verification scorecard
├── docker-compose.yml             # Local multi-container development environment
└── .env.example
```

---

## Local Development

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Copy the template configuration before running:
```bash
cp .env.example .env
```

Key environment settings:
```ini
ENVIRONMENT=development
DATABASE_URL=postgresql://streaming_user:streaming_secure_password_replace_in_prod@localhost:5432/streaming_db
JWT_SECRET=super_secret_jwt_key_replace_with_openssl_rand_hex_32
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minio_admin_user
MINIO_SECRET_KEY=minio_admin_secure_password
MINIO_BUCKET=video-stream-bucket
```

---

## Running with Docker

Start the entire localized stack (Frontend, Backend, PostgreSQL, MinIO):
```bash
docker-compose up --build -d
```

Access points:
- **Frontend Web UI**: `http://localhost:3000`
- **Backend API Docs**: `http://localhost:8000/docs`
- **MinIO S3 Console**: `http://localhost:9001`

---

## Running with Kubernetes

Apply manifests into the `video-streaming` namespace:
```bash
# Core namespaces and secrets
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# Data persistence layer
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/postgres-deployment.yaml

kubectl apply -f k8s/minio-pvc.yaml
kubectl apply -f k8s/minio-service.yaml
kubectl apply -f k8s/minio-deployment.yaml

# Application workloads
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-deployment.yaml

kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Autoscaling & Ingress
kubectl apply -f k8s/backend-hpa.yaml
kubectl apply -f k8s/ingress.yaml

# Observability Stack
kubectl apply -f k8s/monitoring/
```

Verify deployment status:
```bash
kubectl get pods -n video-streaming
```

---

## Testing

### Backend Test Suite (57 Tests)
```bash
cd backend
python -m pytest -v --cov=app
```
Includes authentication, RBAC, database transactions, S3 storage, HTTP Range streaming, health probes, Prometheus metrics, and security attack simulations.

### Frontend Test Suite (11 Tests)
```bash
cd frontend
npm test
```

### Production Build Validation
```bash
cd frontend
npm run build
```

---

## Load Testing

The project uses **Locust** to simulate realistic multi-user behavior:
- 40% Catalog browsing
- 20% Search queries
- 20% Video metadata requests
- 20% HTTP 206 Partial Content video range streaming

### Headless Load Execution:
```bash
locust -f loadtest/locustfile.py --headless -u 50 -r 5 --run-time 3m --host http://localhost:8000
```

---

## Autoscaling

The Horizontal Pod Autoscaler targets **70% CPU utilization**:
```bash
kubectl get hpa backend-hpa -n video-streaming -w
```
When traffic increases, HPA scales backend pods from **2 up to 10 replicas**, distributing traffic and reducing per-pod CPU. Once load ceases, a 60-second stabilization window ensures smooth scale-down back to 2 replicas without flapping.

---

## Monitoring

### Exposing Metrics & Dashboards:
```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n video-streaming

# Port-forward Grafana
kubectl port-forward svc/grafana 3000:3000 -n video-streaming
```

### Grafana Dashboards:
1. **Application Overview**: RPS, P95/Avg Latency, 4xx/5xx Error Rates, Active In-Flight Requests.
2. **Media Metrics**: Video uploads, stream requests (200 vs 206), views, streaming failures.
3. **Kubernetes Overview**: Pod replica counts, CPU cores, memory bytes, container restarts.
4. **Autoscaling Overview**: Current vs Desired Replicas, CPU % vs 70% Target, RPS correlation.

---

## CI/CD

Continuous Integration and Deployment run via **GitHub Actions**:
- **CI Workflow (`ci.yml`)**: Triggered on push and PR. Runs Flake8, executes Pytest with real PostgreSQL & MinIO service containers, executes Vitest frontend tests, builds the Vite production bundle, and builds/pushes multi-stage Docker images tagged with the commit SHA to **GitHub Container Registry (GHCR)**.
- **CD Workflow (`cd.yml`)**: Deploys images with commit-based tags to Kubernetes, verifies zero-downtime rolling updates with `kubectl rollout status`, runs health smoke tests, and triggers automated rollback (`kubectl rollout undo`) on any failure.

---

## Security

- **Bcrypt Hashing**: All passwords salted and hashed irreversibly.
- **HS256 JWTs**: Strict token expiration and signature validation.
- **Server-Side RBAC**: Admin-only operations strictly enforced on API routes.
- **Upload Hardening**: Whitelisted extensions and MIME types, maximum 500MB size, UUID storage keys, and path traversal prevention.
- **SQL Injection Defense**: 100% parameterized SQLAlchemy ORM queries with whitelisted sorting keys.
- **Defense-in-Depth Headers**: `nosniff`, `DENY`, `strict-origin-when-cross-origin`, and Content Security Policy.
- **Container Hardening**: Non-root UID `10001` execution with dropped Linux capabilities.

---

## Failure Recovery

| Scenario | Recovery Mechanism | Observed Time |
| :--- | :--- | :--- |
| **Backend Pod Crash** | ReplicaSet schedules replacement pod | 6.2s |
| **Frontend Pod Crash** | Traffic routed to healthy pod; replacement scheduled | 3.4s |
| **Failed Release** | `kubectl rollout undo` reverts to previous stable revision | < 10s |
| **MinIO Interruption** | Readiness fails fast; liveness survives; auto-reconnects on reboot | Zero crash-loop |
| **PostgreSQL Interruption**| Readiness fails fast; clean JSON 503 error; auto-reconnects | Zero crash-loop |
| **Storage Reboots** | PVCs retain all metadata, users, views, and video binaries | Zero data loss |

---

## Demo Workflow

For live evaluations and presentations, follow the complete step-by-step walkthrough in [docs/DEMO_SCRIPT.md](file:///docs/DEMO_SCRIPT.md):
1. Problem statement & architectural overview
2. Live application tour (playback, Range seeking, upload)
3. Kubernetes pod inspection
4. Health probe distinction and self-healing demo
5. Prometheus & Grafana dashboard presentation
6. Locust load test injection & live HPA scale-out
7. CI/CD pipeline and automated rollback overview

---

## Troubleshooting

### Pods in `Pending` State:
Verify persistent volume availability:
```bash
kubectl get pvc -n video-streaming
kubectl describe pod <pod-name> -n video-streaming
```

### Metrics Server Not Available:
If running on Minikube, enable the addon:
```bash
minikube addons enable metrics-server
```

### Database Connection Issues:
Verify PostgreSQL service connectivity:
```bash
kubectl exec -it deployment/backend-deployment -n video-streaming -- curl -sf http://postgres:5432 || true
```

---

## Future Improvements

- Deploying distributed caching (Redis) for high-frequency video metadata.
- Transcoding pipeline with asynchronous worker queues (Celery / RabbitMQ) for multi-bitrate HLS/DASH streaming.
- Distributed tracing with OpenTelemetry and Jaeger for deep microservice request correlation.
