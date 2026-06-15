from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.equipment_groups_seed import assign_products_to_subgroups
from app.services.firewall_spec_seed import refresh_firewall_spec_values

client = TestClient(app)


def _ensure_firewall_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        assign_products_to_subgroups(db, force=True)
        refresh_firewall_spec_values(db)
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


def _firewall_subgroup_id(code: str) -> int:
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    assert groups.status_code == 200, groups.text
    group = next(g for g in groups.json() if g["code"] == "firewall")
    sub = next(s for s in group["subgroups"] if s["code"] == code)
    return int(sub["id"])


def test_firewall_subgroup_counts() -> None:
    _ensure_firewall_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    group = next(g for g in groups.json() if g["code"] == "firewall")
    by_code = {s["code"]: s["product_count"] for s in group["subgroups"]}
    assert by_code.get("equipment") == 11
    assert by_code.get("support") == 4


def test_vfw_item_type_filter_firewall() -> None:
    _ensure_firewall_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _firewall_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "vfw_item_type": "firewall",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VFW4100-8T-2S", "VFW4300-24T-4S-4X"}


def test_vfw_item_type_filter_certificate() -> None:
    _ensure_firewall_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _firewall_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "vfw_item_type": "certificate",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert len(names) == 9
    assert "VFW4100-8T-2S" not in names
    assert "VFW-SSL-100" in names


def test_firewall_support_tier_filter_standard() -> None:
    _ensure_firewall_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _firewall_subgroup_id("support")
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
    assert names == {"VPS-VFW4100-8T-2S", "VPS-VFW4300-24T-4S-4X"}


def test_firewall_support_tier_filter_extended() -> None:
    _ensure_firewall_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _firewall_subgroup_id("support")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": support_sub,
            "support_tier": "extended",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VPSN-VFW4100-8T-2S", "VPSN-VFW4300-24T-4S-4X"}
