"""Configuration sales handoff fields (project metadata + submission state)

Revision ID: 0007_configuration_sales_handoff
Revises: 0006_rules_json
Create Date: 2026-04-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0007_configuration_sales_handoff"
down_revision = "0006_rules_json"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    if table not in inspect(bind).get_table_names():
        return False
    return any(c["name"] == column for c in inspect(bind).get_columns(table))


def upgrade() -> None:
    if not _has_column("configurations", "company_id"):
        op.add_column("configurations", sa.Column("company_id", sa.Integer(), nullable=True))

    if not _has_column("configurations", "project_name"):
        op.add_column(
            "configurations",
            sa.Column("project_name", sa.String(length=200), nullable=True),
        )

    if not _has_column("configurations", "project_contact_name"):
        op.add_column(
            "configurations",
            sa.Column("project_contact_name", sa.String(length=200), nullable=True),
        )

    if not _has_column("configurations", "project_contact_email"):
        op.add_column(
            "configurations",
            sa.Column("project_contact_email", sa.String(length=255), nullable=True),
        )

    if not _has_column("configurations", "project_notes"):
        op.add_column("configurations", sa.Column("project_notes", sa.Text(), nullable=True))

    if not _has_column("configurations", "submitted_to_sales"):
        op.add_column(
            "configurations",
            sa.Column(
                "submitted_to_sales",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )

    if not _has_column("configurations", "submitted_at"):
        op.add_column(
            "configurations",
            sa.Column("submitted_at", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    if _has_column("configurations", "submitted_at"):
        op.drop_column("configurations", "submitted_at")
    if _has_column("configurations", "submitted_to_sales"):
        op.drop_column("configurations", "submitted_to_sales")
    if _has_column("configurations", "project_notes"):
        op.drop_column("configurations", "project_notes")
    if _has_column("configurations", "project_contact_email"):
        op.drop_column("configurations", "project_contact_email")
    if _has_column("configurations", "project_contact_name"):
        op.drop_column("configurations", "project_contact_name")
    if _has_column("configurations", "project_name"):
        op.drop_column("configurations", "project_name")
    if _has_column("configurations", "company_id"):
        op.drop_column("configurations", "company_id")
