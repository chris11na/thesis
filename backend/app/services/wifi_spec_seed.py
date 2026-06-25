"""Ensure Wi-Fi catalog filter parameters exist and populate spec values."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.models.equipment_group import EquipmentGroup
from app.models.equipment_subgroup import EquipmentSubgroup
from app.models.license import License
from app.models.product import Product
from app.models.spec_parameter import SpecParameter
from app.services.equipment_catalog_loader import _set_spec_value
from app.services.service_catalog import parse_catalog_meta
from app.services.wifi_accessory_parser import (
    WIFI_ACCESSORY_SPEC_PARAMETERS,
    parse_wifi_accessory_product,
)
from app.services.wifi_equipment_parser import (
    WIFI_EQUIPMENT_SPEC_PARAMETERS,
    WIFI_EQUIPMENT_TYPE_CODES,
    parse_wifi_equipment_product,
)

WIFI_SUPPORT_SPEC_PARAMETERS: list[dict[str, Any]] = [
    {"code": "support_tier", "name": "Уровень сервиса (VPS / VPSN)", "sort_order": 10},
]

_BUILTIN_AP_RE = re.compile(
    r"(\d+)\s+точ(?:ек|ки|ка)\s+доступа\s+по-умолчанию",
    re.IGNORECASE,
)

_WIFI_LICENSE_PACKS: tuple[tuple[int, str], ...] = (
    (16, "AP licenses, pack x16"),
    (32, "AP licenses, pack x32"),
    (128, "AP licenses, pack x128"),
)


def _ensure_parameters(db: Session, metas: list[dict[str, Any]]) -> dict[str, int]:
    code_to_id: dict[str, int] = {}
    for meta in metas:
        code = meta["code"]
        row = db.query(SpecParameter).filter(SpecParameter.code == code).first()
        if row is None:
            row = SpecParameter(
                code=code,
                name=meta["name"],
                sort_order=meta["sort_order"],
                is_active=True,
            )
            db.add(row)
            db.flush()
        else:
            row.name = meta["name"]
            row.sort_order = meta["sort_order"]
            row.is_active = True
        code_to_id[code] = row.id
    db.flush()
    return code_to_id


def _wifi_product_ids(db: Session) -> set[int]:
    rows = (
        db.query(Product.id)
        .join(EquipmentSubgroup, EquipmentSubgroup.id == Product.subgroup_id)
        .join(EquipmentGroup, EquipmentGroup.id == EquipmentSubgroup.group_id)
        .filter(EquipmentGroup.code == "wifi")
        .all()
    )
    return {int(pid) for (pid,) in rows}


def refresh_wifi_spec_values(db: Session) -> int:
    """Parse Wi-Fi catalog rows and upsert structured filter spec values."""
    param_ids = _ensure_parameters(
        db,
        WIFI_EQUIPMENT_SPEC_PARAMETERS
        + WIFI_ACCESSORY_SPEC_PARAMETERS
        + WIFI_SUPPORT_SPEC_PARAMETERS,
    )
    updated = 0
    wifi_ids = _wifi_product_ids(db)
    if not wifi_ids:
        return 0

    for product in db.query(Product).filter(Product.id.in_(wifi_ids)).all():
        meta = parse_catalog_meta(product) or {}
        section = str(meta.get("section_title") or "")
        section_l = section.lower()
        category = (product.product_category or "").upper()

        parsed: dict[str, str] = {}
        if "аксессуар" in section_l and category == "VAP":
            parsed = parse_wifi_accessory_product(
                name=product.name or "",
                description=product.description or "",
            )
        elif category in WIFI_EQUIPMENT_TYPE_CODES:
            parsed = parse_wifi_equipment_product(
                name=product.name or "",
                description=product.description or "",
                product_category=category,
                section_title=section,
            )
        elif category in ("VPS", "VPSN"):
            tier_val = str(meta.get("service_tier") or "").strip().lower()
            if tier_val in ("standard", "extended"):
                parsed = {"support_tier": tier_val}

        for code, param_id in param_ids.items():
            value = parsed.get(code)
            if value is None:
                continue
            _set_spec_value(db, product.id, param_id, value)
        if parsed:
            updated += 1

    db.flush()
    return updated


def seed_wifi_controller_license_packs(db: Session) -> int:
    """Attach discrete license pack rows to Wi-Fi controller products from catalog."""
    created = 0
    wifi_ids = _wifi_product_ids(db)
    if not wifi_ids:
        return 0

    for product in db.query(Product).filter(Product.id.in_(wifi_ids)).all():
        meta = parse_catalog_meta(product) or {}
        section = str(meta.get("section_title") or "")
        parsed = parse_wifi_equipment_product(
            name=product.name or "",
            description=product.description or "",
            product_category=(product.product_category or "").upper(),
            section_title=section,
        )
        if parsed.get("wifi_device_type") != "controller":
            continue

        if product.built_in_license_units is None:
            match = _BUILTIN_AP_RE.search(product.description or "")
            if match:
                product.built_in_license_units = int(match.group(1))

        has_licenses = (
            db.query(License.id).filter(License.product_id == product.id).first()
            is not None
        )
        if has_licenses:
            continue

        for units, name in _WIFI_LICENSE_PACKS:
            db.add(
                License(
                    name=name,
                    product_id=product.id,
                    units_per_pack=units,
                )
            )
            created += 1

    db.flush()
    return created
