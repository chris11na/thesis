"""Helpers for VPS/VPSN service products linked to equipment articles."""

from __future__ import annotations

import json
import re
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.product import Product
from app.services.switch_spec_parser import SWITCH_TYPE_CODES, parse_switch_description


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


def parse_support_duration(description: str | None) -> Optional[str]:
    """Extract human-readable support term, e.g. «1 год» from catalog description."""
    if not description:
        return None
    text = description.strip()
    m = re.search(
        r"на\s+(\d+)\s+(год|года|лет|year|years|month|months|мес(?:яц|яца|яцев)?)",
        text,
        flags=re.IGNORECASE,
    )
    if not m:
        return None
    return f"{m.group(1)} {m.group(2).lower()}"


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


_VO_SPEED_PREFIXES: dict[str, str] = {
    "1g": "vo-1g-",
    "10g": "vo-10g-",
    "25g": "vo-25g-",
    "40g": "vo-40g-",
    "100g": "vo-100g-",
}

_VO_COMBO_ARTICLE_PREFIXES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("vo-40g10-", ("40g", "10g")),
    ("vo-100g25-", ("100g", "25g")),
)


def _optic_speeds_from_switch_description(description: str) -> set[str]:
    """Infer supported optic speeds from a switch catalog description."""
    text = (description or "").lower()
    speeds: set[str] = set()
    if re.search(r"100\s*gb", text):
        speeds.add("100g")
    if re.search(r"40\s*gb", text):
        speeds.add("40g")
    if re.search(r"25\s*gb", text):
        speeds.add("25g")
    if re.search(r"10\s*gb|10ge", text):
        speeds.add("10g")
    if re.search(r"1\s*gb|1ge|1/10", text):
        speeds.add("1g")
    return speeds


def _vo_name_matches_switch_speeds(name: str, speeds: set[str]) -> bool:
    lowered = (name or "").lower()
    if lowered.startswith("vo-pwr-"):
        return True
    for article_prefix, combo_speeds in _VO_COMBO_ARTICLE_PREFIXES:
        if lowered.startswith(article_prefix):
            return bool(speeds.intersection(combo_speeds))
    for speed in speeds:
        prefix = _VO_SPEED_PREFIXES.get(speed)
        if prefix and lowered.startswith(prefix):
            return True
    return False


def _optic_ports_from_switch(equipment: Product) -> int:
    parsed = parse_switch_description(equipment.description or "")
    try:
        return max(0, int(parsed.get("optic_ports") or 0))
    except (TypeError, ValueError):
        return 0


def suggested_accessory_quantity(equipment: Product, accessory: Product) -> int:
    """Per switch unit: optic items match port count; power cables default to a pair."""
    article = equipment_article(accessory).lower()
    if article.startswith("vo-pwr-"):
        return 2
    optic_ports = _optic_ports_from_switch(equipment)
    if optic_ports > 0:
        return optic_ports
    return 1


def find_accessory_products_for_equipment(
    db: Session,
    equipment: Product,
    *,
    limit: int = 30,
) -> list[Product]:
    """VO optics/accessories compatible with a switch by port speed."""
    category = (equipment.product_category or "").upper()
    kind = (equipment.product_kind or "").strip().lower()
    if category == "VO" or kind == "accessory":
        return []
    if category not in SWITCH_TYPE_CODES:
        return []

    speeds = _optic_speeds_from_switch_description(equipment.description or "")
    if not speeds:
        return []

    rows = (
        db.query(Product)
        .filter(Product.product_category == "VO", Product.id != equipment.id)
        .order_by(Product.name, Product.id)
        .all()
    )
    matched = [
        row
        for row in rows
        if _vo_name_matches_switch_speeds(equipment_article(row), speeds)
    ]
    return matched[:limit]


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
