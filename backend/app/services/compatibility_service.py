from itertools import combinations
from typing import List, Tuple, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.compatibility_rule import CompatibilityRule
from app.models.module import Module
from app.models.product import Product
from app.models.product_incompatible_pair import ProductIncompatiblePair


def is_configuration_compatible_typed(
    db: Session,
    *,
    root_product_ids: List[int],
    module_ids: List[int],
) -> Tuple[bool, Optional[str]]:
    """
    Same as legacy flat check, but product vs module ids are explicit (no id-space collisions).
    """
    if not root_product_ids and not module_ids:
        return True, None

    conds = []
    if root_product_ids:
        conds.append(CompatibilityRule.product_id.in_(root_product_ids))
    if module_ids:
        conds.append(CompatibilityRule.module_id.in_(module_ids))

    if conds:
        forbidden_rules = (
            db.query(CompatibilityRule)
            .filter(CompatibilityRule.rule_type == "forbidden", or_(*conds))
            .all()
        )

        if forbidden_rules:
            forbidden_rule_ids = [r.id for r in forbidden_rules]
            forbidden_product_ids = sorted(
                {r.product_id for r in forbidden_rules if r.product_id is not None}
            )
            forbidden_module_ids = sorted(
                {r.module_id for r in forbidden_rules if r.module_id is not None}
            )

            base = "Конфигурация содержит несовместимые позиции"
            segments = []
            if forbidden_product_ids:
                segments.append(f"forbidden_product_ids={forbidden_product_ids}")
            if forbidden_module_ids:
                segments.append(f"forbidden_module_ids={forbidden_module_ids}")
            segments.append(f"forbidden_rule_ids={forbidden_rule_ids}")

            return False, base + " (" + "; ".join(segments) + ")"

    distinct_products = sorted(set(root_product_ids))
    for a, b in combinations(distinct_products, 2):
        lo, hi = (a, b) if a < b else (b, a)
        hit = (
            db.query(ProductIncompatiblePair)
            .filter(
                ProductIncompatiblePair.product_smaller_id == lo,
                ProductIncompatiblePair.product_larger_id == hi,
            )
            .first()
        )
        if hit:
            return (
                False,
                f"Конфигурация содержит несовместимую пару продуктов (id {a} и {b})",
            )

    return True, None


def is_configuration_compatible(
    db: Session,
    selected_item_ids: List[int],
) -> Tuple[bool, Optional[str]]:
    """
    Legacy: a single int list may refer to products, modules, or licenses.
    Classify ids by membership in products vs modules tables.
    """
    if not selected_item_ids:
        return True, None

    root_product_ids = [
        pid
        for (pid,) in db.query(Product.id)
        .filter(Product.id.in_(selected_item_ids))
        .all()
    ]
    module_ids = [
        mid
        for (mid,) in db.query(Module.id)
        .filter(Module.id.in_(selected_item_ids))
        .all()
    ]

    return is_configuration_compatible_typed(
        db, root_product_ids=root_product_ids, module_ids=module_ids
    )
