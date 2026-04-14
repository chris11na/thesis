"""Equipment-centric addons: product/module/license metadata and parent_product_id

Revision ID: 0004_equipment_addons
Revises: 0003_product_pairs
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0004_equipment_addons"
down_revision = "0003_product_pairs"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if table not in inspect(bind).get_table_names():
        return False
    return any(c["name"] == column for c in inspect(bind).get_columns(table))


def upgrade() -> None:
    if not _has_column("products", "product_kind"):
        op.add_column(
            "products",
            sa.Column(
                "product_kind",
                sa.String(),
                nullable=False,
                server_default="simple",
            ),
        )
    if not _has_column("products", "built_in_license_units"):
        op.add_column("products", sa.Column("built_in_license_units", sa.Integer(), nullable=True))
    if not _has_column("products", "module_speeds_json"):
        op.add_column("products", sa.Column("module_speeds_json", sa.Text(), nullable=True))
    if not _has_column("products", "max_module_slots"):
        op.add_column("products", sa.Column("max_module_slots", sa.Integer(), nullable=True))

    if not _has_column("modules", "speed_gbps"):
        op.add_column("modules", sa.Column("speed_gbps", sa.Integer(), nullable=True))
    if not _has_column("modules", "form_factor"):
        op.add_column("modules", sa.Column("form_factor", sa.String(), nullable=True))
    if not _has_column("modules", "max_quantity"):
        op.add_column("modules", sa.Column("max_quantity", sa.Integer(), nullable=True))

    if not _has_column("licenses", "units_per_pack"):
        op.add_column(
            "licenses",
            sa.Column("units_per_pack", sa.Integer(), nullable=False, server_default="1"),
        )

    if not _has_column("configuration_items", "parent_product_id"):
        op.add_column(
            "configuration_items",
            sa.Column("parent_product_id", sa.Integer(), nullable=True),
        )
        bind = op.get_bind()
        # SQLite cannot ALTER ADD CONSTRAINT; ORM still enforces relations in app code.
        if bind.dialect.name != "sqlite":
            op.create_foreign_key(
                "fk_configuration_items_parent_product_id",
                "configuration_items",
                "products",
                ["parent_product_id"],
                ["id"],
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.drop_constraint(
            "fk_configuration_items_parent_product_id",
            "configuration_items",
            type_="foreignkey",
        )
    op.drop_column("configuration_items", "parent_product_id")
    op.drop_column("licenses", "units_per_pack")
    op.drop_column("modules", "max_quantity")
    op.drop_column("modules", "form_factor")
    op.drop_column("modules", "speed_gbps")
    op.drop_column("products", "max_module_slots")
    op.drop_column("products", "module_speeds_json")
    op.drop_column("products", "built_in_license_units")
    op.drop_column("products", "product_kind")
