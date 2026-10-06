# Prometheus Monitoring & Alerting Guide

This document details the Prometheus metrics instrumentation, scrape configurations, alert definitions, and verification procedures for the **DevOps Video Streaming Platform**.

---

## 1. Observability Architecture

```text
       USER TRAFFIC / LOCUST
                 │
                 ▼
          FastAPI Backend
    (PrometheusMiddleware & Routers)
                 │
                 │ Exposes /metrics
                 ▼
          Prometheus Server
       (Scrapes every 10s via ClusterIP)
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
  PromQL Engine    Alert Evaluation Engine
  (Serves Grafana) (Evaluates Warning & Critical Rules)
```

---

## 2. Exposed Application Metrics Reference

All metrics are exposed at `GET /metrics` in standard Prometheus exposition text format:

| Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- |
| `http_requests_total` | `Counter` | `method`, `route`, `status` | Total HTTP requests served. Bounded route templates prevent label explosion. |
| `http_request_duration_seconds` | `Histogram`| `method`, `route` | Latency distribution across 9 buckets (5ms to 10s) for calculating P95/P99 latency. |
| `http_requests_in_progress` | `Gauge` | `method`, `route` | Concurrently active requests being processed in flight. |
| `video_uploads_total` | `Counter` | `status` | Video upload operations (`success` or `failure`). |
| `video_stream_requests_total` | `Counter` | `status` | Stream responses served (HTTP `200` full vs `206` partial range). |
| `video_stream_failures_total` | `Counter` | — | Failed stream attempts (missing objects, out-of-range bounds). |
| `video_views_total` | `Counter` | — | Verified video playback sessions logged in PostgreSQL. |
| `database_operation_duration_seconds` | `Histogram`| `operation` | Database transaction durations for `select`, `insert`, `update`, `delete`. |

---

## 3. Prometheus Alerting Rules

Defined in `k8s/monitoring/prometheus-configmap.yaml`:

```yaml
groups:
  - name: streamops_platform_alerts
    rules:
      - alert: BackendInstanceDown
        expr: up{job="fastapi-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "FastAPI Backend instance unavailable"

      - alert: HighHttp5xxRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High HTTP 5xx error rate (>5%)"

      - alert: HighP95Latency
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1.0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "API P95 latency exceeds 1.0 second"

      - alert: VideoStreamFailureSpike
        expr: rate(video_stream_failures_total[5m]) > 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Spike in video streaming errors (>2/sec)"
```

---

## 4. Verification & Diagnostic Commands

```bash
# Port-forward Prometheus UI to localhost
kubectl port-forward svc/prometheus-service 9090:9090 -n video-streaming
```
Open `http://localhost:9090`:
1. Navigate to **Status ➔ Targets** to confirm `fastapi-backend` shows state **UP** (1/1 or 2/2).
2. Execute test PromQL queries:
   * Current health: `up`
   * Request throughput: `sum(rate(http_requests_total[1m]))`
   * P95 latency: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))`
   * Active requests: `sum(http_requests_in_progress)`
