from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProductSpecValue(Base):
    __tablename__ = "product_spec_values"
    __table_args__ = (
        UniqueConstraint("product_id", "parameter_id", name="uq_product_spec_value_pair"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    parameter_id: Mapped[int] = mapped_column(ForeignKey("spec_parameters.id"), index=True)
    value: Mapped[str] = mapped_column(Text)
    value_search: Mapped[str] = mapped_column(String(512), default="")
