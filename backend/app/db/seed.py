from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.compatibility_rule import CompatibilityRule
from app.models.product import Product
from app.models.module import Module
from app.models.role import Role
from app.models.user import User
from app.core.security import hash_password, is_supported_password_hash


def seed_initial_data(db: Session) -> None:
    """
    Seed minimal data for the frontend prototype.

    Keep it intentionally simple: only inserts what the current prototype needs:
    - user with id=1
    - products with ids matching the frontend mock list (101..103)
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

    normal_user = db.query(User).filter(User.id == 2).first()
    if normal_user is None:
        db.add(
            User(
                id=2,
                name="Prototype User",
                email="user@example.com",
                password_hash=hash_password("user123"),
                role_id=2,
                company_id=1,
            )
        )
    elif not is_supported_password_hash(normal_user.password_hash):
        normal_user.password_hash = hash_password("user123")

    # Products used by frontend mock list
    existing_product_ids = [pid for (pid,) in db.query(Product.id).all()]
    for pid, name, desc, specs in [
        (101, "Mock Product X", "Local mock product X", "Prototype seeded product X"),
        (102, "Mock Product Y", "Local mock product Y", "Prototype seeded product Y"),
        (103, "Mock Product Z", "Local mock product Z with long description", "Prototype seeded product Z"),
    ]:
        if pid not in existing_product_ids:
            db.add(
                Product(id=pid, name=name, description=desc, technical_specs=specs)
            )

    # Minimal compatibility_rules seed.
    # We keep it simple: forbid using product 103 in any configuration.
    #
    # Important: current DB schema enforces NOT NULL for `compatibility_rules.module_id`,
    # so we must seed a real module row and use its id here.
    if db.query(CompatibilityRule).first() is None:
        if db.query(Module).filter(Module.id == 201).first() is None:
            db.add(
                Module(
                    id=201,
                    name="Prototype Module A",
                    product_id=103,
                )
            )
            db.flush()

        db.add(
            CompatibilityRule(
                rule_type="forbidden",
                product_id=103,
                module_id=201,
            )
        )

    db.commit()

