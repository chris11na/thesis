"""Add structured product technical specifications

Revision ID: 0008_product_spec_parameters
Revises: 0007_configuration_sales_handoff
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0008_product_spec_parameters"
down_revision = "0007_configuration_sales_handoff"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("spec_parameters"):
        op.create_table(
            "spec_parameters",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        op.create_index("ix_spec_parameters_code", "spec_parameters", ["code"], unique=True)

    if not _has_table("product_spec_values"):
        op.create_table(
            "product_spec_values",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False
            ),
            sa.Column(
                "parameter_id",
                sa.Integer(),
                sa.ForeignKey("spec_parameters.id"),
                nullable=False,
            ),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("value_search", sa.String(length=512), nullable=False, server_default=""),
            sa.UniqueConstraint(
                "product_id", "parameter_id", name="uq_product_spec_value_pair"
            ),
        )
        op.create_index(
            "ix_product_spec_values_product_id", "product_spec_values", ["product_id"]
        )
        op.create_index(
            "ix_product_spec_values_parameter_id", "product_spec_values", ["parameter_id"]
        )


def downgrade() -> None:
    if _has_table("product_spec_values"):
        op.drop_index("ix_product_spec_values_parameter_id", table_name="product_spec_values")
        op.drop_index("ix_product_spec_values_product_id", table_name="product_spec_values")
        op.drop_table("product_spec_values")

    if _has_table("spec_parameters"):
        op.drop_index("ix_spec_parameters_code", table_name="spec_parameters")
        op.drop_table("spec_parameters")
