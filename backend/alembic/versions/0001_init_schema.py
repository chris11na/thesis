"""Initial schema

Revision ID: 0001_init_schema
Revises:
Create Date: 2026-03-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "0001_init_schema"
down_revision = None
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    # Idempotent: supports DBs created earlier via SQLAlchemy create_all() with no alembic_version row.
    if not _has_table("companies"):
        op.create_table(
            "companies",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("domain", sa.String(), nullable=False),
        )
    if not _has_table("products"):
        op.create_table(
            "products",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=False),
            sa.Column("technical_specs", sa.Text(), nullable=False),
        )
    if not _has_table("roles"):
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=False, unique=True),
        )
    if not _has_table("licenses"):
        op.create_table(
            "licenses",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        )
    if not _has_table("modules"):
        op.create_table(
            "modules",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        )
    if not _has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False, unique=True),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        )
        op.create_index("ix_users_id", "users", ["id"])
        op.create_index("ix_users_email", "users", ["email"], unique=True)
    else:
        bind = op.get_bind()
        ix = inspect(bind).get_indexes("users")
        names = {i["name"] for i in ix}
        if "ix_users_id" not in names:
            op.create_index("ix_users_id", "users", ["id"])
        if "ix_users_email" not in names:
            op.create_index("ix_users_email", "users", ["email"], unique=True)

    if not _has_table("compatibility_rules"):
        op.create_table(
            "compatibility_rules",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
            sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id"), nullable=False),
            sa.Column("rule_type", sa.String(), nullable=False),
        )
    if not _has_table("configurations"):
        op.create_table(
            "configurations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    if not _has_table("configuration_items"):
        op.create_table(
            "configuration_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "configuration_id",
                sa.Integer(),
                sa.ForeignKey("configurations.id"),
                nullable=False,
            ),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
            sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id"), nullable=True),
            sa.Column("license_id", sa.Integer(), sa.ForeignKey("licenses.id"), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("configuration_items")
    op.drop_table("configurations")
    op.drop_table("compatibility_rules")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
    op.drop_table("modules")
    op.drop_table("licenses")
    op.drop_table("roles")
    op.drop_table("products")
    op.drop_table("companies")
