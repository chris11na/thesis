import asyncio

from app.admin import AdminAuth
from app.db.seed import seed_initial_data
from app.db.session import SessionLocal


class DummyRequest:
    """Minimal request stub for SQLAdmin auth backend tests."""

    def __init__(self, form_data: dict[str, str]):
        self._form_data = form_data
        self.session: dict[str, object] = {}

    async def form(self):
        return self._form_data


def test_admin_auth_rejects_wrong_password_for_admin_email() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    backend = AdminAuth(secret_key="test-secret")
    request = DummyRequest(
        {
            "username": "admin@example.com",
            "password": "definitely-wrong-password",
        }
    )

    ok = asyncio.run(backend.login(request))

    assert ok is False
    assert request.session.get("admin") is None


def test_admin_auth_accepts_valid_admin_credentials() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    backend = AdminAuth(secret_key="test-secret")
    request = DummyRequest(
        {
            "username": "admin@example.com",
            "password": "admin123",
        }
    )

    ok = asyncio.run(backend.login(request))

    assert ok is True
    assert request.session.get("admin") is True
    assert request.session.get("admin_user_id") == 1


def test_admin_auth_rejects_non_admin_even_with_valid_password() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    backend = AdminAuth(secret_key="test-secret")
    request = DummyRequest(
        {
            "username": "user@example.com",
            "password": "user123",
        }
    )

    ok = asyncio.run(backend.login(request))

    assert ok is False
    assert request.session.get("admin") is None
    assert request.session.get("admin_user_id") is None


def test_admin_auth_rejects_missing_password() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    backend = AdminAuth(secret_key="test-secret")
    request = DummyRequest({"username": "admin@example.com"})

    ok = asyncio.run(backend.login(request))

    assert ok is False
    assert request.session.get("admin") is None
