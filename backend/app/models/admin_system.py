from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SystemParam(TimestampMixin, Base):
    __tablename__ = "system_params"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(96), nullable=False)
    key: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, default="", nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remark: Mapped[str | None] = mapped_column(String(500))


class FileStorageConfig(TimestampMixin, Base):
    __tablename__ = "file_storage_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(96), nullable=False)
    storage_type: Mapped[str] = mapped_column(String(32), default="r2", nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    bucket: Mapped[str | None] = mapped_column(String(255))
    endpoint: Mapped[str | None] = mapped_column(String(500))
    public_base_url: Mapped[str | None] = mapped_column(String(500))
    object_prefix: Mapped[str | None] = mapped_column(String(255))
    access_key_id: Mapped[str | None] = mapped_column(String(255))
    secret_access_key_encrypted: Mapped[str | None] = mapped_column(Text)
    max_upload_size_mb: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    allowed_file_types: Mapped[str] = mapped_column(
        String(255), default="image/jpeg,image/png,image/webp", nullable=False
    )
    remark: Mapped[str | None] = mapped_column(String(500))


class OperationLog(TimestampMixin, Base):
    __tablename__ = "operation_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    operator_username: Mapped[str | None] = mapped_column(String(64), index=True)
    request_path: Mapped[str] = mapped_column(String(500), nullable=False)
    request_method: Mapped[str] = mapped_column(String(16), nullable=False)
    api_name: Mapped[str | None] = mapped_column(String(128), index=True)
    ip: Mapped[str | None] = mapped_column(String(64), index=True)
    ip_location: Mapped[str | None] = mapped_column(String(128))
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    request_body: Mapped[str | None] = mapped_column(Text)
    response_code: Mapped[int | None] = mapped_column(Integer)


class AccessLog(TimestampMixin, Base):
    __tablename__ = "access_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ip: Mapped[str | None] = mapped_column(String(64), index=True)
    ip_location: Mapped[str | None] = mapped_column(String(128))
    browser: Mapped[str | None] = mapped_column(String(96), index=True)
    os: Mapped[str | None] = mapped_column(String(96), index=True)
    path: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    referer: Mapped[str | None] = mapped_column(String(500))
    user_agent: Mapped[str | None] = mapped_column(Text)


class AdminMenu(TimestampMixin, Base):
    __tablename__ = "menus"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("menus.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(96), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64))
    type: Mapped[str] = mapped_column(String(16), default="menu", nullable=False)
    route: Mapped[str | None] = mapped_column(String(255), index=True)
    component: Mapped[str | None] = mapped_column(String(255))
    permission: Mapped[str | None] = mapped_column(String(128))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
