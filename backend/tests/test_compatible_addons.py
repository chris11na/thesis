from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.service_catalog import suggested_accessory_quantity

client = TestClient(app)


def _ensure_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
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


def _product_id_by_name(name: str) -> int:
    headers = {"Authorization": f"Bearer {_user_token()}"}
    resp = client.get(
        "/products",
        params={"q": name, "page_size": 20},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    for item in resp.json()["items"]:
        if item["name"] == name:
            return int(item["id"])
    raise AssertionError(f"Product not found: {name}")


def test_vo_accessory_has_no_compatible_addons() -> None:
    _ensure_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    vo_id = _product_id_by_name("VO-10G-DAC-1M")
    resp = client.get(f"/products/{vo_id}/compatible-addons", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["accessories"] == []


def test_switch_suggests_vo_accessories_not_itself() -> None:
    _ensure_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    switch_id = _product_id_by_name("VA1800-24T-4X")
    resp = client.get(f"/products/{switch_id}/compatible-addons", headers=headers)
    assert resp.status_code == 200, resp.text
    accessories = resp.json()["accessories"]
    ids = {row["product_id"] for row in accessories}
    assert switch_id not in ids
    names = {row["name"] for row in accessories}
    assert any(name.startswith("VO-10G-") or name.startswith("VO-1G-") for name in names)


def test_suggested_accessory_quantity_for_switch_ports() -> None:
    _ensure_catalog_seeded()
    db = SessionLocal()
    try:
        from app.models.product import Product

        switch = (
            db.query(Product).filter(Product.name == "VA1800-24P-4X").first()
        )
        optic = db.query(Product).filter(Product.name == "VO-1G-SFP-LX").first()
        power = db.query(Product).filter(Product.name == "VO-PWR-C13C14").first()
        assert switch is not None
        assert optic is not None
        assert power is not None
        assert suggested_accessory_quantity(switch, optic) == 4
        assert suggested_accessory_quantity(switch, power) == 2
    finally:
        db.close()


def test_compatible_addons_include_suggested_quantity() -> None:
    _ensure_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    switch_id = _product_id_by_name("VA1800-24P-4X")
    resp = client.get(f"/products/{switch_id}/compatible-addons", headers=headers)
    assert resp.status_code == 200, resp.text
    accessories = resp.json()["accessories"]
    assert accessories
    by_name = {row["name"]: row for row in accessories}
    assert by_name["VO-1G-SFP-LX"]["suggested_quantity"] == 4
    assert by_name["VO-PWR-C13C14"]["suggested_quantity"] == 2
