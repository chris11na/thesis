from pathlib import Path


def _read(path: str) -> str:
    root = Path(__file__).resolve().parents[2]
    return (root / path).read_text(encoding="utf-8")


def test_login_page_has_login_controls() -> None:
    html = _read("frontend/login.html")
    assert 'id="login-btn"' in html
    assert 'id="login-email-input"' in html
    assert 'id="login-password-input"' in html
    assert "/auth/login" in html
    assert "/auth/register" in html
    assert 'id="register-btn"' in html
    assert 'assets/logo.png' in html
    assert 'signInYandex' in html
    assert 'oauth-yandex-btn' in html
    assert 'api-config.js' in html


def test_index_has_session_logout_and_auth_status() -> None:
    html = _read("frontend/index.html")
    assert 'id="clear-token-btn"' in html
    assert 'id="auth-status-area"' in html
    assert "login.html" in html


def test_frontend_contains_role_badge_and_admin_block() -> None:
    html = _read("frontend/index.html")
    assert 'id="role-badge"' in html
    assert 'id="admin-catalog-block"' in html
    assert 'assets/logo.png' in html
    assert 'id="products-pagination"' in html
    assert 'id="admin-products-search-input"' in html
    assert 'id="admin-users-search-input"' in html
    assert 'id="admin-companies-search-input"' in html
    assert 'id="admin-products-type-select"' in html
    assert 'id="admin-spec-params-tbody"' in html


def test_frontend_contains_token_refresh_and_logout_flow() -> None:
    html = _read("frontend/index.html")
    assert "REFRESH_TOKEN_STORAGE_KEY" in html
    assert "/auth/refresh" in html
    assert "/auth/logout" in html
    assert "async function refreshAccessToken()" in html
    assert "async function apiFetch(" in html


def test_frontend_contains_configuration_guard_for_missing_login() -> None:
    html = _read("frontend/index.html")
    assert "function beginCreateConfigurationFlow()" in html
    assert "if (!accessToken)" in html
    assert "/configurations" in html
