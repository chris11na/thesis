from typing import Optional

from fastapi import FastAPI, Request
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import verify_password
from app.db.session import SessionLocal, engine
from app.models import (
    Product,
    Module,
    License,
    SpecParameter,
    ProductSpecValue,
    Company,
    User,
    CompatibilityRule,
    ProductIncompatiblePair,
    Configuration,
    ConfigurationItem,
)


class AdminAuth(AuthenticationBackend):
    """
    SQLAdmin authentication backend.

    Uses Starlette session (cookie) to keep admin logged in.
    Login is done via the SQLAdmin built-in login page.
    """

    async def login(self, request: Request) -> bool:
        form = await request.form()

        # SQLAdmin login page typically sends "username" and "password".
        # We accept either "username" or "email" for convenience.
        username = form.get("username") or form.get("email")
        password = form.get("password")

        if not username or not password:
            return False

        email_norm = str(username).strip().lower()
        if "@" not in email_norm:
            return False

        db: Session = SessionLocal()
        try:
            user = (
                db.query(User)
                .filter(func.lower(func.trim(User.email)) == email_norm)
                .first()
            )
            if not user:
                return False

            # RBAC: only admin role can access /admin.
            if user.role_id != 1:
                return False

            if not verify_password(str(password), user.password_hash):
                return False

            request.session.update(
                {
                    "admin": True,
                    "admin_user_id": user.id,
                }
            )
            return True
        finally:
            db.close()

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("admin"))


def setup_admin(app: FastAPI) -> None:
    admin = Admin(
        app,
        engine=engine,
        authentication_backend=AdminAuth(secret_key=settings.jwt_secret),
        # mount point is /admin by default
        title="Product Configurator Admin",
    )

    class ProductAdmin(ModelView, model=Product):
        column_list = [
            Product.id,
            Product.name,
            Product.product_category,
            Product.product_kind,
            Product.description,
        ]

    class ModuleAdmin(ModelView, model=Module):
        column_list = [Module.id, Module.name, Module.product_id]

    class LicenseAdmin(ModelView, model=License):
        column_list = [License.id, License.name, License.product_id]

    class SpecParameterAdmin(ModelView, model=SpecParameter):
        column_list = [
            SpecParameter.id,
            SpecParameter.code,
            SpecParameter.name,
            SpecParameter.sort_order,
            SpecParameter.is_active,
        ]

    class ProductSpecValueAdmin(ModelView, model=ProductSpecValue):
        column_list = [
            ProductSpecValue.id,
            ProductSpecValue.product_id,
            ProductSpecValue.parameter_id,
            ProductSpecValue.value,
        ]

    class CompanyAdmin(ModelView, model=Company):
        column_list = [Company.id, Company.name, Company.domain]

    class UserAdmin(ModelView, model=User):
        column_list = [User.id, User.name, User.email, User.role_id, User.company_id]

    class CompatibilityRuleAdmin(ModelView, model=CompatibilityRule):
        column_list = [CompatibilityRule.id, CompatibilityRule.product_id, CompatibilityRule.module_id, CompatibilityRule.rule_type]

    class ProductIncompatiblePairAdmin(ModelView, model=ProductIncompatiblePair):
        column_list = [
            ProductIncompatiblePair.id,
            ProductIncompatiblePair.product_smaller_id,
            ProductIncompatiblePair.product_larger_id,
        ]

    class ConfigurationAdmin(ModelView, model=Configuration):
        column_list = [Configuration.id, Configuration.user_id, Configuration.created_at]
        can_create = False
        can_edit = False
        can_delete = False

    class ConfigurationItemAdmin(ModelView, model=ConfigurationItem):
        column_list = [
            ConfigurationItem.id,
            ConfigurationItem.configuration_id,
            ConfigurationItem.product_id,
            ConfigurationItem.module_id,
            ConfigurationItem.license_id,
            ConfigurationItem.quantity,
        ]
        can_create = False
        can_edit = False
        can_delete = False

    admin.add_view(ProductAdmin)
    admin.add_view(ModuleAdmin)
    admin.add_view(LicenseAdmin)
    admin.add_view(SpecParameterAdmin)
    admin.add_view(ProductSpecValueAdmin)
    admin.add_view(CompanyAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(CompatibilityRuleAdmin)
    admin.add_view(ProductIncompatiblePairAdmin)
    admin.add_view(ConfigurationAdmin)
    admin.add_view(ConfigurationItemAdmin)

