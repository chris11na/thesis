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


def _purge_demo_products(db: Session) -> None:
    """Remove legacy demo catalog rows when not used in configurations."""
    for pid in (201, 202):
        if db.query(Product).filter(Product.id == pid).first() is None:
            continue
        if not _product_unused_in_configs(db, pid):
            continue
        _delete_product_and_children(db, pid)

    demo_names = (
        "Контроллер БЛВС (демо)",
        "Коммутатор L2/L3 (демо)",
        "WLAN Controller (demo)",
        "L2/L3 Switch (demo)",
    )
    for name in demo_names:
        for row in db.query(Product).filter(Product.name == name).all():
            if not _product_unused_in_configs(db, row.id):
                continue
            _delete_product_and_children(db, row.id)
    db.flush()


def seed_initial_data(db: Session) -> None:
    """
    Seed minimal data for the frontend prototype.

    Inserts roles, company, users, and loads equipment catalog from JSON when enabled.
    Demo equipment (501–504) is no longer seeded; existing demo rows are purged on startup.
    """

    # Roles (admin=1, user=2)
    if db.query(Role).filter(Role.id == 1).first() is None:
        db.add(Role(id=1, name="admin"))
    if db.query(Role).filter(Role.id == 2).first() is None:
        db.add(Role(id=2, name="user"))

    guest_role = db.query(Role).filter(Role.id == 3).first()
    if guest_role is not None:
        in_use = (
            db.query(User).filter(User.role_id == 3).first() is not None
        )
        if not in_use:
            db.delete(guest_role)

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
                is_approved=True,
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
            by_email.is_approved = True
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
            by_id2.is_approved = True
        else:
            db.add(
                User(
                    id=2,
                    name="Prototype User",
                    email=demo_mail,
                    password_hash=hash_password("user123"),
                    role_id=2,
                    company_id=1,
                    is_approved=True,
                )
            )

    _purge_demo_products(db)

    from app.services.equipment_catalog_loader import maybe_seed_equipment_catalog

    maybe_seed_equipment_catalog(db)

    from app.services.equipment_groups_seed import assign_products_to_subgroups

    assign_products_to_subgroups(db)

    from app.services.switch_spec_seed import refresh_switch_spec_values
    from app.services.load_balancer_spec_seed import refresh_load_balancer_spec_values
    from app.services.firewall_spec_seed import refresh_firewall_spec_values
    from app.services.management_spec_seed import refresh_management_spec_values
    from app.services.server_spec_seed import refresh_server_spec_values
    from app.services.telephony_spec_seed import refresh_telephony_spec_values
    from app.services.vo_accessory_spec_seed import refresh_vo_accessory_spec_values
    from app.services.wifi_spec_seed import refresh_wifi_spec_values

    refresh_switch_spec_values(db)
    refresh_vo_accessory_spec_values(db)
    refresh_wifi_spec_values(db)
    refresh_load_balancer_spec_values(db)
    refresh_management_spec_values(db)
    refresh_firewall_spec_values(db)
    refresh_server_spec_values(db)
    refresh_telephony_spec_values(db)

    db.commit()

