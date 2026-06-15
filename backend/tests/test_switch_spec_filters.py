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


def _user_token() -> str:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def test_switch_layer_filter_returns_only_matching_switches() -> None:
    _ensure_switch_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    all_resp = client.get(
        "/products",
        params={"product_category": "VA", "page_size": 200},
        headers=headers,
    )
    assert all_resp.status_code == 200, all_resp.text
    all_items = all_resp.json()["items"]
    assert any(item["name"] == "VA1800-24T-4X" for item in all_items)

    filtered = client.get(
        "/products",
        params={
            "product_category": "VA",
            "switch_layer": "2",
            "rj45_ports": "24",
            "page_size": 200,
        },
        headers=headers,
    )
    assert filtered.status_code == 200, filtered.text
    names = {item["name"] for item in filtered.json()["items"]}
    assert "VA1800-24T-4X" in names
    assert "VA2100-24T-4X" not in names
