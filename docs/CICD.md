# CI/CD Pipeline & Deployment Guide

This document details the automated Continuous Integration and Continuous Deployment (CI/CD) pipelines powering the **DevOps for a Video Streaming Platform** project.

---

## 1. Pipeline Architecture

```text
                                DEVELOPER
                                    │
                                    ▼
                         git push / pull_request
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  Backend CI   │               │  Frontend CI  │
            ├───────────────┤               ├───────────────┤
            │ Python 3.11   │               │ Node.js 20    │
            │ Flake8 Lint   │               │ TypeScript    │
            │ Pytest + Cov  │               │ Vitest Suites │
            │ Postgres &    │               │ Vite Build    │
            │ MinIO Service │               └───────┬───────┘
            └───────┬───────┘                       │
                    └───────────────┬───────────────┘
                                    │ (Both Jobs PASS)
                                    ▼
                        ┌───────────────────────┐
                        │ Docker Build & Push   │
                        ├───────────────────────┤
                        │ Docker Buildx Cache   │
                        │ SHA-based Tagging     │
                        │ Push to GitHub GHCR   │
                        └───────────┬───────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ CD: Kubernetes Rolling Update │
                    ├───────────────────────────────┤
                    │ kubectl apply -f k8s/         │
                    │ kubectl set image (SHA tag)   │
                    │ kubectl rollout status        │
                    │ Automated Health Smoke Test   │
                    │ (Auto-rollback on failure)    │
                    └───────────────────────────────┘
```

---

## 2. GitHub Actions Workflows

The pipeline is organized into two distinct, decoupled workflow files:

1. [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml) — **Continuous Integration**
2. [`.github/workflows/cd.yml`](file:///.github/workflows/cd.yml) — **Continuous Deployment**

### 2.1 Continuous Integration (`ci.yml`)

The CI workflow triggers automatically on:
- Every push to `master`, `main`, and `develop`
- Every pull request targeting `master` and `main`

#### Job 1: `backend-ci`
- **Environment**: `ubuntu-latest` with Python 3.11 and pip caching.
- **Service Containers**: Runs real containerized `postgres:15-alpine` and `minio/minio` instances with automated health checks so integration tests and database schemas are validated against real storage drivers.
- **Linting**: Runs `flake8` to enforce PEP8 syntax conventions.
- **Unit & Integration Tests**: Executes the full 57-test Pytest suite with `pytest-cov` reporting.
- **Fail-Fast**: If any test fails, the workflow immediately fails and halts downstream stages.

#### Job 2: `frontend-ci`
- **Environment**: `ubuntu-latest` with Node.js 20 and npm dependency caching.
- **Dependencies**: Uses `npm ci` referencing `package-lock.json` for deterministic, reproducible installs.
- **Testing**: Runs Vitest test suites across authentication, video services, and formatting utilities.
- **Production Build**: Compiles TypeScript and packages CSS/JS bundles with Vite.

#### Job 3: `docker-build-push`
- **Dependency**: Executes only after **both** `backend-ci` and `frontend-ci` succeed.
- **Registry**: Authenticates to GitHub Container Registry (`ghcr.io`) using the scoped ephemeral `GITHUB_TOKEN`.
- **Image Tagging**: Every build is tagged with the exact Git commit SHA (e.g. `sha-a1b2c3d`) and conditionally `latest` on default branch commits.
- **Caching**: Utilizes GitHub Actions cache (`type=gha`) for fast incremental layer compilation.

---

### 2.2 Continuous Deployment (`cd.yml`)

The CD workflow triggers upon:
- Completion of the `CI Pipeline` workflow on `master` or `main` (when conclusion is `success`)
- Manual execution via `workflow_dispatch` with selectable environment (`staging` or `production`) and custom image tag

#### Deployment Execution Flow
1. **Manifest Application**: Applies declarative Kubernetes manifests (`namespace`, `secrets`, `configmap`, `pvc`, `services`, `deployments`, `ingress`, `hpa`).
2. **Image Mutation**: Sets the container image to the exact commit SHA tag published by the CI pipeline:
   ```bash
   kubectl set image deployment/backend-deployment backend=ghcr.io/<owner>/<repo>/backend:sha-a1b2c3d -n video-streaming
   kubectl set image deployment/frontend-deployment frontend=ghcr.io/<owner>/<repo>/frontend:sha-a1b2c3d -n video-streaming
   ```
3. **Rolling Update Verification**: Monitors the zero-downtime rolling update with a 180-second timeout:
   ```bash
   kubectl rollout status deployment/backend-deployment -n video-streaming --timeout=180s
   kubectl rollout status deployment/frontend-deployment -n video-streaming --timeout=180s
   ```
4. **Post-Deployment Smoke Test**: Probes the backend `/api/health/ready` endpoint inside the newly deployed pod.
5. **Automated Rollback**: If either deployment or smoke test fails, the workflow catches the error and executes an automatic rollback to the previous stable revision.

---

## 3. Rollback Procedures

If an unexpected runtime regression occurs after a rollout, the system supports instant zero-downtime rollback:

### 3.1 Check Deployment Rollout History
```bash
kubectl rollout history deployment/backend-deployment -n video-streaming
kubectl rollout history deployment/frontend-deployment -n video-streaming
```

### 3.2 Roll Back to Immediately Preceding Revision
```bash
kubectl rollout undo deployment/backend-deployment -n video-streaming
kubectl rollout undo deployment/frontend-deployment -n video-streaming
```

### 3.3 Roll Back to a Specific Target Revision
```bash
# Inspect revision details
kubectl rollout history deployment/backend-deployment -n video-streaming --revision=3

# Revert to revision 3
kubectl rollout undo deployment/backend-deployment -n video-streaming --to-revision=3
```

---

## 4. Repository Secrets Configuration

To connect GitHub Actions directly to an external or cloud Kubernetes cluster, configure the following secret in **GitHub Repository Settings → Secrets and variables → Actions**:

| Secret Name | Purpose | Example / Format |
| :--- | :--- | :--- |
| `KUBE_CONFIG` | Base64-encoded `kubeconfig` granting deployment privileges | `cat ~/.kube/config \| base64 -w 0` |

> [!NOTE]
> If `KUBE_CONFIG` is not configured (e.g. for purely local clusters like Minikube or Docker Desktop), the CD workflow safely runs in audit validation mode, validating the declarative manifests and image tags without failing.
