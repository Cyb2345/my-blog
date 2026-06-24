from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class MediaAsset(TimestampMixin, Base):
    __tablename__ = "media_assets"
    __table_args__ = (
        CheckConstraint(
            "usage_type in ('general', 'post_cover', 'article_image', 'login_background', 'site_hero', 'avatar', 'link_avatar')",
            name="ck_media_assets_usage_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_type: Mapped[str] = mapped_column(String(32), default="r2", nullable=False)
    bucket: Mapped[str | None] = mapped_column(String(255))
    object_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    usage_type: Mapped[str] = mapped_column(String(48), default="general", index=True, nullable=False)
    display_mode: Mapped[str | None] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    storage_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("file_storage_configs.id", ondelete="SET NULL"),
        index=True,
    )
