from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class ConfigurationItem(Base):
    __tablename__ = "configuration_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    configuration_id: Mapped[int] = mapped_column(ForeignKey("configurations.id"))

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id"), nullable=True)
    license_id: Mapped[int] = mapped_column(ForeignKey("licenses.id"), nullable=True)

    quantity: Mapped[int]
