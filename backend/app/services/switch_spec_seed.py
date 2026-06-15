"""Ensure switch spec parameters exist and populate values from product descriptions."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.spec_parameter import SpecParameter
from app.services.equipment_catalog_loader import _set_spec_value
from app.services.switch_spec_parser import (
    SWITCH_SPEC_PARAMETERS,
    SWITCH_TYPE_CODES,
    parse_switch_description,
)


def ensure_switch_spec_parameters(db: Session) -> dict[str, int]:
    """Upsert switch filter parameters; deactivate legacy equipment_type filter param."""
    code_to_id: dict[str, int] = {}
    for meta in SWITCH_SPEC_PARAMETERS:
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

    legacy = db.query(SpecParameter).filter(SpecParameter.code == "equipment_type").first()
    if legacy is not None:
        legacy.is_active = False

    db.flush()
    return code_to_id


def refresh_switch_spec_values(db: Session) -> int:
    """Parse descriptions for all switch products and upsert structured spec values."""
    param_ids = ensure_switch_spec_parameters(db)
    updated = 0
    rows = (
        db.query(Product)
        .filter(Product.product_category.in_(sorted(SWITCH_TYPE_CODES)))
        .all()
    )
    for product in rows:
        parsed = parse_switch_description(product.description or "")
        for code, param_id in param_ids.items():
            value = parsed.get(code)
            if value is None:
                continue
            _set_spec_value(db, product.id, param_id, value)
        updated += 1
    db.flush()
    return updated
