"""user approval workflow and admin-only comments

Revision ID: 0009_user_approval_admin_comment
Revises: 0008_product_spec_parameters
Create Date: 2026-06-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_user_approval_admin_comment"
down_revision = "0008_product_spec_parameters"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("admin_comment", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "admin_comment")
    op.drop_column("users", "is_approved")
