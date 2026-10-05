from datetime import timedelta
import pytest
from app.core.security import create_access_token


def test_register_success(client):
    """Test successful user registration."""
    payload = {
        "name": "Sarah Connor",
        "email": "sarah@cyberdyne.org",
        "password": "Password123!"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["name"] == "Sarah Connor"
    assert data["email"] == "sarah@cyberdyne.org"
    assert data["role"] == "USER"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client, normal_user):
    """Test registration fails when email is already registered."""
    payload = {
        "name": "Another John",
        "email": normal_user.email,  # duplicate
        "password": "ValidPassword999!"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_invalid_password(client):
    """Test registration rejected when password is too short (< 8 chars)."""
    payload = {
        "name": "Short Pass User",
        "email": "shortpass@example.com",
        "password": "short"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_login_success(client, normal_user):
    """Test successful login returns JWT access token and user metadata."""
    payload = {
        "email": normal_user.email,
        "password": "ValidPassword123!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["user"]["email"] == normal_user.email
    assert data["user"]["role"] == "USER"


def test_login_invalid_password(client, normal_user):
    """Test login rejected when password is wrong."""
    payload = {
        "email": normal_user.email,
        "password": "WrongPassword123!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_nonexistent_user(client):
    """Test login rejected for unregistered email."""
    payload = {
        "email": "ghost@domain.io",
        "password": "AnyPassword123!"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_authenticated(client, normal_user, user_token):
    """Test GET /api/auth/me returns current user profile with valid token."""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["id"] == normal_user.id
    assert data["email"] == normal_user.email
    assert data["name"] == normal_user.name
    assert data["role"] == "USER"
    assert "password_hash" not in data


def test_me_missing_token(client):
    """Test GET /api/auth/me rejected when no authorization header is supplied."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "MISSING_TOKEN"


def test_me_invalid_token(client):
    """Test GET /api/auth/me rejected when token is forged or malformed."""
    headers = {"Authorization": "Bearer totally_invalid_jwt_token_string"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_TOKEN"


def test_me_expired_token(client, normal_user):
    """Test GET /api/auth/me rejected when token is past expiration timestamp."""
    # Generate token expired 1 hour ago
    expired_token = create_access_token(
        data={"sub": str(normal_user.id), "email": normal_user.email, "role": normal_user.role},
        expires_delta=timedelta(seconds=-3600)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "TOKEN_EXPIRED"


def test_admin_authorization_success(client, admin_token, admin_user):
    """Test admin endpoint accessible with valid ADMIN role token."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/dashboard-stats", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["authorized_admin"] == admin_user.email
    assert "system_metrics" in body["data"]


def test_admin_authorization_forbidden(client, user_token):
    """Test admin endpoint forbidden (HTTP 403) when user has standard USER role."""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/api/admin/dashboard-stats", headers=headers)
    assert response.status_code == 403
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "FORBIDDEN"
    assert "Administrative privileges required" in body["error"]["message"]
