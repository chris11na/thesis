from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.license import License
from app.models.module import Module
from app.models.product import Product
from app.services.product_rules_runtime import (
    effective_built_in_license_units,
    effective_max_module_slots,
    effective_speed_allowlist,
)


class AddonLineData:
    __slots__ = ("module_id", "license_id", "quantity")

    def __init__(
        self,
        module_id: Optional[int],
        license_id: Optional[int],
        quantity: int,
    ):
        self.module_id = module_id
        self.license_id = license_id
        self.quantity = quantity


class EquipmentLineData:
    __slots__ = ("equipment_product_id", "target_ap_count", "addons")

    def __init__(
        self,
        equipment_product_id: int,
        target_ap_count: Optional[int],
        addons: List[AddonLineData],
    ):
        self.equipment_product_id = equipment_product_id
        self.target_ap_count = target_ap_count
        self.addons = addons


def validate_structured_lines(
    db: Session,
    lines: List[EquipmentLineData],
) -> Tuple[bool, Optional[str]]:
    for line in lines:
        product = (
            db.query(Product).filter(Product.id == line.equipment_product_id).first()
        )
        if not product:
            return False, f"Unknown equipment product_id={line.equipment_product_id}"

        supported_speeds, _ = effective_speed_allowlist(product)
        module_qty_sum = 0

        for addon in line.addons:
            if addon.module_id is not None and addon.license_id is not None:
                return False, "Each addon must set only module_id or license_id, not both"
            if addon.module_id is None and addon.license_id is None:
                return False, "Each addon must set module_id or license_id"
            if addon.quantity < 1:
                return False, "Addon quantity must be at least 1"

            if addon.module_id is not None:
                mod = db.query(Module).filter(Module.id == addon.module_id).first()
                if not mod or mod.product_id != line.equipment_product_id:
                    return (
                        False,
                        f"Module {addon.module_id} does not belong to "
                        f"product {line.equipment_product_id}",
                    )
                if supported_speeds is not None:
                    if mod.speed_gbps is not None and mod.speed_gbps not in supported_speeds:
                        return (
                            False,
                            f"Module «{mod.name}» ({mod.speed_gbps} Gbps) is not supported "
                            f"for this equipment (allowed: {supported_speeds} Gbps)",
                        )
                if mod.max_quantity is not None and addon.quantity > mod.max_quantity:
                    return (
                        False,
                        f"Module «{mod.name}»: quantity {addon.quantity} exceeds max "
                        f"{mod.max_quantity}",
                    )
                module_qty_sum += addon.quantity

            if addon.license_id is not None:
                lic = db.query(License).filter(License.id == addon.license_id).first()
                if not lic or lic.product_id != line.equipment_product_id:
                    return (
                        False,
                        f"License {addon.license_id} does not belong to "
                        f"product {line.equipment_product_id}",
                    )

        max_slots, _ = effective_max_module_slots(product)
        if max_slots is not None and module_qty_sum > max_slots:
            return (
                False,
                f"Too many modules for product «{product.name}»: "
                f"{module_qty_sum} > max {max_slots} slots",
            )

        if line.target_ap_count is not None:
            if line.target_ap_count < 1:
                return False, "target_ap_count must be a positive integer"
            built_raw, _ = effective_built_in_license_units(product)
            built = built_raw if built_raw is not None else 0
            extra = 0
            for addon in line.addons:
                if addon.license_id is None:
                    continue
                lic = db.query(License).filter(License.id == addon.license_id).first()
                if lic:
                    extra += addon.quantity * lic.units_per_pack
            total = built + extra
            if total < line.target_ap_count:
                return (
                    False,
                    f"AP license capacity insufficient for «{product.name}»: "
                    f"built-in {built} + add-on packs {extra} = {total}, "
                    f"need >= {line.target_ap_count}",
                )

    return True, None


def _merge_suggestion_rows_by_license_id(suggestion: List[dict]) -> List[dict]:
    """Sum quantities when the same license_id appears twice (greedy + remainder step)."""
    by_id: Dict[int, dict] = {}
    order: List[int] = []
    for row in suggestion:
        lid = int(row["license_id"])
        if lid not in by_id:
            by_id[lid] = {
                "license_id": lid,
                "name": row["name"],
                "quantity": 0,
                "units_per_pack": row["units_per_pack"],
            }
            order.append(lid)
        by_id[lid]["quantity"] += int(row["quantity"])
    return [by_id[i] for i in order]


def suggest_license_packs(
    db: Session,
    product_id: int,
    target_ap_count: int,
) -> Tuple[Optional[dict], Optional[str]]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None, "Product not found"
    if target_ap_count < 1:
        return None, "target_ap_count must be positive"

    licenses = (
        db.query(License)
        .filter(License.product_id == product_id)
        .order_by(License.units_per_pack.desc())
        .all()
    )
    if not licenses:
        return None, "No license packs defined for this product"

    built_raw, _ = effective_built_in_license_units(product)
    built = built_raw if built_raw is not None else 0
    need = max(0, target_ap_count - built)

    packs = sorted(
        [(lic.id, lic.name, lic.units_per_pack) for lic in licenses if lic.units_per_pack > 0],
        key=lambda x: -x[2],
    )
    if not packs:
        return None, "No license packs with units_per_pack > 0"

    remaining = need
    suggestion: List[dict] = []
    for lic_id, name, units in packs:
        if remaining <= 0:
            break
        n = remaining // units
        if n > 0:
            suggestion.append(
                {"license_id": lic_id, "name": name, "quantity": n, "units_per_pack": units}
            )
            remaining -= n * units
    if remaining > 0:
        # Greedy remainder: one more smallest pack that fits (by smallest units first)
        small = sorted(packs, key=lambda x: x[2])
        for lic_id, name, units in small:
            if units >= remaining:
                suggestion.append(
                    {
                        "license_id": lic_id,
                        "name": name,
                        "quantity": 1,
                        "units_per_pack": units,
                    }
                )
                remaining = 0
                break

    suggestion = _merge_suggestion_rows_by_license_id(suggestion)

    if remaining > 0:
        return (
            {
                "built_in_license_units": built,
                "target_ap_count": target_ap_count,
                "needed_extra_units": need,
                "suggestion": suggestion,
                "residual_units_short": remaining,
                "note": "Cannot reach target with discrete pack sizes; increase packs or target.",
            },
            None,
        )

    return (
        {
            "built_in_license_units": built,
            "target_ap_count": target_ap_count,
            "needed_extra_units": need,
            "suggestion": suggestion,
            "residual_units_short": 0,
        },
        None,
    )
