from typing import List, Tuple, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.compatibility_rule import CompatibilityRule
from app.models.module import Module
from app.models.product import Product


def is_configuration_compatible(
    db: Session,
    selected_item_ids: List[int],
) -> Tuple[bool, Optional[str]]:
    """
    Простая проверка совместимости конфигурации.

    Сейчас логика максимально примитивная:
    - в таблице compatibility_rules администратор хранит правила с rule_type = "forbidden"
      для модулей/продуктов, которые нельзя использовать;
    - если в конфигурации есть product или module, для которого есть такое правило,
      конфигурация считается несовместимой.

    В дальнейшем администратор сможет менять данные в таблице compatibility_rules
    (через админку/скрипты) без изменений кода.
    """

    if not selected_item_ids:
        return True, None

    # Determine which ids represent products vs modules.
    # This prevents false matches when the UI sends only product ids.
    product_ids = [pid for (pid,) in db.query(Product.id).filter(Product.id.in_(selected_item_ids)).all()]
    module_ids = [mid for (mid,) in db.query(Module.id).filter(Module.id.in_(selected_item_ids)).all()]

    conds = []
    if product_ids:
        conds.append(CompatibilityRule.product_id.in_(product_ids))
    if module_ids:
        conds.append(CompatibilityRule.module_id.in_(module_ids))

    # If none of the ids map to known entities that participate in compatibility rules,
    # treat configuration as compatible.
    if not conds:
        return True, None

    forbidden_rules = (
        db.query(CompatibilityRule)
        .filter(CompatibilityRule.rule_type == "forbidden", or_(*conds))
        .all()
    )

    if forbidden_rules:
        # Keep message client-friendly; include some details for easier debugging.
        forbidden_rule_ids = [r.id for r in forbidden_rules]
        forbidden_product_ids = sorted({r.product_id for r in forbidden_rules if r.product_id is not None})
        forbidden_module_ids = sorted({r.module_id for r in forbidden_rules if r.module_id is not None})

        base = "Конфигурация содержит несовместимые позиции"
        segments = []
        if forbidden_product_ids:
            segments.append(f"forbidden_product_ids={forbidden_product_ids}")
        if forbidden_module_ids:
            segments.append(f"forbidden_module_ids={forbidden_module_ids}")
        segments.append(f"forbidden_rule_ids={forbidden_rule_ids}")

        return False, base + " (" + "; ".join(segments) + ")"

    return True, None

