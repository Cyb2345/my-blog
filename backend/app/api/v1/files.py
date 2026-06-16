from __future__ import annotations

from math import ceil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.admin_system import FileStorageConfig
from app.models.media import MediaAsset
from app.schemas.admin_system import (
    BatchDeleteRequest,
    FileStorageConfigCreate,
    FileStorageConfigUpdate,
)
from app.schemas.site import MediaAssetRead
from app.services.file_storage_config_service import (
    apply_config_payload,
    ensure_default_config,
    encrypt_secret,
    is_masked,
    missing_r2_fields,
    read_config,
    resolve_storage_config,
)
from app.utils.response import ok

router = APIRouter(
    prefix="/admin/files",
    tags=["admin-files"],
    dependencies=[Depends(require_admin)],
)

def _paginate(total: int, page: int, page_size: int) -> dict[str, int]:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": ceil(total / page_size) if total else 1,
    }


@router.get("/configs")
def list_configs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    ensure_default_config(db)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = db.scalar(select(func.count(FileStorageConfig.id))) or 0
    configs = db.scalars(
        select(FileStorageConfig)
        .order_by(FileStorageConfig.is_primary.desc(), FileStorageConfig.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"items": [read_config(item) for item in configs], **_paginate(total, page, page_size)})


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
    if payload.secret_access_key and not is_masked(payload.secret_access_key):
        config.secret_access_key_encrypted = encrypt_secret(payload.secret_access_key)
    if config.is_primary:
        db.query(FileStorageConfig).update({FileStorageConfig.is_primary: False})
    db.add(config)
    db.commit()
    db.refresh(config)
    return ok(read_config(config))


@router.get("/configs/{config_id}")
def get_config(config_id: int, db: Session = Depends(get_db)):
    ensure_default_config(db)
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    return ok(read_config(config))


@router.put("/configs/{config_id}")
def update_config(config_id: int, payload: FileStorageConfigUpdate, db: Session = Depends(get_db)):
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    apply_config_payload(config, payload)
    if payload.is_primary:
        db.query(FileStorageConfig).filter(FileStorageConfig.id != config.id).update(
            {FileStorageConfig.is_primary: False}
        )
    db.commit()
    db.refresh(config)
    return ok(read_config(config))


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
    return ok(read_config(config))


@router.post("/configs/{config_id}/test")
def test_config(config_id: int, db: Session = Depends(get_db)):
    config = db.get(FileStorageConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="文件配置不存在")
    resolved = resolve_storage_config(config)
    if resolved.storage_type == "r2":
        missing = missing_r2_fields(resolved)
        if missing:
            raise HTTPException(status_code=400, detail=f"配置不完整：{', '.join(missing)}")
    return ok({"status": "ok", "message": "配置字段检查通过，上传将使用当前主文件配置。"})


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
