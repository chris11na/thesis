import os

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.compatibility_rule import CompatibilityRule
from app.models.configuration_item import ConfigurationItem
from app.models.license import License
from app.models.module import Module
from app.models.product import Product
from app.models.product_incompatible_pair import ProductIncompatiblePair
from app.models.role import Role
from app.models.user import User
from app.core.security import hash_password, is_supported_password_hash


def _product_unused_in_configs(db: Session, product_id: int) -> bool:
    return (
        db.query(ConfigurationItem)
        .filter(
            (ConfigurationItem.product_id == product_id)
            | (ConfigurationItem.parent_product_id == product_id)
        )
        .first()
        is None
    )


def _delete_product_and_children(db: Session, product_id: int) -> None:
    module_ids = [
        mid
        for (mid,) in db.query(Module.id).filter(Module.product_id == product_id).all()
    ]
    if module_ids:
        db.query(CompatibilityRule).filter(
            CompatibilityRule.module_id.in_(module_ids)
        ).delete(synchronize_session=False)
    db.query(ProductIncompatiblePair).filter(
        or_(
            ProductIncompatiblePair.product_smaller_id == product_id,
            ProductIncompatiblePair.product_larger_id == product_id,
        )
    ).delete(synchronize_session=False)
    db.query(CompatibilityRule).filter(CompatibilityRule.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(Module).filter(Module.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(License).filter(License.product_id == product_id).delete(
        synchronize_session=False
    )
    db.query(Product).filter(Product.id == product_id).delete(synchronize_session=False)


def _remove_legacy_demo_products(db: Session) -> None:
    """
    Older seeds used product ids 201/202 for the same demo names. Current demo uses 501/502.
    """
    for pid in (201, 202):
        if db.query(Product).filter(Product.id == pid).first() is None:
            continue
        if not _product_unused_in_configs(db, pid):
            continue
        _delete_product_and_children(db, pid)
    db.flush()


def _dedupe_demo_products_by_canonical_name(db: Session) -> None:
    """
    Same display name as seeded demos (e.g. admin re-created product) -> drop extras.
    Keeps canonical ids 501 / 502 when present; otherwise keeps the lowest id.
    Only removes rows not referenced by configuration_items.
    """
    demo_pairs = [
        ("Контроллер БЛВС (демо)", 501),
        ("Коммутатор L2/L3 (демо)", 502),
    ]
    for name, canonical_id in demo_pairs:
        rows = (
            db.query(Product)
            .filter(Product.name == name)
            .order_by(Product.id)
            .all()
        )
        if len(rows) <= 1:
            continue
        ids = [r.id for r in rows]
        keeper_id = canonical_id if canonical_id in ids else min(ids)
        for r in rows:
            if r.id == keeper_id:
                continue
            if not _product_unused_in_configs(db, r.id):
                continue
            _delete_product_and_children(db, r.id)
    db.flush()


def _seed_demo_equipment(db: Session) -> None:
    """Demo products for thesis: WLAN controller + license packs, switch + optics."""
    _remove_legacy_demo_products(db)
    # Use high ids to avoid collisions with modules/licenses in flat compatibility checks.
    if db.query(Product).filter(Product.id == 501).first() is None:
        db.add(
            Product(
                id=501,
                name="Контроллер БЛВС (демо)",
                description="Управление точками доступа; лицензирование по числу AP.",
                technical_specs="Встроенно поддерживается 16 AP; остальное — пакетами лицензий.",
                product_kind="equipment",
                product_category="controller",
                built_in_license_units=16,
                module_speeds_json=None,
                max_module_slots=None,
            )
        )
        db.add(
            Product(
                id=502,
                name="Коммутатор L2/L3 (демо)",
                description="Оптические модули только совместимых скоростей для этого шасси.",
                technical_specs="До 8 модулей SFP/SFP+; поддерживаются только 1 и 10 Гбит/с.",
                product_kind="equipment",
                product_category="switch",
                built_in_license_units=None,
                module_speeds_json="[1, 10]",
                max_module_slots=8,
            )
        )
        db.flush()

        for lid, lname, units in [
            (521, "Лицензии AP, пакет ×16", 16),
            (522, "Лицензии AP, пакет ×32", 32),
            (523, "Лицензии AP, пакет ×128", 128),
        ]:
            if db.query(License).filter(License.id == lid).first() is None:
                db.add(
                    License(id=lid, name=lname, product_id=501, units_per_pack=units)
                )

        for mid, mname, speed, ff, mx in [
            (511, "Трансивер 1G SFP", 1, "SFP", 8),
            (512, "Трансивер 10G SFP+", 10, "SFP+", 8),
            (513, "Трансивер 25G SFP28 (не для этого коммутатора)", 25, "SFP28", 8),
        ]:
            if db.query(Module).filter(Module.id == mid).first() is None:
                db.add(
                    Module(
                        id=mid,
                        name=mname,
                        product_id=502,
                        speed_gbps=speed,
                        form_factor=ff,
                        max_quantity=mx,
                    )
                )

    # Run every startup: early return used to skip this and left admin/duplicate rows.
    _dedupe_demo_products_by_canonical_name(db)


def seed_initial_data(db: Session) -> None:
    """
    Seed minimal data for the frontend prototype.

    Inserts roles, company, users, demo equipment (501/502 + modules/licenses),
    and optional demo user.
    """

    # Roles
    if db.query(Role).filter(Role.id == 1).first() is None:
        db.add(Role(id=1, name="admin"))
    if db.query(Role).filter(Role.id == 2).first() is None:
        db.add(Role(id=2, name="user"))
    if db.query(Role).filter(Role.id == 3).first() is None:
        db.add(Role(id=3, name="guest"))

    # Company
    if db.query(Company).filter(Company.id == 1).first() is None:
        db.add(Company(id=1, name="Default Company", domain="example.com"))

    db.flush()

    # Default admin credentials for local dev:
    # email=admin@example.com, password=admin123
    admin_user = db.query(User).filter(User.id == 1).first()
    if admin_user is None:
        db.add(
            User(
                id=1,
                name="Prototype Admin",
                email="admin@example.com",
                password_hash=hash_password("admin123"),
                role_id=1,
                company_id=1,
            )
        )
    elif not is_supported_password_hash(admin_user.password_hash):
        admin_user.password_hash = hash_password("admin123")

    # Optional end-user for local UI / Playwright (set SEED_DEMO_USER=0 for admin-only seed).
    _seed_demo = os.getenv("SEED_DEMO_USER", "1").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    if _seed_demo:
        # Demo user: match by email first (id=2 may be missing or reused in old DBs).
        demo_mail = "user@example.com"
        by_email = (
            db.query(User)
            .filter(func.lower(func.trim(User.email)) == demo_mail)
            .first()
        )
        by_id2 = db.query(User).filter(User.id == 2).first()
        if by_email is not None:
            by_email.password_hash = hash_password("user123")
            by_email.role_id = 2
            by_email.company_id = 1
            by_email.name = by_email.name or "Prototype User"
            em = by_email.email.strip().lower()
            if by_email.email != em:
                by_email.email = em
        elif by_id2 is not None:
            by_id2.email = demo_mail
            by_id2.name = "Prototype User"
            by_id2.password_hash = hash_password("user123")
            by_id2.role_id = 2
            by_id2.company_id = 1
        else:
            db.add(
                User(
                    id=2,
                    name="Prototype User",
                    email=demo_mail,
                    password_hash=hash_password("user123"),
                    role_id=2,
                    company_id=1,
                )
            )

    _seed_demo_equipment(db)

    db.commit()

