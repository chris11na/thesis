from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.db.base import Base

class Configuration(Base):
    __tablename__ = "configurations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    # Snapshot company/user context for downstream sales handoff.
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    project_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    project_contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    submitted_to_sales: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
