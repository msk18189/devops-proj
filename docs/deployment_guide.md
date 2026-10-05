# Deployment Guide - StreamOps Platform

## 1. Local Developer Workflow (Docker Compose)
The quickest way to stand up the entire microservice ecosystem locally:
```bash
# Clone and enter repo
cd "e:/devops proj"

# Copy environment variables
cp .env.example .env

# Build and start all services
docker compose up -d --build
```
Inspect logs:
```bash
docker compose logs -f backend
```

---

## 2. Production Kubernetes Cluster Deployment
For Amazon EKS, Google GKE, Azure AKS, or local Minikube/Kind:
```bash
# Set kubectl context
kubectl config current-context

# Deploy all manifests in order
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/minio-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-hpa.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

Verify rollout:
```bash
kubectl get pods -n streamops -w
kubectl get hpa -n streamops
```
