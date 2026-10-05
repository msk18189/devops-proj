from unittest.mock import patch


def test_health_endpoint(client):
    """Test general health endpoint returns valid system metadata."""
    with patch("app.routes.health.check_db_connection", return_value=(True, "connected")):
        response = client.get("/api/health")
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "data" in body
        data = body["data"]
        assert data["status"] == "healthy"
        assert data["database"]["status"] == "connected"
        assert "service" in data


def test_liveness_probe(client):
    """Test Kubernetes liveness probe returns HTTP 200 process alive."""
    response = client.get("/api/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


def test_readiness_probe_healthy(client):
    """Test Kubernetes readiness probe returns HTTP 200 when database responds."""
    with patch("app.routes.health.check_db_connection", return_value=(True, "connected")):
        response = client.get("/api/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["dependencies"]["database"] == "connected"


def test_readiness_probe_unhealthy(client):
    """Test Kubernetes readiness probe returns HTTP 503 when database is unreachable."""
    with patch("app.routes.health.check_db_connection", return_value=(False, "Connection refused")):
        response = client.get("/api/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert "Database connection failed" in data["reason"]
