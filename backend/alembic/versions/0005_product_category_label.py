"""Optional product_category label (device class metadata, not rule driver)

Revision ID: 0005_product_category
Revises: 0004_equipment_addons
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0005_product_category"
down_revision = "0004_equipment_addons"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if table not in inspect(bind).get_table_names():
        return False
    return any(c["name"] == column for c in inspect(bind).get_columns(table))


def upgrade() -> None:
    if not _has_column("products", "product_category"):
        op.add_column(
            "products",
            sa.Column("product_category", sa.String(length=128), nullable=True),
        )


def downgrade() -> None:
    if _has_column("products", "product_category"):
        op.drop_column("products", "product_category")
