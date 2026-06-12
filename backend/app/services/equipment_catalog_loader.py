"""Load normalized equipment catalog JSON into the products table."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_spec_value import ProductSpecValue
from app.models.spec_parameter import SpecParameter

CATALOG_PATH = Path(__file__).resolve().parents[2] / "data" / "equipment_catalog.json"
CATALOG_ID_START = 1000


def _catalog_enabled() -> bool:
    return os.getenv("SEED_EQUIPMENT_CATALOG", "1").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def load_equipment_catalog_document(path: Path | None = None) -> dict[str, Any]:
    catalog_path = path or CATALOG_PATH
    if not catalog_path.is_file():
        raise FileNotFoundError(f"Equipment catalog not found: {catalog_path}")
    return json.loads(catalog_path.read_text(encoding="utf-8"))


def _build_rules_json(item: dict[str, Any], price_list_date: str | None) -> str:
    payload = {
        "catalog": {
            "schema_version": 1,
            "article": item["article"],
            "type_code": item["type_code"],
            "type_label_ru": item.get("type_label_ru"),
            "type_label_en": item.get("type_label_en"),
            "section_title": item.get("section_title"),
            "service_tier": item.get("service_tier"),
            "service_for_article": item.get("service_for_article"),
            "configurator_eligible": item.get("configurator_eligible"),
            "service_attachable": item.get("service_attachable"),
            "price_list_date": price_list_date,
        }
    }
    return json.dumps(payload, ensure_ascii=False)


def _ensure_equipment_type_parameter(db: Session) -> int:
    row = db.query(SpecParameter).filter(SpecParameter.code == "equipment_type").first()
    if row is None:
        row = SpecParameter(
            code="equipment_type",
            name="Equipment type",
            sort_order=5,
            is_active=True,
        )
        db.add(row)
        db.flush()
    return row.id


def _set_spec_value(db: Session, product_id: int, parameter_id: int, value: str) -> None:
    search = value.lower()[:512]
    row = (
        db.query(ProductSpecValue)
        .filter(
            ProductSpecValue.product_id == product_id,
            ProductSpecValue.parameter_id == parameter_id,
        )
        .first()
    )
    if row is None:
        db.add(
            ProductSpecValue(
                product_id=product_id,
                parameter_id=parameter_id,
                value=value,
                value_search=search,
            )
        )
        return
    if row.value != value or row.value_search != search:
        row.value = value
        row.value_search = search


def seed_equipment_catalog(
    db: Session,
    *,
    path: Path | None = None,
    update_existing: bool = False,
) -> dict[str, int]:
    """
    Upsert catalog rows from backend/data/equipment_catalog.json.

    Products are keyed by article (stored in Product.name). Demo rows 501–504 are untouched.
    """
    document = load_equipment_catalog_document(path)
    products = document.get("products") or []
    price_list_date = document.get("price_list_date")
    type_param_id = _ensure_equipment_type_parameter(db)

    inserted = 0
    updated = 0
    skipped = 0
    next_id = CATALOG_ID_START

    existing_ids = {
        pid
        for (pid,) in db.query(Product.id).filter(Product.id >= CATALOG_ID_START).all()
    }
    while next_id in existing_ids:
        next_id += 1

    for item in products:
        article = str(item.get("article") or "").strip()
        if not article:
            skipped += 1
            continue

        row = db.query(Product).filter(Product.name == article).first()
        description = str(item.get("description") or "").strip()
        type_code = str(item.get("type_code") or "OTHER")
        type_label_ru = str(item.get("type_label_ru") or type_code)
        section_title = str(item.get("section_title") or "").strip()
        technical_specs = type_label_ru
        if section_title:
            technical_specs = f"{type_label_ru}. {section_title}"

        product_kind = str(item.get("product_kind") or "equipment")
        rules_json = _build_rules_json(item, price_list_date)

        if row is None:
            row = Product(
                id=next_id,
                name=article,
                description=description,
                technical_specs=technical_specs,
                product_kind=product_kind,
                product_category=type_code,
                rules_json=rules_json,
            )
            db.add(row)
            db.flush()
            existing_ids.add(next_id)
            next_id += 1
            while next_id in existing_ids:
                next_id += 1
            inserted += 1
        elif update_existing:
            row.description = description
            row.technical_specs = technical_specs
            row.product_kind = product_kind
            row.product_category = type_code
            row.rules_json = rules_json
            updated += 1
        else:
            skipped += 1

        _set_spec_value(db, row.id, type_param_id, type_code)

    db.flush()
    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "total_in_catalog": len(products),
    }


def maybe_seed_equipment_catalog(db: Session) -> dict[str, int] | None:
    if not _catalog_enabled():
        return None
    if not CATALOG_PATH.is_file():
        return None
    return seed_equipment_catalog(db)
