from sqlalchemy import Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProductIncompatiblePair(Base):
    """
    Two products that must not appear together in one configuration.
    Stored with product_smaller_id < product_larger_id for uniqueness.
    """

    __tablename__ = "product_incompatible_pairs"
    __table_args__ = (
        UniqueConstraint(
            "product_smaller_id",
            "product_larger_id",
            name="uq_product_incompatible_pair_order",
        ),
        CheckConstraint(
            "product_smaller_id < product_larger_id",
            name="ck_product_incompatible_pair_order",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_smaller_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    product_larger_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
