"""Coverage for paginated catalog, user approval, service tiers, license packs."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.seed import seed_initial_data
from app.db.session import SessionLocal
from app.main import app
from app.models.license import License
from app.models.product import Product
from app.models.role import Role
from app.services.equipment_catalog_loader import seed_equipment_catalog

client = TestClient(app)
db = SessionLocal()
try:
    seed_initial_data(db)
finally:
    db.close()


def _admin_token() -> str:
    r = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _user_token() -> str:
    r = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_list_products_returns_paginated_payload() -> None:
    tok = _user_token()
    r = client.get(
        "/products",
        params={"page": 1, "page_size": 10, "configurator_only": True},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "page_size" in body
    assert "pages" in body
    assert isinstance(body["items"], list)
    assert body["page_size"] == 10


def test_list_products_search_by_name() -> None:
    tok = _user_token()
    r = client.get(
        "/products",
        params={"q": "WLAN", "configurator_only": True, "page_size": 50},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert items
    assert any("wlan" in (x.get("name") or "").lower() for x in items)


def test_list_products_search_by_numeric_id() -> None:
    tok = _user_token()
    listed = client.get(
        "/products",
        params={"configurator_only": True, "page_size": 1},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert listed.status_code == 200, listed.text
    items = listed.json().get("items") or []
    assert items, "expected at least one product in seed/catalog"
    product_id = items[0]["id"]

    by_id = client.get(
        "/products",
        params={"q": str(product_id), "configurator_only": True},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert by_id.status_code == 200, by_id.text
    ids = [row["id"] for row in by_id.json().get("items") or []]
    assert product_id in ids


def test_equipment_types_endpoint() -> None:
    tok = _admin_token()
    r = client.get("/products/equipment-types", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    rows = r.json()
    assert isinstance(rows, list)


def test_admin_can_set_user_comment_not_exposed_to_user_read() -> None:
    email = f"comment-{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "Comment User", "email": email, "password": "regpass1"},
    )
    assert reg.status_code == 200
    user_id = reg.json()["user_id"]

    admin_tok = _admin_token()
    patch = client.patch(
        f"/users/{user_id}",
        json={"is_approved": True, "admin_comment": "Internal sales note"},
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert patch.status_code == 200, patch.text
    assert patch.json().get("admin_comment") == "Internal sales note"

    listed = client.get("/users", headers={"Authorization": f"Bearer {admin_tok}"})
    assert listed.status_code == 200
    row = next(x for x in listed.json() if x["id"] == user_id)
    assert row["admin_comment"] == "Internal sales note"


def test_service_options_for_catalog_switch() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db)
        db.commit()
        va = db.query(Product).filter(Product.name == "VA1800-8T-2S").first()
        assert va is not None
        va_id = va.id
    finally:
        db.close()

    tok = _user_token()
    r = client.get(
        f"/products/{va_id}/service-options",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("attachable") is True
    assert body.get("standard") is not None
    assert body["standard"]["article"] == "VPS-VA1800-8T-2S"


def test_configuration_accepts_service_product_addon() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db)
        db.commit()
        va = db.query(Product).filter(Product.name == "VA1800-8T-2S").first()
        vps = db.query(Product).filter(Product.name == "VPS-VA1800-8T-2S").first()
        assert va is not None and vps is not None
        va_id, vps_id = va.id, vps.id
    finally:
        db.close()

    tok = _user_token()
    user_id = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    ).json()["user_id"]

    r = client.post(
        "/configurations",
        json={
            "user_id": user_id,
            "project_name": "Service tier test",
            "lines": [
                {
                    "equipment_product_id": va_id,
                    "addons": [{"service_product_id": vps_id, "quantity": 1}],
                }
            ],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    spec = r.json().get("specification") or []
    assert any(row.get("kind") == "service" for row in spec)


def test_oauth_providers_includes_yandex_flag() -> None:
    r = client.get("/auth/oauth/providers")
    assert r.status_code == 200
    body = r.json()
    assert "yandex" in body
    assert isinstance(body["yandex"], bool)


def test_license_pack_prefers_single_x32_for_need_17() -> None:
    db = SessionLocal()
    try:
        seed_equipment_catalog(db)
        from app.services.equipment_groups_seed import assign_products_to_subgroups
        from app.services.wifi_spec_seed import (
            refresh_wifi_spec_values,
            seed_wifi_controller_license_packs,
        )

        assign_products_to_subgroups(db)
        refresh_wifi_spec_values(db)
        seed_wifi_controller_license_packs(db)
        db.commit()
        controller = db.query(Product).filter(Product.name == "VNC-2000").first()
        assert controller is not None, "expected VNC-2000 from equipment catalog"
        pack_x32 = (
            db.query(License)
            .filter(
                License.product_id == controller.id,
                License.units_per_pack == 32,
            )
            .first()
        )
        assert pack_x32 is not None
        controller_id = controller.id
        pack_x32_id = pack_x32.id
    finally:
        db.close()

    tok = _user_token()
    r = client.get(
        f"/products/{controller_id}/license-pack-suggestion",
        params={"target_ap_count": 33},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    rows_x32 = [x for x in data["suggestion"] if x["license_id"] == pack_x32_id]
    assert len(rows_x32) == 1
    assert rows_x32[0]["quantity"] == 1


def test_seed_roles_are_admin_and_user_only() -> None:
    db = SessionLocal()
    try:
        roles = {row.id: row.name for row in db.query(Role).all()}
    finally:
        db.close()
    assert roles == {1: "admin", 2: "user"}


def test_wifi_controllers_have_license_packs_after_seed(monkeypatch) -> None:
    monkeypatch.setenv("SEED_EQUIPMENT_CATALOG", "1")
    db = SessionLocal()
    try:
        seed_initial_data(db)
        controller = db.query(Product).filter(Product.name == "VNC-2000").first()
        assert controller is not None
        assert controller.built_in_license_units == 16
        packs = (
            db.query(License)
            .filter(License.product_id == controller.id)
            .order_by(License.units_per_pack)
            .all()
        )
        assert [row.units_per_pack for row in packs] == [16, 32, 128]
    finally:
        db.close()
