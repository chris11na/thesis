from typing import Optional

from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Module(Base):
    """Equipment option (transceiver). Linked to parent Product via product_id."""

    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    speed_gbps: Mapped[Optional[int]] = mapped_column(nullable=True)
    form_factor: Mapped[Optional[str]] = mapped_column(nullable=True)
    max_quantity: Mapped[Optional[int]] = mapped_column(nullable=True)
