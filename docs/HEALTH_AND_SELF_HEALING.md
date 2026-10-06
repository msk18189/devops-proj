# Health Probes, Self-Healing & Production Resilience Guide

This document specifies the health monitoring architecture, Kubernetes probe definitions, failure handling semantics, and self-healing mechanics for the **DevOps Video Streaming Platform**.

---

## 1. Health Probe Architecture & Tripartite Design

Kubernetes implements three distinct probe types to govern container lifecycle and traffic routing without causing destructive restart loops:

```text
                                  CONTAINER LIFECYCLE
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │    Startup Probe    │
                               │ (/api/health/live)  │
                               └──────────┬──────────┘
                                          │ Passes
                                          ▼
                      ┌───────────────────────────────────────┐
                      │                                       │
                      ▼                                       ▼
           ┌─────────────────────┐                 ┌─────────────────────┐
           │   Liveness Probe    │                 │   Readiness Probe   │
           │ (/api/health/live)  │                 │ (/api/health/ready) │
           └──────────┬──────────┘                 └──────────┬──────────┘
                      │                                       │
            Fails 3x  │                             Fails 2x  │
                      ▼                                       ▼
           ┌─────────────────────┐                 ┌─────────────────────┐
           │  Kubernetes Kills   │                 │   Pod Removed from  │
           │  & Restarts Pod     │                 │   Endpoints (No     │
           │                     │                 │   Traffic Routed)   │
           └─────────────────────┘                 └─────────────────────┘
```

### 1.1 Startup Probe (`/api/health/live`)
* **Objective:** Grants the FastAPI application sufficient initialization time (loading SQLAlchemy models, Pydantic schemas, and setting up MinIO singleton connections) before liveness probe deadlines engage.
* **Configuration:** `failureThreshold: 30`, `periodSeconds: 2`, `timeoutSeconds: 3` (allows up to 60 seconds of initial boot headroom).
* **Benefit:** Eliminates boot-loop failures on busy or cold-starting Kubernetes nodes.

### 1.2 Liveness Probe (`/api/health/live`)
* **Objective:** Assesses whether the Python process and asyncio event loop are responsive.
* **Crucial Rule:** **Never checks PostgreSQL or MinIO.** If downstream databases or object storage systems undergo momentary blips or failover, the FastAPI process is still perfectly healthy. Restarting healthy backend pods during a database outage exacerbates connection exhaustion and triggers catastrophic restart storms.
* **Behavior:** Returns HTTP 200 `{"status": "alive"}` instantly.

### 1.3 Readiness Probe (`/api/health/ready`)
* **Objective:** Determines if this pod is capable of fulfilling user requests right now.
* **Dependency Check:** Validates live TCP connection and transaction readiness with **PostgreSQL** and **MinIO**.
* **Behavior:**
  * **All Healthy:** Returns HTTP 200 `{"status": "ready", "dependencies": {"database": "connected", "storage": "connected"}}`.
  * **PostgreSQL Failure:** Returns HTTP 503 `{"status": "not_ready", "reason": "Database connection failed"}`.
  * **Result in Kubernetes:** The pod is immediately removed from the `backend-service` Endpoints list. Client requests are routed only to healthy sibling replicas while this instance recovers.

### 1.4 Frontend Health Check (`/health`)
* **Objective:** NGINX endpoint returning HTTP 200 `{"status":"healthy","service":"frontend"}`.
* **Probes:** Configured in `k8s/frontend-deployment.yaml` on port 80.

---

## 2. Kubernetes Manifest Probes (`k8s/backend-deployment.yaml`)

```yaml
startupProbe:
  httpGet:
    path: /api/health/live
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 2
  timeoutSeconds: 3
  failureThreshold: 30

livenessProbe:
  httpGet:
    path: /api/health/live
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

## 3. Self-Healing Mechanics & Verification

### 3.1 Pod Crash & Termination Recovery
When a backend pod is unexpectedly terminated (or killed via `kubectl delete pod`), the Kubernetes Deployment controller detects that current ready replicas (1) diverges from desired replicas (2).

```bash
# 1. Inspect existing backend pods
kubectl get pods -n video-streaming -l app=backend

# 2. Delete one pod
kubectl delete pod <backend-pod-name> -n video-streaming

# 3. Watch real-time self-healing recreation
kubectl get pods -n video-streaming -w
```

**Observed Lifecycle Sequence:**
```text
backend-deployment-xyz   Terminating
backend-deployment-abc   Pending
backend-deployment-abc   ContainerCreating
backend-deployment-abc   Running (Startup probe passing)
backend-deployment-abc   Running (1/1 Ready, joined Service Endpoints)
```

### 3.2 Controlled Dependency Outage Resilience
When PostgreSQL connection fails:
1. `/api/health/ready` emits HTTP 503.
2. Endpoint controller removes the pod:
   ```bash
   kubectl get endpoints backend-service -n video-streaming
   ```
3. Pod remains alive (liveness still passes HTTP 200).
4. Once PostgreSQL connectivity returns, the next readiness probe passes and the pod automatically rejoins traffic rotation without a single restart.
