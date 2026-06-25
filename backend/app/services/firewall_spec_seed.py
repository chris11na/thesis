"""Ensure firewall catalog filter parameters exist and populate spec values."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.equipment_group import EquipmentGroup
from app.models.equipment_subgroup import EquipmentSubgroup
from app.models.product import Product
from app.models.spec_parameter import SpecParameter
from app.services.equipment_catalog_loader import _set_spec_value
from app.services.service_catalog import parse_catalog_meta
from app.services.vfw_equipment_parser import (
    VFW_EQUIPMENT_SPEC_PARAMETERS,
    VFW_TYPE_CODE,
    parse_vfw_equipment_product,
)

SUPPORT_TIER_SPEC_PARAMETERS = [
    {"code": "support_tier", "name": "Уровень сервиса (VPS / VPSN)", "sort_order": 10},
]


def _ensure_parameters(db: Session, metas: list[dict]) -> dict[str, int]:
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


def _firewall_product_ids(db: Session) -> set[int]:
    rows = (
        db.query(Product.id)
        .join(EquipmentSubgroup, EquipmentSubgroup.id == Product.subgroup_id)
        .join(EquipmentGroup, EquipmentGroup.id == EquipmentSubgroup.group_id)
        .filter(EquipmentGroup.code == "firewall")
        .all()
    )
    return {int(pid) for (pid,) in rows}


def refresh_firewall_spec_values(db: Session) -> int:
    """Parse firewall catalog rows and upsert structured filter spec values."""
    param_ids = _ensure_parameters(
        db, VFW_EQUIPMENT_SPEC_PARAMETERS + SUPPORT_TIER_SPEC_PARAMETERS
    )
    updated = 0
    product_ids = _firewall_product_ids(db)
    if not product_ids:
        return 0

    for product in db.query(Product).filter(Product.id.in_(product_ids)).all():
        category = (product.product_category or "").upper()
        parsed: dict[str, str] = {}
        if category == VFW_TYPE_CODE:
            parsed = parse_vfw_equipment_product(
                name=product.name or "",
                description=product.description or "",
            )
        elif category in ("VPS", "VPSN"):
            tier_val = str((parse_catalog_meta(product) or {}).get("service_tier") or "").strip().lower()
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
