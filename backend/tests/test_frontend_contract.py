from pathlib import Path


def _read_frontend_html() -> str:
    root = Path(__file__).resolve().parents[2]
    html_path = root / "frontend" / "index.html"
    return html_path.read_text(encoding="utf-8")


def test_frontend_contains_auth_controls() -> None:
    html = _read_frontend_html()
    assert 'id="login-btn"' in html
    assert 'id="clear-token-btn"' in html
    assert 'id="auth-status-area"' in html


def test_frontend_contains_role_badge_and_admin_block() -> None:
    html = _read_frontend_html()
    assert 'id="role-badge"' in html
    assert 'id="admin-user-block"' in html
    assert "Create user (admin)" in html


def test_frontend_contains_token_refresh_and_logout_flow() -> None:
    html = _read_frontend_html()
    assert "REFRESH_TOKEN_STORAGE_KEY" in html
    assert '/auth/refresh' in html
    assert '/auth/logout' in html
    assert "async function refreshAccessToken()" in html
    assert "async function apiFetch(" in html


def test_frontend_contains_configuration_guard_for_missing_login() -> None:
    html = _read_frontend_html()
    assert "async function createConfiguration()" in html
    assert "if (!accessToken)" in html
    assert "/configurations" in html
