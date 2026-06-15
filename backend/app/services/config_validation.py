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
from app.services.service_catalog import validate_service_addon


class AddonLineData:
    __slots__ = ("module_id", "license_id", "service_product_id", "quantity")

    def __init__(
        self,
        module_id: Optional[int],
        license_id: Optional[int],
        quantity: int,
        service_product_id: Optional[int] = None,
    ):
        self.module_id = module_id
        self.license_id = license_id
        self.service_product_id = service_product_id
        self.quantity = quantity


class EquipmentLineData:
    __slots__ = ("equipment_product_id", "target_ap_count", "quantity", "addons")

    def __init__(
        self,
        equipment_product_id: int,
        target_ap_count: Optional[int],
        addons: List[AddonLineData],
        quantity: int = 1,
    ):
        self.equipment_product_id = equipment_product_id
        self.target_ap_count = target_ap_count
        self.quantity = quantity
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
        if line.quantity < 1:
            return False, "Equipment quantity must be at least 1"

        supported_speeds, _ = effective_speed_allowlist(product)
        module_qty_sum = 0

        for addon in line.addons:
            set_parts = sum(
                1
                for x in (addon.module_id, addon.license_id, addon.service_product_id)
                if x is not None
            )
            if set_parts != 1:
                return (
                    False,
                    "Each addon must set exactly one of module_id, license_id, or service_product_id",
                )
            if addon.quantity < 1:
                return False, "Addon quantity must be at least 1"

            if addon.service_product_id is not None:
                ok_svc, svc_reason = validate_service_addon(
                    db, line.equipment_product_id, addon.service_product_id
                )
                if not ok_svc:
                    return False, svc_reason or "Invalid service addon"
                continue

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
                continue

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


def _pack_combo_to_suggestion(
    combo: Dict[int, int],
    pack_meta: Dict[int, tuple],
) -> List[dict]:
    suggestion: List[dict] = []
    for lic_id, qty in combo.items():
        if qty <= 0:
            continue
        name, units = pack_meta[lic_id]
        suggestion.append(
            {
                "license_id": lic_id,
                "name": name,
                "quantity": qty,
                "units_per_pack": units,
            }
        )
    return suggestion


def _optimal_license_pack_combo(
    need: int,
    packs: List[tuple],
) -> tuple[List[dict], int]:
    """
    Minimize number of physical packs, then overage.
    packs: [(license_id, name, units_per_pack), ...]
    """
    if need <= 0:
        return [], 0
    if not packs:
        return [], need

    max_units = max(units for _, _, units in packs)
    limit = need + max_units
    pack_meta = {lic_id: (name, units) for lic_id, name, units in packs}

    inf = 10**9
    best_count = [inf] * (limit + 1)
    best_combo: List[Optional[Dict[int, int]]] = [None] * (limit + 1)
    best_count[0] = 0
    best_combo[0] = {}

    for total in range(limit + 1):
        if best_combo[total] is None:
            continue
        for lic_id, _name, units in packs:
            nxt = total + units
            if nxt > limit:
                continue
            nxt_count = best_count[total] + 1
            if nxt_count > best_count[nxt]:
                continue
            if nxt_count == best_count[nxt] and nxt < need:
                continue
            merged = dict(best_combo[total] or {})
            merged[lic_id] = merged.get(lic_id, 0) + 1
            best_count[nxt] = nxt_count
            best_combo[nxt] = merged

    chosen_total = None
    chosen_score = (inf, inf)
    for total in range(need, limit + 1):
        if best_combo[total] is None:
            continue
        score = (best_count[total], total - need)
        if score < chosen_score:
            chosen_score = score
            chosen_total = total

    if chosen_total is None:
        return [], need

    combo = best_combo[chosen_total] or {}
    return _pack_combo_to_suggestion(combo, pack_meta), 0


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

    suggestion, remaining = _optimal_license_pack_combo(need, packs)
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
