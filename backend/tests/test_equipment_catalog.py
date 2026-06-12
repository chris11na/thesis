"""Tests for normalized equipment catalog (JSON + loader)."""

from pathlib import Path

from app.db.session import SessionLocal
from app.services.equipment_catalog_loader import (
    CATALOG_PATH,
    load_equipment_catalog_document,
    seed_equipment_catalog,
)


def test_equipment_catalog_json_structure() -> None:
    doc = load_equipment_catalog_document(CATALOG_PATH)
    assert doc["schema_version"] == 1
    assert doc["price_list_date"] == "2026-02-01"
    assert doc["stats"]["product_count"] >= 350
    assert "VA" in doc["stats"]["by_type_code"]
    assert "VPS" in doc["stats"]["by_type_code"]
    assert "VPSN" in doc["stats"]["by_type_code"]

    sample = doc["products"][0]
    assert sample["article"]
    assert sample["type_code"]
    assert "configurator_eligible" in sample


def test_vps_links_to_parent_article() -> None:
    doc = load_equipment_catalog_document(CATALOG_PATH)
    vps = next(p for p in doc["products"] if p["article"] == "VPS-VA1800-8T-2S")
    assert vps["service_tier"] == "standard"
    assert vps["service_for_article"] == "VA1800-8T-2S"

    vpsn = next(p for p in doc["products"] if p["article"].startswith("VPSN-VA1800"))
    assert vpsn["service_tier"] == "extended"
    assert vpsn["service_for_article"] == "VA1800-8T-2S"


def test_seed_equipment_catalog_inserts_rows() -> None:
    db = SessionLocal()
    try:
        stats = seed_equipment_catalog(db)
        assert stats["inserted"] + stats["skipped"] == stats["total_in_catalog"]
        assert stats["total_in_catalog"] >= 350

        stats_again = seed_equipment_catalog(db)
        assert stats_again["inserted"] == 0
        assert stats_again["skipped"] == stats_again["total_in_catalog"]
        db.commit()
    finally:
        db.close()


def test_build_script_exists() -> None:
    script = Path(__file__).resolve().parents[1] / "scripts" / "build_equipment_catalog.py"
    assert script.is_file()
