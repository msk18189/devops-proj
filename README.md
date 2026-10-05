# DevOps for a Video Streaming Platform (StreamOps)

A production-engineered video streaming platform built to demonstrate modern DevOps, cloud-native architecture, automated testing, container orchestration, and site reliability engineering practices.

---

## 1. Project Purpose

The primary objective of this project is to model an enterprise-grade cloud-native video platform spanning the entire software delivery lifecycle:

```text
Development  -->  Testing  -->  Docker  -->  CI/CD  -->  Kubernetes  -->  Monitoring  -->  Auto Scaling  -->  Self Healing
```

Rather than being a static demo, this system uses real production components: modular FastAPI application layers, PostgreSQL with SQLAlchemy, JWT-based authentication with bcrypt hashing, standardized error handling, Prometheus metrics instrumentation, health probes, Docker compose topologies, and Kubernetes manifest specs.

---

## 2. Problem Statement

Modern video streaming services demand:
* High throughput and low latency for concurrent API interactions.
* Strict fault tolerance and self-healing under worker failures.
* Dynamic scaling during sudden viewership spikes without human intervention.
* High observability to diagnose API latency, database locks, and pipeline failures.
* Secure multi-tenant authentication and role-based permissions (USER vs ADMIN).

Many reference projects only provide rudimentary CRUD prototypes lacking production health probes, container scaling definitions, centralized exception formatting, or telemetry pipelines.

---

## 3. Proposed Solution

StreamOps delivers:
* **Modular Clean Architecture Backend**: FastAPI service structured into core settings, security, models, schemas, services, routes, middleware, and monitoring.
* **PostgreSQL Relational Storage**: Full schema definitions for `User`, `Video`, and `VideoView` with indexes and relationships.
* **Security & RBAC**: JWT bearer tokens, bcrypt password hashing, input validation via Pydantic v2, and dependency-injected role authorization (`USER`, `ADMIN`).
* **Resilience & Probes**: Separate `/api/health/live` (process alive) and `/api/health/ready` (dependency and DB check) endpoints.
* **Containerization & Orchestration**: Docker multi-stage builds, Docker Compose local topology, and Kubernetes manifests (Deployments, Services, HPA, ConfigMaps, Secrets, Ingress).
* **Comprehensive Telemetry**: Prometheus instrumentation and Grafana dashboard templates.
* **Extensive Automated Tests**: Pytest test suite covering startup, health probes, database models, video APIs, and security/auth boundaries.

---

## 4. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, TypeScript | Interactive video catalog, auth UI, responsive design |
| **Backend** | Python 3.14 / FastAPI | High-performance asynchronous REST API |
| **Database** | PostgreSQL 16, SQLAlchemy 2.0 | Transactional metadata persistence & indexing |
| **Object Storage** | MinIO | S3-compatible video binary & thumbnail storage |
| **Containerization** | Docker, Docker Compose | Consistent local and containerized runtime |
| **Orchestration** | Kubernetes (K8s) | Declarative deployments, services, HPA, and self-healing |
| **CI/CD** | GitHub Actions | Automated linting, testing, image building |
| **Monitoring** | Prometheus, Grafana | Scraped metrics, latency histograms, SRE dashboards |
| **Testing** | Pytest, HTTPX | Automated test suite for API and security validation |
| **Load Testing** | Locust | Distributed HTTP load and concurrency benchmarking |

---

## 5. System Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams, component breakdowns, and data flows.

---

## 6. Implementation Status & Roadmap

* [x] **Phase 1: Architecture & Development Foundation**
  * Project structure, documentation, Docker Compose, K8s manifests, Grafana/Prometheus configs, load testing setup, frontend foundation.
* [x] **Phase 2: FastAPI Backend & PostgreSQL Integration**
  * Modular architecture, SQLAlchemy models (`User`, `Video`, `VideoView`), `/api/health` live/ready probes, `/api/videos` endpoints, centralized error handling.
* [x] **Phase 3: Secure User Authentication & Authorization (RBAC)**
  * Password hashing (bcrypt), JWT generation & validation, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `USER` and `ADMIN` role gates, complete Pytest security test suite.
* [ ] **Phase 4 (Upcoming): MinIO Object Storage & Video Uploads**
  * Direct multipart S3 uploads, presigned URLs, thumbnail processing, video streaming pipeline.
* [ ] **Phase 5 (Upcoming): Full Kubernetes Cluster Rollout & HPA Testing**
  * Live cluster deployment, Locust stress tests, automated pod scaling validation, chaos/pod failure tests.

---

## 7. Local Prerequisites & Quickstart

### Prerequisites
* Python 3.11+ (Python 3.14 supported)
* Node.js 18+ and npm
* Docker & Docker Compose (optional for full containerized stack)

### Running Backend Locally
```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run automated tests
pytest -v

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Accessing Interactive API Documentation
* Swagger UI: `http://localhost:8000/docs`
* ReDoc: `http://localhost:8000/redoc`

### Running Frontend Locally
```bash
# Navigate to frontend
cd frontend

# Install dependencies & start Vite dev server
npm install
npm run dev
```

### Running Entire Stack with Docker Compose
```bash
docker-compose up --build
```
* Frontend: `http://localhost:3000`
* Backend API: `http://localhost:8000`
* Prometheus: `http://localhost:9090`
* Grafana: `http://localhost:3001` (user: `admin`, pass: `admin`)
* MinIO Console: `http://localhost:9001`
