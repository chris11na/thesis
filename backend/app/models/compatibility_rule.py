from typing import Optional

from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CompatibilityRule(Base):
    """Forbidden combination: product_id with optional module_id (rule_type e.g. forbidden)."""

    __tablename__ = "compatibility_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    # When NULL, rule applies to the product alone (e.g. product forbidden in any config).
    module_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("modules.id"), nullable=True
    )
    rule_type: Mapped[str]
