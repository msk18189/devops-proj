import os
import random
import logging
from locust import HttpUser, task, between

logger = logging.getLogger("streamops.loadtest")

SEARCH_QUERIES = [
    "kubernetes",
    "devops",
    "docker",
    "streaming",
    "python",
    "fastapi",
    "autoscaling",
    "cloud"
]

CATEGORIES = [
    "Technology",
    "Education",
    "Entertainment",
    "Gaming",
    "Science",
    "Music"
]


class VideoPlatformUser(HttpUser):
    """
    Simulates realistic user traffic against the DevOps Video Streaming Platform:
    - 40% Catalog browsing & pagination
    - 20% Video metadata & creator details
    - 20% Search queries with filters
    - 20% HTTP 206 Byte-Range media streaming & playback view tracking
    """
    wait_time = between(0.5, 2.0)

    def on_start(self):
        """Initialize session and acquire JWT authentication token."""
        self.email = os.getenv("LOAD_TEST_EMAIL", f"load_{random.randint(10000, 999999)}@streamops.io")
        self.password = os.getenv("LOAD_TEST_PASSWORD", "LoadTestPassword123!")
        self.default_video_id = int(os.getenv("VIDEO_ID", "1"))
        self.token = None
        self.available_video_ids = [self.default_video_id]

        # 1. Attempt login with provided credentials
        login_res = self.client.post("/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })

        if login_res.status_code == 200:
            data = login_res.json().get("data", {})
            self.token = data.get("access_token")
        else:
            # 2. Register virtual user if login didn't match existing account
            reg_res = self.client.post("/api/auth/register", json={
                "name": f"Virtual User {random.randint(100, 999)}",
                "email": self.email,
                "password": self.password
            })
            if reg_res.status_code in (200, 201):
                # Login newly registered user
                l_res = self.client.post("/api/auth/login", json={
                    "email": self.email,
                    "password": self.password
                })
                if l_res.status_code == 200:
                    self.token = l_res.json().get("data", {}).get("access_token")

        # Initial seed of available video IDs
        try:
            catalog_res = self.client.get("/api/videos?page=1&page_size=20")
            if catalog_res.status_code == 200:
                items = catalog_res.json().get("data", {}).get("items", [])
                if items:
                    self.available_video_ids = [v["id"] for v in items]
        except Exception as e:
            logger.warning("Could not pre-fetch catalog IDs: %s", e)

    def _get_random_video_id(self) -> int:
        if self.available_video_ids:
            return random.choice(self.available_video_ids)
        return self.default_video_id

    # -------------------------------------------------------------------------
    # Scenario A: Catalog Browsing & Category Filtering (Weight: 40%)
    # -------------------------------------------------------------------------
    @task(4)
    def browse_catalog(self):
        page = random.randint(1, 3)
        sort_order = random.choice(["latest", "popular"])
        category = random.choice(CATEGORIES)

        # General catalog page
        self.client.get(
            f"/api/videos?page={page}&page_size=12&sort={sort_order}",
            name="/api/videos?page=[page]&sort=[sort]"
        )

        # Filtered category browse
        self.client.get(
            f"/api/videos?page=1&page_size=12&category={category}",
            name="/api/videos?category=[category]"
        )

    # -------------------------------------------------------------------------
    # Scenario B: Search Queries with Debounce (Weight: 20%)
    # -------------------------------------------------------------------------
    @task(2)
    def search_videos(self):
        query = random.choice(SEARCH_QUERIES)
        self.client.get(
            f"/api/videos?search={query}&page=1&page_size=12",
            name="/api/videos?search=[query]"
        )

    # -------------------------------------------------------------------------
    # Scenario C: Video Details & Creator Metadata (Weight: 20%)
    # -------------------------------------------------------------------------
    @task(2)
    def view_video_details(self):
        video_id = self._get_random_video_id()
        self.client.get(
            f"/api/videos/{video_id}",
            name="/api/videos/{id}"
        )

    # -------------------------------------------------------------------------
    # Scenario D: HTTP 206 Partial Content Range Streaming (Weight: 20%)
    # -------------------------------------------------------------------------
    @task(2)
    def stream_video_range(self):
        video_id = self._get_random_video_id()

        # Initial segment range request (first 512 KB)
        headers = {"Range": "bytes=0-524287"}
        with self.client.get(
            f"/api/videos/{video_id}/stream",
            headers=headers,
            name="/api/videos/{id}/stream [Range 0-512KB]",
            catch_response=True
        ) as response:
            if response.status_code in (200, 206):
                response.success()
            elif response.status_code == 404:
                # Video may not exist yet in empty test DB
                response.success()
            else:
                response.failure(f"Streaming failed with status {response.status_code}")

        # Record view event after streaming
        self.client.post(
            f"/api/videos/{video_id}/view",
            name="/api/videos/{id}/view"
        )
