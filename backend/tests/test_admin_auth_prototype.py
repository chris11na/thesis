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


def test_admin_auth_accepts_wrong_password_for_admin_email() -> None:
    """
    Current prototype behavior:
    Admin SQLAdmin login checks email + role only and ignores password.
    """
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

    assert ok is True
    assert request.session.get("admin") is True
    assert request.session.get("admin_user_id") == 1


def test_admin_auth_rejects_non_admin_even_with_any_password() -> None:
    """
    Control check:
    Non-admin users are denied by role gate regardless of password value.
    """
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    backend = AdminAuth(secret_key="test-secret")
    request = DummyRequest(
        {
            "username": "user@example.com",
            "password": "any-password",
        }
    )

    ok = asyncio.run(backend.login(request))

    assert ok is False
    assert request.session.get("admin") is None
    assert request.session.get("admin_user_id") is None

