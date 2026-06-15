from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.equipment_group import EquipmentGroup
    from app.models.product import Product


class EquipmentSubgroup(Base):
    """Subgroup within a catalog group (e.g. Оборудование, Поддержка)."""

    __tablename__ = "equipment_subgroups"
    __table_args__ = (
        UniqueConstraint("group_id", "code", name="uq_equipment_subgroup_group_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("equipment_groups.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(256))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    group: Mapped["EquipmentGroup"] = relationship("EquipmentGroup", back_populates="subgroups")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="subgroup")
