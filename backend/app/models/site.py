from sqlalchemy import Boolean, CheckConstraint, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SiteConfig(TimestampMixin, Base):
    __tablename__ = "site_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, default="", nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))


class NavigationItem(TimestampMixin, Base):
    __tablename__ = "navigation_items"
    __table_args__ = (
        CheckConstraint("target in ('self', 'blank')", name="ck_navigation_items_target"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    href: Mapped[str] = mapped_column(String(500), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target: Mapped[str] = mapped_column(String(16), default="self", nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
