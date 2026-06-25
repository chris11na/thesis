from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.switch_spec_seed import refresh_switch_spec_values

client = TestClient(app)


def _ensure_switch_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        refresh_switch_spec_values(db)
        db.commit()
    finally:
        db.close()


def _admin_headers() -> dict[str, str]:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _user_token() -> str:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def test_spec_filter_options_returns_switch_parameters() -> None:
    _ensure_switch_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    products = client.get(
        "/products",
        params={"product_category": "VA", "page_size": 5},
        headers=headers,
    )
    assert products.status_code == 200, products.text
    assert products.json()["items"]

    options = client.get(
        "/products/spec-filter-options",
        params={"product_category": "VA"},
        headers=headers,
    )
    assert options.status_code == 200, options.text
    payload = options.json()
    assert isinstance(payload, list)
    codes = {row["code"] for row in payload}
    assert "switch_layer" in codes
    layer = next(row for row in payload if row["code"] == "switch_layer")
    assert "2" in layer["values"] or "3" in layer["values"]


def test_dynamic_spec_filter_via_query_param_code() -> None:
    _ensure_switch_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}

    created_param = client.post(
        "/products/spec-parameters",
        json={"code": "rack_units", "name": "Rack units", "sort_order": 99},
        headers=_admin_headers(),
    )
    assert created_param.status_code == 200, created_param.text
    param_id = created_param.json()["id"]

    product = client.post(
        "/products",
        json={
            "name": "Dynamic Filter Switch",
            "description": "Test switch",
            "product_category": "VA",
            "technical_spec_values": [
                {"parameter_id": param_id, "value": "42U"},
            ],
        },
        headers=_admin_headers(),
    )
    assert product.status_code == 200, product.text

    filtered = client.get(
        "/products",
        params={"product_category": "VA", "rack_units": "42U", "page_size": 200},
        headers=headers,
    )
    assert filtered.status_code == 200, filtered.text
    names = {item["name"] for item in filtered.json()["items"]}
    assert "Dynamic Filter Switch" in names

    options = client.get(
        "/products/spec-filter-options",
        params={"product_category": "VA"},
        headers=headers,
    )
    assert options.status_code == 200, options.text
    codes = {row["code"] for row in options.json()}
    assert "rack_units" in codes


def test_search_matches_structured_spec_values() -> None:
    _ensure_switch_catalog_seeded()
    headers = _admin_headers()

    created_param = client.post(
        "/products/spec-parameters",
        json={"code": "search_marker", "name": "Search marker", "sort_order": 100},
        headers=headers,
    )
    assert created_param.status_code == 200, created_param.text
    param_id = created_param.json()["id"]

    marker = "zz-dynamic-spec-marker-8842"
    product = client.post(
        "/products",
        json={
            "name": "Search By Spec Product",
            "description": "plain description without marker",
            "technical_spec_values": [
                {"parameter_id": param_id, "value": marker},
            ],
        },
        headers=headers,
    )
    assert product.status_code == 200, product.text

    found = client.get("/products", params={"q": marker, "page_size": 50}, headers=headers)
    assert found.status_code == 200, found.text
    names = {item["name"] for item in found.json()["items"]}
    assert "Search By Spec Product" in names
