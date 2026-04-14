"""Optional product.rules_json for extensible rule declarations (diploma / future engine)

Revision ID: 0006_rules_json
Revises: 0005_product_category
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0006_rules_json"
down_revision = "0005_product_category"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if table not in inspect(bind).get_table_names():
        return False
    return any(c["name"] == column for c in inspect(bind).get_columns(table))


def upgrade() -> None:
    if not _has_column("products", "rules_json"):
        op.add_column(
            "products",
            sa.Column("rules_json", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    if _has_column("products", "rules_json"):
        op.drop_column("products", "rules_json")
