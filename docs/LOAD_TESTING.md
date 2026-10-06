# Load Testing & Performance Benchmarking Methodology

This document details the load testing methodology, user simulation scenarios, test progression stages, and key performance indicators (KPIs) for the **DevOps Video Streaming Platform**.

---

## 1. Testing Methodology

Load testing validates that the platform sustains high concurrency and scales horizontally without performance degradation or request drops. Testing combines CPU-intensive search operations, relational queries, and HTTP 206 byte-range media streaming.

### Core Performance Indicators (KPIs)
* **Request Throughput (RPS):** Total HTTP transactions executed per second.
* **Error Rate:** Percentage of HTTP 5xx responses (must be < 0.1%).
* **P95 Latency:** 95th percentile response time (target < 250ms for catalog, < 500ms for media stream range).
* **Autoscaling Latency:** Elapsed time from traffic spike to new pod readiness.

---

## 2. Test Progression Matrix

| Stage | Concurrent Users | Spawn Rate | Duration | Target Objective |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1 (Baseline)** | 10 users | 2 users/sec | 2 min | Verify baseline API latency on 2 initial replicas |
| **Stage 2 (Moderate)** | 25 users | 5 users/sec | 3 min | Measure thread pool utilization and query response times |
| **Stage 3 (Autoscaling)**| 50 users | 10 users/sec| 5 min | Exceed 70% CPU threshold and trigger HPA expansion to 4-5 pods |
| **Stage 4 (Peak Stress)** | 100 users| 20 users/sec| 5 min | Stress test cluster load balancing and verify replica scale-down |

---

## 3. Running Headless Benchmarks

```bash
# Execute Stage 1
locust -f loadtest/locustfile.py --headless --host http://localhost:8000 -u 10 -r 2 --run-time 2m

# Execute Stage 3 with HPA validation
locust -f loadtest/locustfile.py --headless --host http://localhost:8000 -u 50 -r 10 --run-time 5m
```
