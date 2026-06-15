from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.vo_accessory_spec_seed import refresh_vo_accessory_spec_values

client = TestClient(app)


def _ensure_vo_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        refresh_vo_accessory_spec_values(db)
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


def test_vo_item_type_filter_returns_only_cables() -> None:
    _ensure_vo_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    resp = client.get(
        "/products",
        params={
            "product_category": "VO",
            "vo_item_type": "cable",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert "VO-10G-DAC-1M" in names
    assert "VO-100G-QSFP-2KM" not in names


def test_vo_item_type_filter_returns_only_modules() -> None:
    _ensure_vo_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    resp = client.get(
        "/products",
        params={
            "product_category": "VO",
            "vo_item_type": "module",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert "VO-100G-QSFP-2KM" in names
    assert "VO-10G-DAC-1M" not in names
