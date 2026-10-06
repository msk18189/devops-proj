# Grafana Observability Dashboards & Visual Analytics Guide

This document details the Grafana deployment architecture, automated provisioning, PromQL dashboard queries, and visualization workflows for the **DevOps Video Streaming Platform**.

---

## 1. Observability Visualization Topology

```text
               FastAPI Backend Metrics (/metrics)
                               │
                               ▼
               Prometheus Server (Port 9090)
                               │
                       PromQL Queries
                               ▼
                    Grafana Server (Port 3000)
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  [Application Overview]  [Media Metrics]       [Autoscaling]
```

---

## 2. Production Dashboards Reference

All dashboards are persisted in `monitoring/dashboards/` and auto-provisioned upon container startup:

### 2.1 Application Overview (`application-overview.json`)
* **Requests per Second (RPS):** `sum(rate(http_requests_total[1m]))` with route breakdowns.
* **Latency Distribution:** Average vs P95 response times via `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))`.
* **Error Rate:** Real-time 4xx client errors and 5xx server errors.
* **Active Requests:** Instantaneous gauge of concurrent requests in flight (`sum(http_requests_in_progress)`).

### 2.2 Media Metrics (`media-metrics.json`)
* **Total Stream Requests:** Aggregate HTTP 200 (full) vs HTTP 206 (partial range) streaming counts.
* **Stream Failures:** Out-of-bounds range requests and missing media objects.
* **Upload Telemetry:** Successful video uploads vs failed validation events.
* **Logged Views:** Cumulative video playback views committed to PostgreSQL.

### 2.3 Kubernetes Infrastructure Overview (`kubernetes-overview.json`)
* **Active Replicas:** Running backend and frontend pod instances.
* **Compute Utilization:** Real-time CPU core consumption vs container resource requests (`250m`).
* **Memory Footprint:** Resident working set memory consumption vs container limits (`512Mi`).
* **Pod Restarts:** CrashLoopBackOff and OOMKilled container restart counters.

### 2.4 Autoscaling Correlation Dashboard (`autoscaling.json`)
Demonstrates the full DevOps autoscaling loop visually:
1. **Traffic Spike:** Request Rate (RPS) escalates as Locust users ramp up.
2. **CPU Pressure:** Average pod CPU utilization crosses the 70% threshold.
3. **HPA Decision:** `kube_hpa_status_desired_replicas` jumps from 2 ➔ 4.
4. **Capacity Relief:** 2 new pods become Ready; average CPU drops back to ~48%; P95 latency normalizes.
5. **Cooldown Scale-Down:** Following load cessation, replicas smoothly scale back down to 2.

---

## 3. Access & Port Forwarding

```bash
# Forward Grafana service to localhost
kubectl port-forward svc/grafana-service 3000:3000 -n video-streaming
```
Open your browser at `http://localhost:3000`:
* **Default Username:** `admin`
* **Default Password:** `admin_streamops_2026`
* Navigate to **Dashboards ➔ Browse ➔ StreamOps Platform** to view the dashboards.
