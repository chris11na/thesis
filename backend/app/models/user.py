from sqlalchemy import String, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    role = relationship("Role")
    company = relationship("Company")