from __future__ import annotations

import base64
import hashlib
from dataclasses import dataclass

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.admin_system import FileStorageConfig
from app.schemas.admin_system import (
    FileStorageConfigCreate,
    FileStorageConfigRead,
    FileStorageConfigUpdate,
)

ENCRYPTED_PREFIX = "enc:"
MASKED_SECRET = "************"


@dataclass(frozen=True)
class ResolvedStorageConfig:
    id: int | None
    storage_type: str
    status: str
    bucket: str
    endpoint: str
    public_base_url: str
    object_prefix: str
    access_key_id: str
    secret_access_key: str
    max_upload_size_mb: int
    allowed_file_types: str


def _fernet() -> Fernet:
    digest = hashlib.sha256(get_settings().SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(value: str) -> str:
    return f"{ENCRYPTED_PREFIX}{_fernet().encrypt(value.encode('utf-8')).decode('ascii')}"


def decrypt_secret(value: str | None) -> str | None:
    if not value:
        return None
    if not value.startswith(ENCRYPTED_PREFIX):
        return value
    try:
        return _fernet().decrypt(value.removeprefix(ENCRYPTED_PREFIX).encode("ascii")).decode("utf-8")
    except InvalidToken:
        return None


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "****"
    return f"{value[:4]}****{value[-4:]}"


def is_masked(value: str | None) -> bool:
    return not value or "****" in value.strip()


def ensure_default_config(db: Session) -> None:
    if db.scalar(select(FileStorageConfig.id).limit(1)) is not None:
        return
    settings = get_settings()
    db.add(
        FileStorageConfig(
            name="Cloudflare R2",
            storage_type="r2",
            is_primary=True,
            status="active" if settings.R2_ENABLED else "inactive",
            bucket=settings.R2_BUCKET_NAME,
            endpoint=settings.R2_ENDPOINT,
            public_base_url=settings.R2_PUBLIC_BASE_URL,
            object_prefix=settings.R2_OBJECT_PREFIX,
            access_key_id=settings.R2_ACCESS_KEY_ID,
            secret_access_key_encrypted=None,
            max_upload_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
            allowed_file_types="image/jpeg,image/png,image/webp",
            remark="敏感密钥优先从 backend/.env 读取，接口只返回脱敏状态。",
        )
    )
    db.commit()


def read_config(config: FileStorageConfig) -> FileStorageConfigRead:
    settings = get_settings()
    access_key_id = config.access_key_id or settings.R2_ACCESS_KEY_ID
    has_secret = bool(config.secret_access_key_encrypted or settings.R2_SECRET_ACCESS_KEY)
    data = {
        "id": config.id,
        "name": config.name,
        "storage_type": config.storage_type,
        "is_primary": config.is_primary,
        "status": config.status,
        "bucket": config.bucket or settings.R2_BUCKET_NAME,
        "endpoint": config.endpoint or settings.R2_ENDPOINT,
        "public_base_url": config.public_base_url or settings.R2_PUBLIC_BASE_URL,
        "object_prefix": config.object_prefix or settings.R2_OBJECT_PREFIX,
        "access_key_id": mask_secret(access_key_id),
        "secret_access_key": MASKED_SECRET if has_secret else None,
        "max_upload_size_mb": config.max_upload_size_mb,
        "allowed_file_types": config.allowed_file_types,
        "remark": config.remark,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }
    return FileStorageConfigRead(**data)


def apply_config_payload(
    config: FileStorageConfig,
    payload: FileStorageConfigCreate | FileStorageConfigUpdate,
) -> None:
    data = payload.model_dump(exclude_unset=True)
    secret = data.pop("secret_access_key", None)
    access_key_id = data.get("access_key_id")
    if is_masked(access_key_id):
        data.pop("access_key_id", None)
    for field, value in data.items():
        setattr(config, field, value)
    if secret and not is_masked(secret):
        config.secret_access_key_encrypted = encrypt_secret(secret)


def get_primary_storage_config(db: Session) -> FileStorageConfig:
    ensure_default_config(db)
    config = db.scalar(
        select(FileStorageConfig)
        .where(FileStorageConfig.is_primary.is_(True), FileStorageConfig.status == "active")
        .order_by(FileStorageConfig.id.asc())
        .limit(1)
    )
    if config:
        return config

    config = db.scalar(
        select(FileStorageConfig)
        .where(FileStorageConfig.status == "active")
        .order_by(FileStorageConfig.is_primary.desc(), FileStorageConfig.id.asc())
        .limit(1)
    )
    if config:
        return config
    raise HTTPException(status_code=503, detail="没有可用的文件存储配置")


def resolve_storage_config(
    config: FileStorageConfig,
    settings: Settings | None = None,
) -> ResolvedStorageConfig:
    settings = settings or get_settings()
    secret = decrypt_secret(config.secret_access_key_encrypted) or settings.R2_SECRET_ACCESS_KEY
    return ResolvedStorageConfig(
        id=config.id,
        storage_type=config.storage_type or "r2",
        status=config.status,
        bucket=config.bucket or settings.R2_BUCKET_NAME,
        endpoint=config.endpoint or settings.R2_ENDPOINT,
        public_base_url=config.public_base_url or settings.R2_PUBLIC_BASE_URL,
        object_prefix=(config.object_prefix or settings.R2_OBJECT_PREFIX).strip("/"),
        access_key_id=config.access_key_id or settings.R2_ACCESS_KEY_ID,
        secret_access_key=secret,
        max_upload_size_mb=config.max_upload_size_mb or settings.MAX_UPLOAD_IMAGE_SIZE_MB,
        allowed_file_types=config.allowed_file_types,
    )


def missing_r2_fields(config: ResolvedStorageConfig) -> list[str]:
    if config.storage_type != "r2":
        return []
    return [
        label
        for label, value in {
            "bucket": config.bucket,
            "endpoint": config.endpoint,
            "public_base_url": config.public_base_url,
            "access_key_id": config.access_key_id,
            "secret_access_key": config.secret_access_key,
        }.items()
        if not value
    ]
