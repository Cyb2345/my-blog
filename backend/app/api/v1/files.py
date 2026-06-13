from __future__ import annotations

import base64
import hashlib
from math import ceil

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_db, require_admin
from app.models.admin_system import FileStorageConfig
from app.models.media import MediaAsset
from app.schemas.admin_system import (
    BatchDeleteRequest,
    FileStorageConfigCreate,
    FileStorageConfigRead,
    FileStorageConfigUpdate,
)
from app.schemas.site import MediaAssetRead
from app.utils.response import ok

router = APIRouter(
    prefix="/admin/files",
    tags=["admin-files"],
    dependencies=[Depends(require_admin)],
)

ENCRYPTED_PREFIX = "enc:"
MASKED_SECRET = "************"


def _fernet() -> Fernet:
    digest = hashlib.sha256(get_settings().SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _encrypt_secret(value: str) -> str:
    return f"{ENCRYPTED_PREFIX}{_fernet().encrypt(value.encode('utf-8')).decode('ascii')}"


def _decrypt_secret(value: str | None) -> str | None:
    if not value:
        return None
    if not value.startswith(ENCRYPTED_PREFIX):
        return value
    try:
        return _fernet().decrypt(value.removeprefix(ENCRYPTED_PREFIX).encode("ascii")).decode("utf-8")
    except InvalidToken:
        return None


def _mask(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "****"
    return f"{value[:4]}****{value[-4:]}"


def _is_masked(value: str | None) -> bool:
    return not value or "****" in value.strip()


def _paginate(total: int, page: int, page_size: int) -> dict[str, int]:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": ceil(total / page_size) if total else 1,
    }


def _ensure_default_config(db: Session) -> None:
    if db.scalar(select(func.count(FileStorageConfig.id))) != 0:
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


def _read_config(config: FileStorageConfig) -> FileStorageConfigRead:
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
        "access_key_id": _mask(access_key_id),
        "secret_access_key": MASKED_SECRET if has_secret else None,
        "max_upload_size_mb": config.max_upload_size_mb,
        "allowed_file_types": config.allowed_file_types,
        "remark": config.remark,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }
    return FileStorageConfigRead(**data)


def _apply_config_payload(
    config: FileStorageConfig,
    payload: FileStorageConfigCreate | FileStorageConfigUpdate,
) -> None:
    data = payload.model_dump(exclude_unset=True)
    secret = data.pop("secret_access_key", None)
    access_key_id = data.get("access_key_id")
    if _is_masked(access_key_id):
        data.pop("access_key_id", None)
    for field, value in data.items():
        setattr(config, field, value)
    if secret and not _is_masked(secret):
        config.secret_access_key_encrypted = _encrypt_secret(secret)


@router.get("/configs")
def list_configs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    _ensure_default_config(db)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = db.scalar(select(func.count(FileStorageConfig.id))) or 0
    configs = db.scalars(
        select(FileStorageConfig)
        .order_by(FileStorageConfig.is_primary.desc(), FileStorageConfig.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"items": [_read_config(item) for item in configs], **_paginate(total, page, page_size)})


@router.post("/configs")
def create_config(payload: FileStorageConfigCreate, db: Session = Depends(get_db)):
    config = FileStorageConfig(
        name=payload.name,
        storage_type=payload.storage_type,
        is_primary=payload.is_primary,
        status=payload.status,
        bucket=payload.bucket,
        endpoint=payload.endpoint,
        public_base_url=payload.public_base_url,
        object_prefix=payload.object_prefix,
        access_key_id=payload.access_key_id,
        max_upload_size_mb=payload.max_upload_size_mb,
        allowed_file_types=payload.allowed_file_types,
        remark=payload.remark,
    )
    if payload.secret_access_key and not _is_masked(payload.secret_access_key):
        config.secret_access_key_encrypted = _encrypt_secret(payload.secret_access_key)
    if config.is_primary:
        db.query(FileStorageConfig).update({FileStorageConfig.is_primary: False})
    db.add(config)
    db.commit()
    db.refresh(config)
    return ok(_read_config(config))


