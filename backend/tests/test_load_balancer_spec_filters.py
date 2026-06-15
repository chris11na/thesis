from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.equipment_groups_seed import assign_products_to_subgroups
from app.services.load_balancer_spec_seed import refresh_load_balancer_spec_values

client = TestClient(app)


def _ensure_lb_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        assign_products_to_subgroups(db, force=True)
        refresh_load_balancer_spec_values(db)
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


def _lb_subgroup_id(code: str) -> int:
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    assert groups.status_code == 200, groups.text
    group = next(g for g in groups.json() if g["code"] == "load_balancer")
    sub = next(s for s in group["subgroups"] if s["code"] == code)
    return int(sub["id"])


def test_load_balancer_subgroup_counts_are_expected() -> None:
    _ensure_lb_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    group = next(g for g in groups.json() if g["code"] == "load_balancer")
    by_code = {s["code"]: s["product_count"] for s in group["subgroups"]}
    assert by_code.get("equipment") == 41
    assert by_code.get("support") == 82
    assert "accessories" not in by_code


def test_vlb_device_type_filter_virtual_server() -> None:
    _ensure_lb_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _lb_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "vlb_device_type": "virtual_server",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert "VLB10-005G-V" in names
    assert "VLB08-010G-A" not in names
    assert "VLB-4P-10G-SFP" not in names


def test_load_balancer_support_tier_filter_standard() -> None:
    _ensure_lb_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _lb_subgroup_id("support")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": support_sub,
            "support_tier": "standard",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names
    assert all(name.startswith("VPS-") for name in names)
    assert not any(name.startswith("VPSN-") for name in names)
