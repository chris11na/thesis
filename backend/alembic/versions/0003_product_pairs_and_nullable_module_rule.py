"""Product incompatible pairs and nullable compatibility_rules.module_id

Revision ID: 0003_product_pairs
Revises: 0002_add_refresh_tokens
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0003_product_pairs"
down_revision = "0002_add_refresh_tokens"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names()


def _module_id_nullable() -> bool:
    bind = op.get_bind()
    for col in inspect(bind).get_columns("compatibility_rules"):
        if col["name"] == "module_id":
            return bool(col.get("nullable"))
    return False


def upgrade() -> None:
    if _has_table("compatibility_rules") and not _module_id_nullable():
        with op.batch_alter_table("compatibility_rules", schema=None) as batch_op:
            batch_op.alter_column(
                "module_id",
                existing_type=sa.Integer(),
                nullable=True,
            )

    if not _has_table("product_incompatible_pairs"):
        op.create_table(
            "product_incompatible_pairs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("product_smaller_id", sa.Integer(), nullable=False),
            sa.Column("product_larger_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["product_larger_id"], ["products.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_smaller_id"], ["products.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "product_smaller_id",
                "product_larger_id",
                name="uq_product_incompatible_pair_order",
            ),
            sa.CheckConstraint(
                "product_smaller_id < product_larger_id",
                name="ck_product_incompatible_pair_order",
            ),
        )


def downgrade() -> None:
    op.drop_table("product_incompatible_pairs")
    with op.batch_alter_table("compatibility_rules", schema=None) as batch_op:
        batch_op.alter_column(
            "module_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
