from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class License(Base):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
