from typing import Optional

from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ConfigurationItem(Base):
    __tablename__ = "configuration_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    configuration_id: Mapped[int] = mapped_column(ForeignKey("configurations.id"))

    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)
    module_id: Mapped[Optional[int]] = mapped_column(ForeignKey("modules.id"), nullable=True)
    license_id: Mapped[Optional[int]] = mapped_column(ForeignKey("licenses.id"), nullable=True)
    # Equipment line item this addon row belongs to (NULL for root equipment product row)
    parent_product_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("products.id"), nullable=True
    )

    quantity: Mapped[int]
