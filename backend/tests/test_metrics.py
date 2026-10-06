def test_prometheus_metrics_endpoint(client):
    """Verify /metrics returns HTTP 200 with standard Prometheus exposition format."""
    # Generate some API traffic first
    client.get("/api/health/live")
    client.get("/api/videos?page=1&page_size=5")

    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["Content-Type"] or "version=0.0.4" in response.headers["Content-Type"]

    body = response.text
    # Verify core HTTP metric presence
    assert "http_requests_total" in body
    assert "http_request_duration_seconds" in body
    assert "http_requests_in_progress" in body
