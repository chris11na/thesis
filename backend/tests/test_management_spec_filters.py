from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.equipment_groups_seed import assign_products_to_subgroups
from app.services.management_spec_seed import refresh_management_spec_values

client = TestClient(app)


def _ensure_management_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        assign_products_to_subgroups(db, force=True)
        refresh_management_spec_values(db)
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


def _management_subgroup_id(code: str) -> int:
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    assert groups.status_code == 200, groups.text
    group = next(g for g in groups.json() if g["code"] == "management")
    sub = next(s for s in group["subgroups"] if s["code"] == code)
    return int(sub["id"])


def test_management_equipment_subgroup_count() -> None:
    _ensure_management_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    group = next(g for g in groups.json() if g["code"] == "management")
    by_code = {s["code"]: s["product_count"] for s in group["subgroups"]}
    assert by_code.get("equipment") == 6


def test_vs_item_type_filter_connection_certificate() -> None:
    _ensure_management_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _management_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "vs_item_type": "connection_certificate",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VS-1", "VS-10", "VS-100", "VS-500"}


def test_vs_item_type_filter_management_system() -> None:
    _ensure_management_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    equipment_sub = _management_subgroup_id("equipment")
    resp = client.get(
        "/products",
        params={
            "subgroup_id": equipment_sub,
            "vs_item_type": "management_system",
            "page_size": 200,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    names = {item["name"] for item in resp.json()["items"]}
    assert names == {"VS-H", "VS-V"}
