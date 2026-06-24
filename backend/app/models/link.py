from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Link(TimestampMixin, Base):
    __tablename__ = "links"
    __table_args__ = (
        CheckConstraint("status in ('active', 'inactive')", name="ck_links_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(96), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    avatar: Mapped[str | None] = mapped_column(String(500))
    email: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(24), default="active", index=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)
