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


def test_admin_can_search_users_by_name_or_email() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    by_email = client.get(
        "/users?q=admin@example",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert by_email.status_code == 200
    assert any(row["email"] == "admin@example.com" for row in by_email.json())

    by_name = client.get(
        "/users?q=prototype",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert by_name.status_code == 200
    assert any("Prototype" in (row.get("name") or "") for row in by_name.json())

    by_company = client.get(
        "/users?q=default company",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert by_company.status_code == 200
    assert any(row.get("company_id") == 1 for row in by_company.json())

    empty = client.get(
        "/users?q=zzzz-no-such-user-qqqq",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert empty.status_code == 200
    assert empty.json() == []


def test_admin_can_search_companies_by_name_or_domain() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    by_name = client.get("/companies?q=default", headers=headers)
    assert by_name.status_code == 200
    assert any("Default Company" in row.get("name", "") for row in by_name.json())

    by_domain = client.get("/companies?q=example.com", headers=headers)
    assert by_domain.status_code == 200
    assert any(row.get("domain") == "example.com" for row in by_domain.json())

    empty = client.get("/companies?q=zzzz-no-such-company-qqqq", headers=headers)
    assert empty.status_code == 200
    assert empty.json() == []


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


def test_register_returns_pending_until_admin_approves() -> None:
    email = f"reg-{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "Registered User", "email": email, "password": "regpass1"},
    )
    assert reg.status_code == 200
    body = reg.json()
    assert body.get("status") == "pending"
    assert body.get("is_approved") is False
    assert not body.get("access_token")

    login_pending = client.post(
        "/auth/login",
        json={"email": email, "password": "regpass1"},
    )
    assert login_pending.status_code == 403

    admin_tok = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    ).json()["access_token"]
    user_id = body["user_id"]
    approve = client.patch(
        f"/users/{user_id}",
        json={"is_approved": True},
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert approve.status_code == 200

    login = client.post(
        "/auth/login",
        json={"email": email, "password": "regpass1"},
    )
    assert login.status_code == 200
    assert login.json().get("access_token")


def test_admin_pending_users_count_and_delete_user() -> None:
    email = f"del-{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "Delete Me", "email": email, "password": "regpass1"},
    )
    assert reg.status_code == 200
    user_id = reg.json()["user_id"]

    admin_tok = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_tok}"}

    pending = client.get("/users/pending-count", headers=headers)
    assert pending.status_code == 200
    assert pending.json()["pending_count"] >= 1

    deleted = client.delete(f"/users/{user_id}", headers=headers)
    assert deleted.status_code == 200

    missing = client.get("/users", headers=headers)
    assert missing.status_code == 200
    assert not any(row["id"] == user_id for row in missing.json())

    cannot_delete_admin = client.delete("/users/1", headers=headers)
    assert cannot_delete_admin.status_code == 400


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


def test_user_recent_configurations_returns_last_created() -> None:
    utok = _user_token()
    headers = {"Authorization": f"Bearer {utok}"}
    r0 = client.get("/configurations/me/recent", headers=headers)
    assert r0.status_code == 200
    assert isinstance(r0.json(), list)
    cfg = client.post(
        "/configurations",
        json={"user_id": 2, "items": [501]},
        headers=headers,
    )
    assert cfg.status_code == 200, cfg.text
    cid = cfg.json()["configuration_id"]
    r1 = client.get("/configurations/me/recent", headers=headers)
    assert r1.status_code == 200
    data = r1.json()
    assert len(data) >= 1
    assert data[0]["id"] == cid
    assert data[0]["items_count"] >= 1


def test_admin_cannot_list_recent_personal_configurations() -> None:
    login = client.post(
        "/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    r = client.get(
        "/configurations/me/recent",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


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


def test_export_configuration_specification_xlsx_and_csv() -> None:
    tok = _user_token()
    headers = {"Authorization": f"Bearer {tok}"}
    created = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "project_name": "Export test",
            "lines": [
                {
                    "equipment_product_id": 501,
                    "target_ap_count": 100,
                    "addons": [{"license_id": 523, "quantity": 1}],
                }
            ],
        },
        headers=headers,
    )
    assert created.status_code == 200, created.text
    configuration_id = created.json()["configuration_id"]

    xlsx = client.get(
        f"/configurations/{configuration_id}/specification.xlsx",
        headers=headers,
    )
    assert xlsx.status_code == 200, xlsx.text
    assert (
        xlsx.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert xlsx.content[:2] == b"PK"
    assert len(xlsx.content) > 200

    csv_resp = client.get(
        f"/configurations/{configuration_id}/specification.csv",
        headers=headers,
    )
    assert csv_resp.status_code == 200, csv_resp.text
    assert "text/csv" in csv_resp.headers["content-type"]
    body = csv_resp.content.decode("utf-8-sig")
    assert "Export test" in body
    assert "Equipment" in body


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
    """need=17: prefer one x32 pack instead of two x16 packs."""
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
    rows_522 = [x for x in data["suggestion"] if x["license_id"] == 522]
    assert len(rows_521) == 0
    assert len(rows_522) == 1
    assert rows_522[0]["quantity"] == 1


def test_configuration_email_sent_on_sales_submit(monkeypatch) -> None:
    captured: dict = {}

    def _fake_send(**kwargs):
        captured["to"] = kwargs["to_email"]
        captured["xlsx"] = kwargs["xlsx_bytes"]
        captured["conf_id"] = kwargs["conf"].id

    monkeypatch.setattr(
        "app.services.config_email.deliver_configuration_specification_email",
        _fake_send,
    )
    monkeypatch.setattr("app.services.config_email.email_is_configured", lambda: True)

    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "project_name": "Email handoff test",
            "lines": [{"equipment_product_id": 502, "addons": []}],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("email_sent") is True
    assert body.get("email_recipient") == "ohibloom@gmail.com"
    assert captured.get("to") == "ohibloom@gmail.com"
    assert captured.get("conf_id") == body.get("configuration_id")
    assert isinstance(captured.get("xlsx"), bytes)
    assert captured["xlsx"][:2] == b"PK"


def test_configuration_email_sent_via_resend(monkeypatch) -> None:
    captured: dict = {}

    def _fake_resend(**kwargs):
        captured["to"] = kwargs["to_email"]
        captured["xlsx"] = kwargs["xlsx_bytes"]

    monkeypatch.setattr(
        "app.services.config_email.send_configuration_via_resend",
        _fake_resend,
    )
    monkeypatch.setattr("app.services.config_email.resend_is_configured", lambda: True)
    monkeypatch.setattr("app.services.config_email.smtp_is_configured", lambda: False)

    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "project_name": "Resend handoff test",
            "lines": [{"equipment_product_id": 502, "addons": []}],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("email_sent") is True
    assert captured.get("to") == "ohibloom@gmail.com"
    assert captured["xlsx"][:2] == b"PK"


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


def test_configuration_submitter_email_must_match_account() -> None:
    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "submitter_email": "someone-else@example.com",
            "project_name": "X",
            "lines": [{"equipment_product_id": 502, "addons": []}],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 400
    assert "submitter_email" in r.json().get("detail", "").lower()


def test_configuration_uses_account_email_when_project_contact_empty() -> None:
    tok = _user_token()
    r = client.post(
        "/configurations",
        json={
            "user_id": 2,
            "submitter_email": "user@example.com",
            "project_name": "Fallback contact test",
            "lines": [{"equipment_product_id": 502, "addons": []}],
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("submitted_to_sales") is True
    assert body.get("project", {}).get("project_contact_email") == "user@example.com"


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


def test_admin_can_manage_spec_parameters_and_product_spec_values() -> None:
    headers = _admin_headers()

    created_param = client.post(
        "/products/spec-parameters",
        json={"code": "uplink_speed", "name": "Uplink speed", "sort_order": 5},
        headers=headers,
    )
    assert created_param.status_code == 200, created_param.text
    param_id = created_param.json()["id"]

    product = client.post(
        "/products",
        json={
            "name": "Spec Value Product",
            "description": "x",
            "technical_spec_values": [
                {"parameter_id": param_id, "value": "2 x 100GE"},
            ],
        },
        headers=headers,
    )
    assert product.status_code == 200, product.text
    pid = product.json()["id"]
    assert len(product.json().get("technical_spec_values", [])) == 1

    listed = client.get(
        "/products",
        params={"spec_parameter_code": "uplink_speed", "spec_value": "100ge"},
        headers=headers,
    )
    assert listed.status_code == 200, listed.text
    payload = listed.json()
    items = payload["items"] if isinstance(payload, dict) and "items" in payload else payload
    assert any(x["id"] == pid for x in items)

    blocked_delete = client.delete(f"/products/spec-parameters/{param_id}", headers=headers)
    assert blocked_delete.status_code == 400

    clear_specs = client.patch(
        f"/products/{pid}",
        json={"technical_spec_values": []},
        headers=headers,
    )
    assert clear_specs.status_code == 200
    assert clear_specs.json().get("technical_spec_values") == []

    free_delete = client.delete(f"/products/spec-parameters/{param_id}", headers=headers)
    assert free_delete.status_code == 200

    assert client.delete(f"/products/{pid}", headers=headers).status_code == 200


def _create_sales_submission(
    *,
    project_name: str = "Test submission",
    project_notes: str | None = None,
) -> dict:
    utok = _user_token()
    payload = {
        "user_id": 2,
        "project_name": project_name,
        "project_contact_name": "Alice Integrator",
        "project_contact_email": "alice@example.com",
        "lines": [
            {
                "equipment_product_id": 501,
                "target_ap_count": 10,
                "addons": [],
            }
        ],
    }
    if project_notes is not None:
        payload["project_notes"] = project_notes
    create = client.post(
        "/configurations",
        json=payload,
        headers={"Authorization": f"Bearer {utok}"},
    )
    assert create.status_code == 200, create.text
    return create.json()


def test_admin_can_search_submissions_by_project_name() -> None:
    body = _create_sales_submission(project_name="Unique Airport Wifi Quote")
    ah = _admin_headers()
    found = client.get(
        "/configurations/submissions",
        params={"q": "airport wifi"},
        headers=ah,
    )
    assert found.status_code == 200, found.text
    rows = found.json()
    assert any(r.get("configuration_id") == body.get("configuration_id") for r in rows)

    missing = client.get(
        "/configurations/submissions",
        params={"q": "definitely-not-a-project-name-xyz"},
        headers=ah,
    )
    assert missing.status_code == 200, missing.text
    assert not any(
        r.get("configuration_id") == body.get("configuration_id") for r in missing.json()
    )


def test_admin_can_filter_submissions_by_company() -> None:
    body = _create_sales_submission(project_name="Company filter submission")
    ah = _admin_headers()
    all_rows = client.get("/configurations/submissions", headers=ah)
    assert all_rows.status_code == 200, all_rows.text
    row = next(
        x for x in all_rows.json() if x.get("configuration_id") == body.get("configuration_id")
    )
    company_id = row["company"]["id"]

    filtered = client.get(
        "/configurations/submissions",
        params={"company_id": company_id},
        headers=ah,
    )
    assert filtered.status_code == 200, filtered.text
    assert any(
        r.get("configuration_id") == body.get("configuration_id") for r in filtered.json()
    )

    other_company = 99999 if company_id != 99999 else 99998
    empty = client.get(
        "/configurations/submissions",
        params={"company_id": other_company},
        headers=ah,
    )
    assert empty.status_code == 200, empty.text
    assert not any(
        r.get("configuration_id") == body.get("configuration_id") for r in empty.json()
    )


def test_admin_can_delete_submission() -> None:
    body = _create_sales_submission(project_name="Delete me submission")
    config_id = body["configuration_id"]
    ah = _admin_headers()

    deleted = client.delete(f"/configurations/{config_id}", headers=ah)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json().get("deleted_configuration_id") == config_id

    submissions = client.get("/configurations/submissions", headers=ah)
    assert submissions.status_code == 200, submissions.text
    assert not any(r.get("configuration_id") == config_id for r in submissions.json())


def test_non_admin_cannot_delete_submission() -> None:
    body = _create_sales_submission(project_name="Protected submission")
    config_id = body["configuration_id"]
    tok = _user_token()
    denied = client.delete(
        f"/configurations/{config_id}",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert denied.status_code == 403
