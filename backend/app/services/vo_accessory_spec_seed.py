"""Ensure VO accessory spec parameters exist and populate values from descriptions."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.spec_parameter import SpecParameter
from app.services.equipment_catalog_loader import _set_spec_value
from app.services.vo_accessory_parser import (
    VO_ACCESSORY_SPEC_PARAMETERS,
    VO_TYPE_CODE,
    parse_vo_accessory_description,
)


def ensure_vo_accessory_spec_parameters(db: Session) -> dict[str, int]:
    """Upsert VO accessory filter parameters."""
    code_to_id: dict[str, int] = {}
    for meta in VO_ACCESSORY_SPEC_PARAMETERS:
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


def refresh_vo_accessory_spec_values(db: Session) -> int:
    """Parse descriptions for all VO products and upsert structured spec values."""
    param_ids = ensure_vo_accessory_spec_parameters(db)
    updated = 0
    rows = (
        db.query(Product)
        .filter(Product.product_category == VO_TYPE_CODE)
        .all()
    )
    for product in rows:
        parsed = parse_vo_accessory_description(product.description or "")
        for code, param_id in param_ids.items():
            value = parsed.get(code)
            if value is None:
                continue
            _set_spec_value(db, product.id, param_id, value)
        updated += 1
    db.flush()
    return updated
