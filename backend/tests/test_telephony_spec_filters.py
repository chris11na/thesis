from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.equipment_groups_seed import assign_products_to_subgroups
from app.services.telephony_spec_seed import refresh_telephony_spec_values

client = TestClient(app)


def _ensure_telephony_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        assign_products_to_subgroups(db, force=True)
        refresh_telephony_spec_values(db)
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


def _telephony_subgroup_id(code: str) -> int:
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    assert groups.status_code == 200, groups.text
    group = next(g for g in groups.json() if g["code"] == "telephony")
    sub = next(s for s in group["subgroups"] if s["code"] == code)
    return int(sub["id"])


def test_telephony_subgroup_counts() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    group = next(g for g in groups.json() if g["code"] == "telephony")
    by_code = {s["code"]: s["product_count"] for s in group["subgroups"]}
    assert by_code.get("equipment") == 11
    assert by_code.get("licenses") == 4
    assert by_code.get("support") == 4


def test_telephony_item_type_filter_communication_manager() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _telephony_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "telephony_item_type": "communication_manager",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VCM-500-H", "VCM-1000-H"}


def test_telephony_item_type_filter_expansion_module() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _telephony_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "telephony_item_type": "expansion_module",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VCM-8FXS", "VCM-4FXS-4FXO", "VCM-1E1"}


def test_telephony_item_type_filter_certificate() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _telephony_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "telephony_item_type": "certificate",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VCM-APL1", "VCM-SUP185"}


def test_telephony_item_type_filter_ip_phone() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _telephony_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "telephony_item_type": "ip_phone",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VP-120", "VP-220", "VP-320", "VP-520"}


def test_telephony_support_tier_filter_standard() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _telephony_subgroup_id("support")
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
    assert names == {"VPS-VCM-500-H", "VPS-VCM-1000-H"}


def test_telephony_support_tier_filter_extended() -> None:
    _ensure_telephony_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _telephony_subgroup_id("support")
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
    assert names == {"VPSN-VCM-500-H", "VPSN-VCM-1000-H"}
