from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class CompatibilityRule(Base):
    __tablename__ = "compatibility_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id"))
    rule_type: Mapped[str]
