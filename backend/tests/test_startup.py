def test_root_endpoint(client):
    """Test root application status endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data


def test_openapi_docs(client):
    """Test that interactive API docs and OpenAPI specs are generated."""
    # Swagger docs
    docs_resp = client.get("/docs")
    assert docs_resp.status_code == 200

    # ReDoc
    redoc_resp = client.get("/redoc")
    assert redoc_resp.status_code == 200

    # OpenAPI schema JSON
    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    schema = openapi_resp.json()
    assert "paths" in schema
    assert "/api/health" in schema["paths"]
    assert "/api/auth/register" in schema["paths"]
    assert "/api/auth/login" in schema["paths"]
    assert "/api/auth/me" in schema["paths"]
    assert "/api/videos" in schema["paths"]
