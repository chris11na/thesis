"""Add refresh token table

Revision ID: 0002_add_refresh_tokens
Revises: 0001_init_schema
Create Date: 2026-03-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0002_add_refresh_tokens"
down_revision = "0001_init_schema"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if not _has_table("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("jti", sa.String(), nullable=False, unique=True),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
        op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
    else:
        bind = op.get_bind()
        names = {i["name"] for i in inspect(bind).get_indexes("refresh_tokens")}
        if "ix_refresh_tokens_user_id" not in names:
            op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
        if "ix_refresh_tokens_jti" not in names:
            op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_jti", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
