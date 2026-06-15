"""Seed catalog groups/subgroups and classify products into them."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.equipment_group import EquipmentGroup
from app.models.equipment_subgroup import EquipmentSubgroup
from app.models.product import Product
from app.services.service_catalog import parse_catalog_meta

# (group_code, group_name, sort_order, [(subgroup_code, subgroup_name, sort_order), ...])
CATALOG_GROUP_DEFINITIONS: list[tuple[str, str, int, list[tuple[str, str, int]]]] = [
    (
        "switches",
        "Коммутаторы",
        10,
        [
            ("equipment", "Оборудование", 10),
            ("accessories", "Аксессуры и оптика", 20),
            ("support", "Поддержка", 30),
        ],
    ),
    (
        "wifi",
        "Контроллер + точки бесп доступа",
        20,
        [
            ("equipment", "Оборудование", 10),
            ("certificates", "Сертификаты", 20),
            ("accessories", "Аксессуары", 30),
            ("support", "Поддержка", 40),
        ],
    ),
    (
        "load_balancer",
        "Балансировка трафика приложений",
        30,
        [
            ("equipment", "Оборудование", 10),
            ("support", "Поддержка", 20),
            ("accessories", "Аксессуары", 30),
        ],
    ),
    (
        "management",
        "Система управления и мониторинга",
        40,
        [
            ("equipment", "Оборудование", 10),
            ("certificates", "Сертификаты", 20),
            ("support", "Поддержка", 30),
        ],
    ),
    (
        "firewall",
        "Межсетевые экраны и маршрутизаторы",
        50,
        [
            ("equipment", "Оборудование", 10),
            ("certificates", "Сертификаты", 20),
            ("support", "Поддержка", 30),
        ],
    ),
    (
        "server",
        "Серверное оборудование",
        60,
        [
            ("equipment", "Оборудование", 10),
            ("support", "Поддержка", 20),
        ],
    ),
    (
        "telephony",
        "Телефония",
        70,
        [
            ("equipment", "Оборудование", 10),
            ("certificates", "Сертификаты", 20),
            ("support", "Поддержка", 30),
            ("licenses", "Лицензии", 40),
        ],
    ),
]

GROUPS_WITH_CERTIFICATES = frozenset(
    {"wifi", "management", "firewall", "telephony"}
)

_SECTION_GROUP_HINTS: tuple[tuple[str, str], ...] = (
    ("коммутатор", "switches"),
    ("switch", "switches"),
    ("wi-fi", "wifi"),
    ("беспровод", "wifi"),
    ("access point", "wifi"),
    ("network controller", "wifi"),
    ("балансир", "load_balancer"),
    ("управления и мониторинга", "management"),
    ("межсетев", "firewall"),
    ("маршрутизатор", "firewall"),
    ("серверное оборудование", "server"),
    ("телефон", "telephony"),
)

_TYPE_GROUP: dict[str, str] = {
    "VA": "switches",
    "VC": "switches",
    "VI": "switches",
    "VNC": "wifi",
    "VAP": "wifi",
    "VLB": "load_balancer",
    "VS": "management",
    "VFW": "firewall",
    "VSERVER": "server",
    "VCM": "telephony",
    "VP": "telephony",
}


def _detect_group_code(section: str, type_code: str, article: str) -> str | None:
    section_l = section.lower()
    for needle, code in _SECTION_GROUP_HINTS:
        if needle in section_l:
            return code
    if type_code in _TYPE_GROUP:
        return _TYPE_GROUP[type_code]
    art = (article or "").upper()
    if art.startswith("VO-VA") or art.startswith("VO-VC") or art.startswith("VO-VI"):
        return "switches"
    return None


def _detect_subgroup_code(
    *,
    section: str,
    type_code: str,
    description: str,
    service_tier: str | None,
    group_code: str | None,
) -> str:
    section_l = section.lower()
    desc_l = description.lower()

    if group_code == "telephony" and "лиценз" in desc_l:
        return "licenses"

    if "аксессуар" in section_l or (
        type_code == "VO" and group_code == "switches"
    ):
        return "accessories"

    if "гарантия + поддержка" in section_l:
        if group_code in GROUPS_WITH_CERTIFICATES:
            return "certificates"
        return "support"

    if "расширенная поддержка" in section_l or section_l.startswith("поддержка на"):
        return "support"

    if type_code in ("VPS", "VPSN"):
        if group_code in GROUPS_WITH_CERTIFICATES and service_tier == "standard":
            return "certificates"
        return "support"

    return "equipment"


def classify_product(product: Product) -> tuple[str | None, str]:
    meta = parse_catalog_meta(product) or {}
    section = str(meta.get("section_title") or "").strip()
    type_code = (product.product_category or meta.get("type_code") or "").upper()
    description = product.description or ""
    service_tier = meta.get("service_tier")
    group_code = _detect_group_code(section, type_code, product.name)
    subgroup_code = _detect_subgroup_code(
        section=section,
        type_code=type_code,
        description=description,
        service_tier=service_tier,
        group_code=group_code,
    )
    return group_code, subgroup_code


def ensure_catalog_groups(db: Session) -> dict[str, dict[str, int]]:
    """Upsert predefined groups/subgroups; return {(group_code, subgroup_code): subgroup_id}."""
    index: dict[str, dict[str, int]] = {}
    for group_code, group_name, group_sort, subgroups in CATALOG_GROUP_DEFINITIONS:
        group = db.query(EquipmentGroup).filter(EquipmentGroup.code == group_code).first()
        if group is None:
            group = EquipmentGroup(
                code=group_code,
                name=group_name,
                sort_order=group_sort,
                is_active=True,
            )
            db.add(group)
            db.flush()
        else:
            group.name = group_name
            group.sort_order = group_sort
            group.is_active = True

        index[group_code] = {}
        for sub_code, sub_name, sub_sort in subgroups:
            sub = (
                db.query(EquipmentSubgroup)
                .filter(
                    EquipmentSubgroup.group_id == group.id,
                    EquipmentSubgroup.code == sub_code,
                )
                .first()
            )
            if sub is None:
                sub = EquipmentSubgroup(
                    group_id=group.id,
                    code=sub_code,
                    name=sub_name,
                    sort_order=sub_sort,
                    is_active=True,
                )
                db.add(sub)
                db.flush()
            else:
                sub.name = sub_name
                sub.sort_order = sub_sort
                sub.is_active = True
            index[group_code][sub_code] = sub.id
    return index


def assign_products_to_subgroups(db: Session, *, force: bool = False) -> dict[str, int]:
    """Map products to subgroups using catalog metadata heuristics."""
    subgroup_index = ensure_catalog_groups(db)
    flat_index: dict[tuple[str, str], int] = {}
    for group_code, subs in subgroup_index.items():
        for sub_code, sub_id in subs.items():
            flat_index[(group_code, sub_code)] = sub_id

    stats = {"assigned": 0, "skipped": 0, "unmapped": 0}
    products = db.query(Product).all()
    for product in products:
        if product.subgroup_id is not None and not force:
            stats["skipped"] += 1
            continue
        group_code, subgroup_code = classify_product(product)
        if not group_code:
            stats["unmapped"] += 1
            continue
        sub_id = flat_index.get((group_code, subgroup_code))
        if sub_id is None:
            stats["unmapped"] += 1
            continue
        product.subgroup_id = sub_id
        stats["assigned"] += 1
    return stats


def subgroup_product_counts(db: Session) -> dict[int, int]:
    rows = (
        db.query(Product.subgroup_id, func.count(Product.id))
        .filter(Product.subgroup_id.isnot(None))
        .group_by(Product.subgroup_id)
        .all()
    )
    return {int(sid): int(cnt) for sid, cnt in rows if sid is not None}
