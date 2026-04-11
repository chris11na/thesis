from fastapi.testclient import TestClient

from app.main import app
from app.db.seed import seed_initial_data
from app.db.session import SessionLocal


client = TestClient(app)
db = SessionLocal()
try:
    seed_initial_data(db)
finally:
    db.close()


def test_refresh_rotates_refresh_token() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login.status_code == 200
    old_refresh = login.json()["refresh_token"]

    refreshed = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200
    body = refreshed.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != old_refresh

    reuse_old = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse_old.status_code == 401


def test_logout_revokes_refresh_token() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    refresh = login.json()["refresh_token"]

    logout = client.post("/auth/logout", json={"refresh_token": refresh})
    assert logout.status_code == 200

    refresh_after_logout = client.post("/auth/refresh", json={"refresh_token": refresh})
    assert refresh_after_logout.status_code == 401
