# Kubernetes Orchestration & Deployment Guide

This document specifies the declarative Kubernetes architecture, resource manifests, deployment sequencing, operational verification, self-healing mechanics, and troubleshooting procedures for the **DevOps Video Streaming Platform**.

---

## 1. High-Level Kubernetes Cluster Topology

```text
                                  USER BROWSER
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │    Kubernetes Ingress   │
                           │      (NGINX Ingress)    │
                           └────────────┬────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │ /                                     │ /api, /docs
                    ▼                                       ▼
            ┌───────────────┐                       ┌───────────────┐
            │frontend-serv. │                       │ backend-serv. │
            │  (ClusterIP)  │                       │  (ClusterIP)  │
            └───────┬───────┘                       └───────┬───────┘
                    │                                       │
        ┌───────────┴───────────┐               ┌───────────┴───────────┐
        │ frontend-deployment   │               │ backend-deployment    │
        │      (2 Replicas)     │               │      (2 Replicas)     │
        │   [Pod 1]   [Pod 2]   │               │   [Pod 1]   [Pod 2]   │
        └───────────────────────┘               └───────────┬───────────┘
                                                            │
                                    ┌───────────────────────┴───────────────────────┐
                                    │                                               │
                                    ▼                                               ▼
                            ┌───────────────┐                               ┌───────────────┐
                            │ postgres-serv │                               │  minio-serv   │
                            │  (ClusterIP)  │                               │  (ClusterIP)  │
                            └───────┬───────┘                               └───────┬───────┘
                                    │                                               │
                                    ▼                                               ▼
                            ┌───────────────┐                               ┌───────────────┐
                            │  postgres-pod │                               │   minio-pod   │
                            └───────┬───────┘                               └───────┬───────┘
                                    │                                               │
                                    ▼                                               ▼
                              postgres-pvc                                      minio-pvc
                                (10 GiB)                                        (20 GiB)
```

---

## 2. Resource Specifications & Directory Layout

All manifests reside under `k8s/` and belong to the dedicated `video-streaming` namespace:

