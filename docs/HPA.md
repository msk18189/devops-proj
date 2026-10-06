# Horizontal Pod Autoscaling (HPA) Architecture & Scaling Guide

This document details the configuration, scaling algorithm, stabilization mechanics, and verification procedures for the **Horizontal Pod Autoscaler (HPA)** on the **DevOps Video Streaming Platform**.

---

## 1. Autoscaling Architecture

```text
                           INCOMING USER TRAFFIC
                                    │
                                    ▼
                         Kubernetes Ingress (Port 80)
                                    │
                                    ▼
                         backend-service (ClusterIP)
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  backend-pod-1          backend-pod-2
                  (CPU: 180m/250m)       (CPU: 195m/250m)
                         │                     │
                         └──────────┬──────────┘
                                    │
                       Metrics Server (kube-system)
                        • Scrapes kubelet cAdvisor
                        • Calculates Average Utilization: ~75%
                                    │
                                    ▼
                            Kubernetes HPA
                       • Target: 70% CPU (250m request)
                       • Algorithm: ceil(2 * (75% / 70%)) = 3
                       • Scale Up Policy: +100% or +2 pods / 15s
                                    │
                                    ▼
                      backend-deployment Replicas
                         Scaled from 2 ➔ 3 ➔ 4
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
           backend-pod-1       backend-pod-2       backend-pod-3
```

---

## 2. HPA Specification (`k8s/backend-hpa.yaml`)

The autoscaler uses the modern `autoscaling/v2` API:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: video-streaming
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      select: Max
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 2
          periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 60
      select: Min
      policies:
        - type: Percent
          value: 50
          periodSeconds: 30
        - type: Pods
          value: 1
          periodSeconds: 30
```

### Key Scaling Parameters
* **Target CPU Utilization (70%):** Calculated relative to the container resource request of `250m` CPU. Whenever average pod CPU exceeds `175m`, the HPA triggers scale-up.
* **Secondary Memory Guardrail (80%):** Triggers if media processing or concurrent multipart uploads approach memory limits (`205Mi` of `256Mi` request).
* **Scale-Up Responsiveness (`stabilizationWindowSeconds: 0`):** Reacts instantly to incoming load spikes without stabilization delays, preventing dropped connections.
* **Scale-Down Conservatism (`stabilizationWindowSeconds: 60`):** Dampens replica downsizing during temporary traffic dips, preventing destructive flapping oscillations.

---

## 3. Metrics Server Precondition

Kubernetes requires the Metrics Server aggregator to collect CPU and memory telemetry:

```bash
# Verify Metrics Server installation in kube-system
kubectl get deployment metrics-server -n kube-system

# Verify active resource metrics
kubectl top pods -n video-streaming
kubectl top nodes
```

> [!NOTE]
> If using Minikube locally, enable metrics server with:
> `minikube addons enable metrics-server`
> If using Docker Desktop Kubernetes, install with:
> `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`

---

## 4. Operational Verification Commands

```bash
# Apply HPA manifest
kubectl apply -f k8s/backend-hpa.yaml

# Monitor HPA status and target utilization in real-time
kubectl get hpa backend-hpa -n video-streaming -w

# Describe detailed scaling events and conditions
kubectl describe hpa backend-hpa -n video-streaming
```
