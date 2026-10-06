def test_list_videos_empty(client):
    """Test GET /api/videos with empty database."""
    response = client.get("/api/videos")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["items"] == []
    assert body["data"]["total"] == 0


def test_list_videos_populated(client, sample_video):
    """Test GET /api/videos with existing video data."""
    response = client.get("/api/videos")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]["items"]) == 1
    assert body["data"]["items"][0]["title"] == sample_video.title
    assert body["data"]["items"][0]["id"] == sample_video.id
    assert body["data"]["total"] == 1
    assert body["data"]["total_pages"] == 1


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
    assert len(match_resp.json()["data"]["items"]) == 1

    # Non-matching category
    nomatch_resp = client.get("/api/videos?category=Gaming")
    assert nomatch_resp.status_code == 200
    assert len(nomatch_resp.json()["data"]["items"]) == 0


def test_search_and_sort_videos(client, sample_video):
    """Test search query parameter and sorting."""
    # Search match
    search_resp = client.get("/api/videos?search=Kubernetes")
    assert search_resp.status_code == 200
    assert len(search_resp.json()["data"]["items"]) == 1

    # Search no match
    search_none = client.get("/api/videos?search=NonExistentKeywordXYZ")
    assert search_none.status_code == 200
    assert len(search_none.json()["data"]["items"]) == 0

    # Sort popular
    sort_resp = client.get("/api/videos?sort=popular")
    assert sort_resp.status_code == 200
    assert len(sort_resp.json()["data"]["items"]) == 1
