from pathlib import Path


def _read(path: str) -> str:
    root = Path(__file__).resolve().parents[2]
    return (root / path).read_text(encoding="utf-8")


def _frontend_js_bundle() -> str:
    parts = [
        "frontend/js/core.js",
        "frontend/js/api.js",
        "frontend/js/configurator.js",
        "frontend/js/admin.js",
        "frontend/js/index.js",
    ]
    return "\n".join(_read(p) for p in parts)


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
    js = _frontend_js_bundle()
    assert 'id="clear-token-btn"' in html
    assert 'id="auth-status-area"' in html
    assert "login.html" in js


def test_index_loads_split_js_modules() -> None:
    html = _read("frontend/index.html")
    for src in (
        "js/core.js",
        "js/api.js",
        "js/configurator.js",
        "js/admin.js",
        "js/index.js",
    ):
        assert f'src="{src}"' in html


def test_frontend_contains_role_badge_and_admin_block() -> None:
    html = _read("frontend/index.html")
    js = _frontend_js_bundle()
    assert 'id="role-badge"' in html
    assert 'id="admin-catalog-block"' in html
    assert 'assets/logo.png' in html
    assert 'id="admin-products-search-input"' in html
    assert 'id="admin-users-search-input"' in html
    assert 'id="admin-users-pending-badge"' in html
    assert 'id="admin-add-user-btn"' in html
    assert "createAdminUser" in js
    assert '"/users"' in js
    assert 'id="admin-companies-search-input"' in html
    assert 'id="admin-submissions-fold"' in html
    assert 'id="admin-submissions-tbody"' in html
    assert 'id="admin-submissions-search-input"' in html
    assert 'id="admin-submissions-company-select"' in html
    assert 'id="admin-submissions-period-select"' in html
    assert "/configurations/submissions" in js
    assert "deleteAdminSubmission" in js
    assert "ADMIN_SALES_SUBMISSIONS_UI" in js
    assert 'id="user-switch-filters"' in html
    assert 'id="admin-switch-filters"' in html
    assert "catalogFilterDefs" in js
    assert "loadCatalogSpecFilterOptions" in js
    assert "/products/spec-filter-options" in js
    assert 'id="admin-spec-params-tbody"' in html


def test_frontend_contains_token_refresh_and_logout_flow() -> None:
    html = _read("frontend/index.html")
    js = _frontend_js_bundle()
    assert 'href="css/index.css"' in html
    assert 'src="js/index.js"' in html
    assert "REFRESH_TOKEN_STORAGE_KEY" in js
    assert "/auth/refresh" in js
    assert "/auth/logout" in js
    assert "async function refreshAccessToken()" in js
    assert "async function apiFetch(" in js


def test_frontend_contains_configuration_guard_for_missing_login() -> None:
    js = _frontend_js_bundle()
    assert "function beginCreateConfigurationFlow()" in js
    assert "if (!accessToken)" in js
    assert "/configurations" in js
