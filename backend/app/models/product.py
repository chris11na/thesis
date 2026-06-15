from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.equipment_subgroup import EquipmentSubgroup


class Product(Base):
    """
    Catalog root row. product_kind flags configurator root line (not device taxonomy).
    product_category is an optional label (controller, switch, …) — never drives validation.
    Child options: Module/License rows sharing product_id; constraints in columns + services.
    """

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str]
    technical_specs: Mapped[str] = mapped_column(Text)
    # "equipment" = root line in structured configuration (lines[].equipment_product_id).
    product_kind: Mapped[str] = mapped_column(default="equipment")
    # Optional marketing / taxonomy label only (no if category == ... in business logic).
    product_category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    built_in_license_units: Mapped[Optional[int]] = mapped_column(nullable=True)
    # JSON array of supported module speeds in Gbps, e.g. "[1, 10]"; NULL = no speed filter
    module_speeds_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_module_slots: Mapped[Optional[int]] = mapped_column(nullable=True)
    # Extensible rules document (JSON text). Runtime still uses columns above; this is for growth / docs.
    rules_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subgroup_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("equipment_subgroups.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    subgroup: Mapped[Optional["EquipmentSubgroup"]] = relationship(
        "EquipmentSubgroup",
        back_populates="products",
    )
