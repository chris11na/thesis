import json

from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.core.security import hash_password
from app.db.seed import seed_initial_data
from app.db.session import SessionLocal
from app.models.user import User


client = TestClient(app)
db = SessionLocal()
try:
    seed_initial_data(db)
finally:
    db.close()


def test_login_success_with_seeded_admin() -> None:
    response = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_create_configuration_requires_auth() -> None:
    response = client.post(
        "/configurations",
        json={"user_id": 1, "items": [501]},
    )
    assert response.status_code == 401


def test_create_configuration_rbac_rejects_other_user() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    response = client.post(
        "/configurations",
        json={"user_id": 1, "items": [501]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_admin_cannot_create_configuration() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    response = client.post(
        "/configurations",
        json={"user_id": 1, "items": [501]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_admin_can_create_user() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    email = f"apitest-{uuid4().hex[:8]}@example.com"
    response = client.post(
        "/users",
        json={
            "name": "Api Test User",
            "email": email,
            "password": "apitest123",
            "role_id": 2,
            "company_id": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_non_admin_cannot_create_user() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    email = f"forbidden-{uuid4().hex[:8]}@example.com"
    response = client.post(
        "/users",
        json={
            "name": "Forbidden User Create",
            "email": email,
            "password": "forbidden123",
            "role_id": 2,
            "company_id": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_admin_can_list_users() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    response = client.get(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    assert "email" in body[0]


def test_admin_can_list_users_for_company() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    response = client.get(
        "/users?company_id=1",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    for row in response.json():
        assert row["company_id"] == 1


def test_non_admin_cannot_list_users() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    response = client.get(
        "/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_create_user_rejects_mismatched_email_domain() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    response = client.post(
        "/users",
        json={
            "name": "Wrong domain",
            "email": "person@gmail.com",
            "password": "pw12345678",
            "role_id": 2,
            "company_id": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "domain" in response.json()["detail"].lower()


def test_login_rejects_user_when_email_domain_not_company_domain() -> None:
    email = f"orphan-{uuid4().hex[:8]}@other.org"
    db = SessionLocal()
    try:
        db.add(
            User(
                name="Orphan",
                email=email,
                password_hash=hash_password("pass12345"),
                role_id=2,
                company_id=1,
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/auth/login",
        json={"email": email, "password": "pass12345"},
    )
    assert response.status_code == 403
    assert "domain" in response.json()["detail"].lower()


def test_product_incompatible_pair_blocks_configuration() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    pa = client.post(
        "/products",
        json={"name": "PairTest A", "description": "t"},
        headers=headers,
    )
    pb = client.post(
        "/products",
        json={"name": "PairTest B", "description": "t"},
        headers=headers,
    )
    assert pa.status_code == 200
    assert pb.status_code == 200
    id_a = pa.json()["id"]
    id_b = pb.json()["id"]

    pr = client.post(
        "/compatibilities/product-pairs",
        json={"product_id_a": id_a, "product_id_b": id_b},
        headers=headers,
    )
    assert pr.status_code == 200
    pair_id = pr.json()["id"]

    ulogin = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert ulogin.status_code == 200, ulogin.text
    utok = ulogin.json()["access_token"]
    cfg = client.post(
        "/configurations",
        json={"user_id": 2, "items": [id_a, id_b]},
        headers={"Authorization": f"Bearer {utok}"},
    )
    assert cfg.status_code == 400

    client.delete(f"/compatibilities/product-pairs/{pair_id}", headers=headers)
    client.delete(f"/products/{id_a}", headers=headers)
    client.delete(f"/products/{id_b}", headers=headers)


def test_register_returns_tokens_and_login_works() -> None:
    email = f"reg-{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "Registered User", "email": email, "password": "regpass1"},
    )
    assert reg.status_code == 200
    body = reg.json()
    assert body.get("access_token")
    assert body.get("refresh_token")
    login = client.post(
        "/auth/login",
        json={"email": email, "password": "regpass1"},
    )
    assert login.status_code == 200


def test_register_rejects_unknown_domain() -> None:
    r = client.post(
        "/auth/register",
        json={
            "name": "X",
            "email": "nobody@this-domain-does-not-exist.invalid",
            "password": "secret12",
        },
    )
    assert r.status_code == 403


def test_register_rejects_duplicate_email() -> None:
    r = client.post(
        "/auth/register",
        json={
            "name": "Dup",
            "email": "user@example.com",
            "password": "secret12",
        },
    )
    assert r.status_code == 409


def _user_token() -> str:
    login = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "user123"},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def test_configuration_options_excludes_incompatible_module_speed() -> None:
    tok = _user_token()
    r = client.get(
        "/products/502/configuration-options",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    ids = {m["id"] for m in r.json().get("modules", [])}
    assert 511 in ids and 512 in ids
    assert 513 not in ids


def _admin_headers() -> dict:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_rules_json_runtime_overrides_speed_filter() -> None:
    """rules_json filter/speed wins over module_speeds_json for configuration-options."""
    ah = _admin_headers()
    ut = _user_token()
    rules = json.dumps([{"type": "filter", "field": "speed", "allowed": [1]}])
    try:
        assert (
            client.patch(
                "/products/502",
                json={"rules_json": rules},
                headers=ah,
            ).status_code
            == 200
        )
        r = client.get(
            "/products/502/configuration-options",
            headers={"Authorization": f"Bearer {ut}"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        ids = {m["id"] for m in body.get("modules", [])}
        assert 511 in ids and 512 not in ids
        assert body.get("rules_runtime_sources", {}).get("speed_allowlist") == "rules_json"
    finally:
        client.patch("/products/502", json={"rules_json": None}, headers=ah)


def test_rules_json_runtime_overrides_module_slot_limit() -> None:
    ah = _admin_headers()
    ut = _user_token()
    rules = json.dumps([{"type": "limit", "field": "modules", "max": 1}])
    try:
        assert (
            client.patch(
                "/products/502",
                json={"rules_json": rules},
                headers=ah,
            ).status_code
            == 200
        )
        r = client.post(
            "/configurations",
            json={
                "user_id": 2,
                "lines": [
                    {
                        "equipment_product_id": 502,
                        "addons": [
                            {"module_id": 511, "quantity": 1},
                            {"module_id": 512, "quantity": 1},
                        ],
                    }
                ],
            },
            headers={"Authorization": f"Bearer {ut}"},
        )
        assert r.status_code == 400
        assert "max 1" in r.json().get("detail", "").lower()
    finally:
        client.patch("/products/502", json={"rules_json": None}, headers=ah)


def test_rules_json_license_included_overrides_built_in_for_validation() -> None:
    ah = _admin_headers()
    ut = _user_token()
    rules = json.dumps([{"type": "license", "included": 200}])
    try:
        assert (
            client.patch(
                "/products/501",
                json={"rules_json": rules},
                headers=ah,
            ).status_code
            == 200
        )
        r = client.post(
            "/configurations",
            json={
                "user_id": 2,
                "lines": [
                    {
                        "equipment_product_id": 501,
                        "target_ap_count": 50,
                        "addons": [],
                    }
                ],
            },
            headers={"Authorization": f"Bearer {ut}"},
        )
        assert r.status_code == 200, r.text
    finally:
        client.patch("/products/501", json={"rules_json": None}, headers=ah)


def test_create_structured_configuration_satisfies_ap_target() -> None:
    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "lines": [
                {
                    "equipment_product_id": 501,
                    "target_ap_count": 100,
                    "addons": [{"license_id": 523, "quantity": 1}],
                }
            ],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("specification")
    kinds = [row["kind"] for row in body["specification"]]
    assert "equipment" in kinds and "license" in kinds


def test_create_structured_configuration_rejects_insufficient_licenses() -> None:
    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "lines": [
                {
                    "equipment_product_id": 501,
                    "target_ap_count": 100,
                    "addons": [{"license_id": 521, "quantity": 1}],
                }
            ],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 400
    assert "insufficient" in r.json()["detail"].lower()


def test_create_structured_configuration_rejects_incompatible_module() -> None:
    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "lines": [
                {
                    "equipment_product_id": 502,
                    "addons": [{"module_id": 513, "quantity": 1}],
                }
            ],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 400
    detail = r.json()["detail"].lower()
    assert "not supported" in detail or "не поддерж" in detail or "gbps" in detail


def test_license_pack_suggestion_endpoint() -> None:
    tok = _user_token()
    r = client.get(
        "/products/501/license-pack-suggestion",
        params={"target_ap_count": 100},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("needed_extra_units") == 84
    assert data.get("residual_units_short") == 0
    # Same license_id must not appear twice; quantities must be merged.
    lic_ids = [row["license_id"] for row in data["suggestion"]]
    assert len(lic_ids) == len(set(lic_ids))


def test_license_pack_suggestion_merges_duplicate_license_rows() -> None:
    """need=17 with x16 packs: greedy 1 + remainder 1 => one row qty 2, not two rows."""
    tok = _user_token()
    r = client.get(
        "/products/501/license-pack-suggestion",
        params={"target_ap_count": 33},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("needed_extra_units") == 17
    assert data.get("residual_units_short") == 0
    rows_521 = [x for x in data["suggestion"] if x["license_id"] == 521]
    assert len(rows_521) == 1
    assert rows_521[0]["quantity"] == 2


def test_configuration_sales_handoff_metadata_and_admin_submission_list() -> None:
    utok = _user_token()
    create = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "project_name": "Airport Wifi Expansion",
            "project_contact_name": "Alice Integrator",
            "project_contact_email": "alice@example.com",
            "project_notes": "Need quote before Friday",
            "lines": [
                {
                    "equipment_product_id": 501,
                    "target_ap_count": 10,
                    "addons": [],
                }
            ],
        },
        headers={"Authorization": f"Bearer {utok}"},
    )
    assert create.status_code == 200, create.text
    body = create.json()
    assert body.get("submitted_to_sales") is True
    assert body.get("project", {}).get("project_name") == "Airport Wifi Expansion"

    ah = _admin_headers()
    submissions = client.get("/configurations/submissions", headers=ah)
    assert submissions.status_code == 200, submissions.text
    rows = submissions.json()
    assert isinstance(rows, list)
    assert any(
        r.get("configuration_id") == body.get("configuration_id")
        and (r.get("project") or {}).get("project_contact_email") == "alice@example.com"
        for r in rows
    )


def test_product_rules_json_patch() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    pr = client.post(
        "/products",
        json={"name": "Rules JSON Test", "description": "x"},
        headers=headers,
    )
    assert pr.status_code == 200
    pid = pr.json()["id"]

    bad = client.patch(
        f"/products/{pid}",
        json={"rules_json": "{not json"},
        headers=headers,
    )
    assert bad.status_code == 400

    doc = [{"type": "filter", "field": "speed", "allowed": [1, 10]}]

    ok = client.patch(
        f"/products/{pid}",
        json={"rules_json": json.dumps(doc)},
        headers=headers,
    )
    assert ok.status_code == 200
    assert ok.json().get("rules_json") == json.dumps(doc)

    ce = client.get(f"/products/{pid}/catalog-editor", headers=headers)
    assert ce.status_code == 200
    assert ce.json().get("rules_json") == json.dumps(doc)


def test_admin_catalog_editor_and_module_license_crud() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    pr = client.post(
        "/products",
        json={"name": "Catalog UI Test Product", "description": "x"},
        headers=headers,
    )
    assert pr.status_code == 200
    pid = pr.json()["id"]

    utok = _user_token()
    r403 = client.get(
        f"/products/{pid}/catalog-editor",
        headers={"Authorization": f"Bearer {utok}"},
    )
    assert r403.status_code == 403

    r0 = client.get(f"/products/{pid}/catalog-editor", headers=headers)
    assert r0.status_code == 200
    assert r0.json()["modules"] == []
    assert r0.json()["licenses"] == []

    m1 = client.post(
        f"/products/{pid}/modules",
        json={
            "name": "Mod A",
            "speed_gbps": 10,
            "form_factor": "SFP+",
            "max_quantity": 4,
        },
        headers=headers,
    )
    assert m1.status_code == 200
    mid = m1.json()["id"]

    l1 = client.post(
        f"/products/{pid}/licenses",
        json={"name": "Pack x5", "units_per_pack": 5},
        headers=headers,
    )
    assert l1.status_code == 200
    lid = l1.json()["id"]

    r1 = client.get(f"/products/{pid}/catalog-editor", headers=headers)
    body1 = r1.json()
    assert len(body1["modules"]) == 1
    assert len(body1["licenses"]) == 1

    pm = client.patch(
        f"/products/modules/{mid}",
        json={"name": "Mod A2", "speed_gbps": 1},
        headers=headers,
    )
    assert pm.status_code == 200

    pl = client.patch(
        f"/products/licenses/{lid}",
        json={"units_per_pack": 10},
        headers=headers,
    )
    assert pl.status_code == 200

    assert client.delete(f"/products/modules/{mid}", headers=headers).status_code == 200
    assert client.delete(f"/products/licenses/{lid}", headers=headers).status_code == 200

    r2 = client.get(f"/products/{pid}/catalog-editor", headers=headers)
    assert r2.json()["modules"] == []
    assert r2.json()["licenses"] == []

    assert client.delete(f"/products/{pid}", headers=headers).status_code == 200
