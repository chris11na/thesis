from app.core.log_sanitize import sanitize_for_log


def test_sanitize_for_log_redacts_password_and_tokens() -> None:
    payload = {
        "email": "user@example.com",
        "password": "secret123",
        "refresh_token": "rt-abc",
        "nested": {"access_token": "at-xyz", "name": "User"},
    }
    sanitized = sanitize_for_log(payload)
    assert sanitized["email"] == "user@example.com"
    assert sanitized["password"] == "***"
    assert sanitized["refresh_token"] == "***"
    assert sanitized["nested"]["access_token"] == "***"
    assert sanitized["nested"]["name"] == "User"


def test_sanitize_for_log_leaves_non_sensitive_fields() -> None:
    payload = {"user_id": 2, "project_name": "Demo"}
    assert sanitize_for_log(payload) == payload
