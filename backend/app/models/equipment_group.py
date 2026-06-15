from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.equipment_subgroup import EquipmentSubgroup


class EquipmentGroup(Base):
    """Top-level catalog group (e.g. Коммутаторы)."""

    __tablename__ = "equipment_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(256))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    subgroups: Mapped[List["EquipmentSubgroup"]] = relationship(
        "EquipmentSubgroup",
        back_populates="group",
        order_by="EquipmentSubgroup.sort_order",
        cascade="all, delete-orphan",
    )
