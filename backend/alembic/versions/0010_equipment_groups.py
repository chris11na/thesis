"""equipment catalog groups and subgroups

Revision ID: 0010_equipment_groups
Revises: 0009_user_approval_admin_comment
Create Date: 2026-06-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0010_equipment_groups"
down_revision = "0009_user_approval_admin_comment"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if table not in inspect(bind).get_table_names():
        return False
    return any(c["name"] == column for c in inspect(bind).get_columns(table))


def upgrade() -> None:
    if not _has_table("equipment_groups"):
        op.create_table(
            "equipment_groups",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=256), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )
        op.create_index("ix_equipment_groups_code", "equipment_groups", ["code"], unique=True)

    if not _has_table("equipment_subgroups"):
        op.create_table(
            "equipment_subgroups",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("group_id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=256), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["group_id"], ["equipment_groups.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("group_id", "code", name="uq_equipment_subgroup_group_code"),
        )

    if not _has_column("products", "subgroup_id"):
        op.add_column("products", sa.Column("subgroup_id", sa.Integer(), nullable=True))
        bind = op.get_bind()
        if bind.dialect.name != "sqlite":
            op.create_foreign_key(
                "fk_products_subgroup_id",
                "products",
                "equipment_subgroups",
                ["subgroup_id"],
                ["id"],
                ondelete="SET NULL",
            )
        op.create_index("ix_products_subgroup_id", "products", ["subgroup_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column("products", "subgroup_id"):
        op.drop_index("ix_products_subgroup_id", table_name="products")
        if bind.dialect.name != "sqlite":
            op.drop_constraint("fk_products_subgroup_id", "products", type_="foreignkey")
        op.drop_column("products", "subgroup_id")
    if _has_table("equipment_subgroups"):
        op.drop_table("equipment_subgroups")
    if _has_table("equipment_groups"):
        op.drop_index("ix_equipment_groups_code", table_name="equipment_groups")
        op.drop_table("equipment_groups")
