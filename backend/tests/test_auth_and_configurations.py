from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.db.seed import seed_initial_data
from app.db.session import SessionLocal


client = TestClient(app)
db = SessionLocal()
try:
    seed_initial_data(db)
finally:
    db.close()


def test_login_success_with_seeded_admin() -> None:
    response = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_create_configuration_blocks_forbidden_items() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/configurations",
        json={"user_id": 1, "items": [103]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "несовместимые" in response.json()["detail"].lower()


def test_create_configuration_requires_auth() -> None:
    response = client.post(
        "/configurations",
        json={"user_id": 1, "items": [101]},
    )
    assert response.status_code == 401


def test_create_configuration_rbac_rejects_other_user() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    token = login.json()["access_token"]

    response = client.post(
        "/configurations",
        json={"user_id": 1, "items": [101]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_admin_can_create_user() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    email = f"apitest-{uuid4().hex[:8]}@example.com"
    response = client.post(
        "/users",
        json={
            "name": "Api Test User",
            "email": email,
            "password": "apitest123",
            "role_id": 2,
            "company_id": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_non_admin_cannot_create_user() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    token = login.json()["access_token"]
    email = f"forbidden-{uuid4().hex[:8]}@example.com"
    response = client.post(
        "/users",
        json={
            "name": "Forbidden User Create",
            "email": email,
            "password": "forbidden123",
            "role_id": 2,
            "company_id": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
