"""Helpers for VPS/VPSN service products linked to equipment articles."""

from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.product import Product


def parse_catalog_meta(product: Product | None) -> dict[str, Any] | None:
    if product is None:
        return None
    raw = getattr(product, "rules_json", None)
    if not raw:
        return None
    try:
        doc = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None
    if isinstance(doc, list):
        return None
    if not isinstance(doc, dict):
        return None
    catalog = doc.get("catalog")
    return catalog if isinstance(catalog, dict) else None


def equipment_article(product: Product) -> str:
    meta = parse_catalog_meta(product)
    if meta and meta.get("article"):
        return str(meta["article"]).strip()
    return (product.name or "").strip()


def is_service_attachable(product: Product) -> bool:
    meta = parse_catalog_meta(product)
    if meta is not None and "service_attachable" in meta:
        return bool(meta["service_attachable"])
    return False


def service_tier_for_product(product: Product) -> Optional[str]:
    meta = parse_catalog_meta(product)
    if not meta:
        return None
    tier = meta.get("service_tier")
    return str(tier) if tier else None


def service_for_article(product: Product) -> Optional[str]:
    meta = parse_catalog_meta(product)
    if not meta:
        return None
    val = meta.get("service_for_article")
    return str(val).strip() if val else None


def find_service_products_for_equipment(
    db: Session,
    equipment: Product,
) -> dict[str, Optional[Product]]:
    article = equipment_article(equipment)
    if not article:
        return {"standard": None, "extended": None}

    candidates = (
        db.query(Product)
        .filter(Product.product_category.in_(("VPS", "VPSN")))
        .all()
    )
    standard: Optional[Product] = None
    extended: Optional[Product] = None
    for row in candidates:
        if service_for_article(row) != article:
            continue
        tier = service_tier_for_product(row)
        if tier == "standard":
            standard = row
        elif tier == "extended":
            extended = row
    return {"standard": standard, "extended": extended}


def validate_service_addon(
    db: Session,
    equipment_product_id: int,
    service_product_id: int,
) -> tuple[bool, Optional[str]]:
    equipment = db.query(Product).filter(Product.id == equipment_product_id).first()
    if not equipment:
        return False, f"Unknown equipment product_id={equipment_product_id}"
    if not is_service_attachable(equipment):
        return False, f"Service is not available for «{equipment.name}»"

    service = db.query(Product).filter(Product.id == service_product_id).first()
    if not service:
        return False, f"Unknown service product_id={service_product_id}"

    tier = service_tier_for_product(service)
    if tier not in ("standard", "extended"):
        return False, "Selected row is not a standard or extended service product"

    linked = service_for_article(service)
    if linked != equipment_article(equipment):
        return (
            False,
            f"Service «{service.name}» does not match equipment «{equipment.name}»",
        )
    return True, None