@router.get("/configs/{config_id}")
def get_config(config_id: int, db: Session = Depends(get_db)):
    _ensure_default_config(db)
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    return ok(_read_config(config))


@router.put("/configs/{config_id}")
def update_config(config_id: int, payload: FileStorageConfigUpdate, db: Session = Depends(get_db)):
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    _apply_config_payload(config, payload)
    if payload.is_primary:
        db.query(FileStorageConfig).filter(FileStorageConfig.id != config.id).update(
            {FileStorageConfig.is_primary: False}
        )
    db.commit()
    db.refresh(config)
    return ok(_read_config(config))


@router.delete("/configs/{config_id}")
def delete_config(config_id: int, db: Session = Depends(get_db)):
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    if config.is_primary:
        raise HTTPException(status_code=400, detail="主配置不允许删除，请先切换主配置")
    db.delete(config)
    db.commit()
    return ok(True)


@router.post("/configs/{config_id}/set-primary")
def set_primary_config(config_id: int, db: Session = Depends(get_db)):
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    db.query(FileStorageConfig).update({FileStorageConfig.is_primary: False})
    config.is_primary = True
    db.commit()
    db.refresh(config)
    return ok(_read_config(config))


@router.post("/configs/{config_id}/test")
def test_config(config_id: int, db: Session = Depends(get_db)):
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    settings = get_settings()
    secret = settings.R2_SECRET_ACCESS_KEY or _decrypt_secret(config.secret_access_key_encrypted)
    if config.storage_type == "r2":
        missing = [
            label
            for label, value in {
                "bucket": config.bucket or settings.R2_BUCKET_NAME,
                "endpoint": config.endpoint or settings.R2_ENDPOINT,
                "public_base_url": config.public_base_url or settings.R2_PUBLIC_BASE_URL,
                "access_key_id": config.access_key_id or settings.R2_ACCESS_KEY_ID,
                "secret_access_key": secret,
            }.items()
            if not value
        ]
        if missing:
            raise HTTPException(status_code=400, detail=f"配置不完整：{', '.join(missing)}")
    return ok({"status": "ok", "message": "配置字段检查通过，真实上传仍以 backend 环境变量为准。"})


@router.get("")
def list_files(
    keyword: str | None = None,
    file_type: str | None = None,
    storage_type: str | None = None,
    usage_type: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    statement = select(MediaAsset).where(MediaAsset.is_active.is_(True))
    count_statement = select(func.count(MediaAsset.id)).where(MediaAsset.is_active.is_(True))
    conditions = []
    if keyword:
        pattern = f"%{keyword.strip()}%"
        conditions.append(
            or_(
                MediaAsset.filename.ilike(pattern),
                MediaAsset.original_name.ilike(pattern),
                MediaAsset.object_key.ilike(pattern),
                MediaAsset.url.ilike(pattern),
            )
        )
    if file_type:
        conditions.append(MediaAsset.mime_type.ilike(f"%{file_type.strip()}%"))
    if storage_type:
        conditions.append(MediaAsset.storage_type == storage_type)
    if usage_type:
        conditions.append(MediaAsset.usage_type == usage_type)
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    assets = db.scalars(
        statement.order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"items": [MediaAssetRead.model_validate(item) for item in assets], **_paginate(total, page, page_size)})


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    asset = db.get(MediaAsset, file_id)
    if not asset:
        raise HTTPException(status_code=404, detail="文件不存在")
    asset.is_active = False
    db.commit()
    db.refresh(asset)
    return ok(MediaAssetRead.model_validate(asset))


@router.post("/batch-delete")
def batch_delete_files(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    if not payload.ids:
        return ok({"deleted": 0})
    assets = db.scalars(select(MediaAsset).where(MediaAsset.id.in_(payload.ids))).all()
    for asset in assets:
        asset.is_active = False
    db.commit()
    return ok({"deleted": len(assets)})
