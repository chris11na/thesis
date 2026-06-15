from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.services.equipment_catalog_loader import seed_equipment_catalog
from app.services.equipment_groups_seed import assign_products_to_subgroups
from app.services.server_spec_seed import refresh_server_spec_values

client = TestClient(app)


def _ensure_server_catalog_seeded() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db, update_existing=True)
        assign_products_to_subgroups(db, force=True)
        refresh_server_spec_values(db)
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


def _server_subgroup_id(code: str) -> int:
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    assert groups.status_code == 200, groups.text
    group = next(g for g in groups.json() if g["code"] == "server")
    sub = next(s for s in group["subgroups"] if s["code"] == code)
    return int(sub["id"])


def test_server_subgroup_counts() -> None:
    _ensure_server_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    groups = client.get("/catalog-groups", headers=headers)
    group = next(g for g in groups.json() if g["code"] == "server")
    by_code = {s["code"]: s["product_count"] for s in group["subgroups"]}
    assert by_code.get("equipment") == 4
    assert by_code.get("support") == 8


def test_server_support_tier_filter_standard() -> None:
    _ensure_server_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _server_subgroup_id("support")
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
    assert names == {
        "VPS-VS1210-3",
        "VPS-VS1210-4",
        "VPS-VS2224-3",
        "VPS-VS2224-4",
    }
    assert not any(name.startswith("VPSN-") for name in names)


def test_server_support_tier_filter_extended() -> None:
    _ensure_server_catalog_seeded()
    headers = {"Authorization": f"Bearer {_user_token()}"}
    support_sub = _server_subgroup_id("support")
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
    assert names == {
        "VPSN-VS1210-3",
        "VPSN-VS1210-4",
        "VPSN-VS2224-3",
        "VPSN-VS2224-4",
    }
    assert not any(name.startswith("VPS-") for name in names)
