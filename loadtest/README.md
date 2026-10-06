# Locust Load Testing & Concurrency Benchmarking Guide

This directory contains the distributed load generation scripts for benchmarking the **DevOps Video Streaming Platform** and exercising Kubernetes Horizontal Pod Autoscaler (HPA) triggers.

---

## 1. Load Profile & Scenarios

The `locustfile.py` script executes a realistic, weighted behavioral profile:

| Action | Path | Weight | Purpose |
| :--- | :--- | :--- | :--- |
| **Catalog Browse** | `/api/videos?page=...` | **40%** | Simulates catalog queries, pagination, and category filtering |
| **Search Queries** | `/api/videos?search=...`| **20%** | Tests backend ILIKE search index performance |
| **Video Metadata** | `/api/videos/{id}` | **20%** | Tests transactional ID lookup and creator resolution |
| **Range Streaming**| `/api/videos/{id}/stream`| **20%**| Sends HTTP 206 `Range: bytes=0-524287` partial content chunks |

---

## 2. Environment Variables & Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `LOAD_TEST_EMAIL` | Auto-generated virtual user | Email for user session authentication |
| `LOAD_TEST_PASSWORD` | `LoadTestPassword123!` | Password for user session |
| `VIDEO_ID` | `1` | Default video identifier for metadata and streaming queries |

---

## 3. Execution Commands

### Prerequisites
Install Locust:
```bash
pip install locust
```

### 3.1 Web UI Mode (Interactive)
```bash
# Start Locust server bound to localhost:8089
locust -f loadtest/locustfile.py --host http://localhost:8000
```
Open your browser at `http://localhost:8089` to specify user counts, spawn rates, and observe latency graphs in real-time.

### 3.2 Headless Staged Execution (Automated CLI)

#### Stage 1: Baseline Verification (10 Users)
```bash
locust -f loadtest/locustfile.py \
  --headless \
  --host http://localhost:8000 \
  -u 10 -r 2 \
  --run-time 2m \
  --csv=loadtest/results_stage1
```

#### Stage 2: Moderate Load (25 Users)
```bash
locust -f loadtest/locustfile.py \
  --headless \
  --host http://localhost:8000 \
  -u 25 -r 5 \
  --run-time 3m \
  --csv=loadtest/results_stage2
```

#### Stage 3: High Concurrency (50 Users - Triggers HPA)
```bash
locust -f loadtest/locustfile.py \
  --headless \
  --host http://localhost:8000 \
  -u 50 -r 10 \
  --run-time 5m \
  --csv=loadtest/results_stage3
```

#### Stage 4: Stress Concurrency (100 Users)
```bash
locust -f loadtest/locustfile.py \
  --headless \
  --host http://localhost:8000 \
  -u 100 -r 20 \
  --run-time 5m \
  --csv=loadtest/results_stage4
```
