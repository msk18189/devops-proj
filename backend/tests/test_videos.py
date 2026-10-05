def test_list_videos_empty(client):
    """Test GET /api/videos with empty database."""
    response = client.get("/api/videos")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"] == []
    assert body["meta"]["total"] == 0


def test_list_videos_populated(client, sample_video):
    """Test GET /api/videos with existing video data."""
    response = client.get("/api/videos")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["title"] == sample_video.title
    assert body["data"][0]["id"] == sample_video.id
    assert body["meta"]["total"] == 1


def test_get_video_by_id_success(client, sample_video):
    """Test GET /api/videos/{id} returns video details."""
    response = client.get(f"/api/videos/{sample_video.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["id"] == sample_video.id
    assert body["data"]["title"] == sample_video.title


def test_get_video_by_id_not_found(client):
    """Test GET /api/videos/{id} with non-existent ID returns standardized 404 JSON."""
    response = client.get("/api/videos/999999")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert "error" in body
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert "999999" in body["error"]["message"]


def test_filter_videos_by_category(client, sample_video):
    """Test filtering videos by category parameter."""
    # Match existing category
    match_resp = client.get("/api/videos?category=DevOps")
    assert match_resp.status_code == 200
    assert len(match_resp.json()["data"]) == 1

    # Non-matching category
    nomatch_resp = client.get("/api/videos?category=Gaming")
    assert nomatch_resp.status_code == 200
    assert len(nomatch_resp.json()["data"]) == 0


def test_create_video_authenticated(client, user_token):
    """Test creating video metadata record with valid Bearer token."""
    payload = {
        "title": "Prometheus Blackbox Exporter Setup",
        "description": "Probe HTTP, HTTPS, DNS, TCP, and ICMP endpoints.",
        "filename": "blackbox_exporter.mp4",
        "storage_key": "videos/blackbox.mp4",
        "thumbnail_key": "thumbs/blackbox.jpg",
        "category": "Monitoring",
        "duration": 600,
        "file_size": 31457280
    }
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/videos", json=payload, headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["title"] == "Prometheus Blackbox Exporter Setup"


def test_create_video_unauthorized(client):
    """Test creating video without token is rejected with 401."""
    payload = {
        "title": "Unauthorized Video",
        "filename": "unauth.mp4",
        "storage_key": "videos/unauth.mp4"
    }
    response = client.post("/api/videos", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "MISSING_TOKEN"