| Manifest | Kind | Purpose |
| :--- | :--- | :--- |
| [`namespace.yaml`](file:///e:/devops%20proj/k8s/namespace.yaml) | `Namespace` | Defines the isolated `video-streaming` namespace. |
| [`configmap.yaml`](file:///e:/devops%20proj/k8s/configmap.yaml) | `ConfigMap` | Non-sensitive configurations (MinIO endpoints, DB host, environment). |
| [`secret.yaml`](file:///e:/devops%20proj/k8s/secret.yaml) | `Secret` | Sensitive credentials (PostgreSQL password, MinIO keys, JWT secret). |
| [`postgres-pvc.yaml`](file:///e:/devops%20proj/k8s/postgres-pvc.yaml) | `PersistentVolumeClaim` | 10Gi durable volume for PostgreSQL data (`/var/lib/postgresql/data`). |
| [`postgres-deployment.yaml`](file:///e:/devops%20proj/k8s/postgres-deployment.yaml) | `Deployment` | Single-replica PostgreSQL 16 engine with `pg_isready` probes. |
| [`postgres-service.yaml`](file:///e:/devops%20proj/k8s/postgres-service.yaml) | `Service` | Internal ClusterIP exposing port 5432 to backend pods only. |
| [`minio-pvc.yaml`](file:///e:/devops%20proj/k8s/minio-pvc.yaml) | `PersistentVolumeClaim` | 20Gi durable volume for media objects (`/data`). |
| [`minio-deployment.yaml`](file:///e:/devops%20proj/k8s/minio-deployment.yaml) | `Deployment` | Single-replica S3 MinIO storage server with health probes. |
| [`minio-service.yaml`](file:///e:/devops%20proj/k8s/minio-service.yaml) | `Service` | Internal ClusterIP exposing S3 API (9000) and Web Console (9001). |
| [`backend-deployment.yaml`](file:///e:/devops%20proj/k8s/backend-deployment.yaml) | `Deployment` | Multi-instance (2 replicas) FastAPI backend with rolling updates. |
| [`backend-service.yaml`](file:///e:/devops%20proj/k8s/backend-service.yaml) | `Service` | Internal ClusterIP load balancer exposing port 8000. |
| [`frontend-deployment.yaml`](file:///e:/devops%20proj/k8s/frontend-deployment.yaml) | `Deployment` | Multi-instance (2 replicas) NGINX SPA container. |
| [`frontend-service.yaml`](file:///e:/devops%20proj/k8s/frontend-service.yaml) | `Service` | Internal ClusterIP exposing port 80 to Ingress. |
| [`ingress.yaml`](file:///e:/devops%20proj/k8s/ingress.yaml) | `Ingress` | NGINX Ingress Controller routing HTTP traffic to frontend and backend. |

---

## 3. Ordered Deployment Sequence

Deploy manifests in topological dependency order to avoid readiness failures:

```bash
# 1. Namespace & Configuration Foundation
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 2. Database Storage Layer
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# 3. Object Storage Layer
kubectl apply -f k8s/minio-pvc.yaml
kubectl apply -f k8s/minio-deployment.yaml
kubectl apply -f k8s/minio-service.yaml

# 4. Backend Application Layer (2 Replicas)
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# 5. Frontend Presentation Layer (2 Replicas)
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# 6. Cluster Ingress Routing
kubectl apply -f k8s/ingress.yaml
```

---

## 4. Verification & Diagnostic Commands

### Inspect Cluster Resources
```bash
# Check all pods in namespace
kubectl get pods -n video-streaming

# Check deployments and replica counts
kubectl get deployments -n video-streaming

# Check services and ClusterIP allocations
kubectl get services -n video-streaming

# Check PVC binding states
kubectl get pvc -n video-streaming

# Check ingress status
kubectl get ingress -n video-streaming
```

### Inspect Pod Logs
```bash
# Follow backend deployment logs across replicas
kubectl logs -n video-streaming deployment/backend -f

# Follow frontend deployment logs
kubectl logs -n video-streaming deployment/frontend -f

# Follow specific pod logs
kubectl logs -n video-streaming <pod-name> -f
```

### Debugging & Troubleshooting Pods
```bash
# Detailed inspection of pod events, probe statuses, and restarts
kubectl describe pod <pod-name> -n video-streaming

# Detailed deployment status (surges, rollouts)
kubectl describe deployment backend -n video-streaming

# Inspect namespace events
kubectl get events -n video-streaming --sort-by='.metadata.creationTimestamp'

# Open interactive shell in backend container
kubectl exec -it <backend-pod-name> -n video-streaming -- sh
```

---

## 5. Self-Healing & High Availability Verification

### 5.1 Self-Healing Pod Recreation Test
When a worker pod crashes or is terminated, the Kubernetes Deployment ReplicaSet controller detects the drift and recreates a replacement pod automatically:

```bash
# 1. List active backend pods
kubectl get pods -n video-streaming -l app=backend

# 2. Delete one of the backend pods
kubectl delete pod <backend-pod-name> -n video-streaming

# 3. Observe the immediate recreation in watch mode
kubectl get pods -n video-streaming -w
```
**Expected Outcome:**
1. Pod enters `Terminating` state.
2. The Deployment controller initiates a new pod immediately (`Pending` ➔ `ContainerCreating`).
3. Startup probe passes ➔ Readiness probe passes (`1/1 Running`).
4. Traffic routes to the healthy replica without service downtime.

### 5.2 Zero-Downtime Rolling Update Strategy
The `backend-deployment.yaml` employs:
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 0
```
When a new container image tag or environment variable is applied:
1. Kubernetes spins up a new pod alongside the existing pods.
2. Traffic only routes to the new pod after its `/api/health/ready` probe succeeds.
3. Old pods are terminated only after the replacement is fully verified healthy (`maxUnavailable: 0`).

---

## 6. Local Kubernetes Environments

### Option A: Docker Desktop Kubernetes
1. Open Docker Desktop Settings ➔ Kubernetes ➔ Check "Enable Kubernetes".
2. Enable Ingress NGINX:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
   ```
3. Apply manifests: `kubectl apply -f k8s/`
4. Access platform via `http://localhost` (Ingress forwards port 80).

### Option B: Minikube
1. Start Minikube: `minikube start --driver=docker`
2. Enable ingress addon: `minikube addons enable ingress`
3. Apply manifests: `kubectl apply -f k8s/`
4. Retrieve IP: `minikube ip` (map `streamops.local` to this IP in `/etc/hosts` or Windows `hosts`).
