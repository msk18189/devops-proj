import random
from locust import HttpUser, task, between

class VideoPlatformUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Optionally register and login a virtual user session."""
        self.user_email = f"loadtest_{random.randint(10000, 999999)}@example.com"
        self.user_password = "LoadTestPassword123!"
        self.token = None

        # Register user
        reg_resp = self.client.post("/api/auth/register", json={
            "name": f"LoadUser {random.randint(100, 999)}",
            "email": self.user_email,
            "password": self.user_password
        })

        if reg_resp.status_code == 201:
            # Login to get token
            login_resp = self.client.post("/api/auth/login", json={
                "email": self.user_email,
                "password": self.user_password
            })
            if login_resp.status_code == 200:
                data = login_resp.json().get("data", {})
                self.token = data.get("access_token")

    @task(5)
    def check_health(self):
        """Frequent health check probe."""
        self.client.get("/api/health/live")
        self.client.get("/api/health/ready")

    @task(10)
    def browse_videos(self):
        """Simulate browsing video catalog."""
        self.client.get("/api/videos?page=1&page_size=10")

    @task(3)
    def fetch_video_details(self):
        """Simulate fetching specific video details."""
        video_id = random.randint(1, 5)
        self.client.get(f"/api/videos/{video_id}")

    @task(2)
    def get_current_user_profile(self):
        """Simulate viewing current profile with JWT."""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            self.client.get("/api/auth/me", headers=headers)
