from __future__ import annotations

from datetime import datetime
from math import ceil
from pathlib import Path

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
    missing_local_fields,
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


def _validate_config(config: FileStorageConfig) -> None:
    resolved = resolve_storage_config(config)
    if resolved.storage_type == "local":
        missing = missing_local_fields(resolved)
    else:
        missing = missing_r2_fields(resolved)
    if missing:
        raise HTTPException(status_code=400, detail=f"配置不完整：{', '.join(missing)}")
    if resolved.storage_type == "local" and not resolved.access_path.startswith("/"):
        raise HTTPException(status_code=400, detail="本地访问路径必须以 / 开头")


def _media_dict(asset: MediaAsset, storage_names: dict[int, str]) -> dict:
    data = MediaAssetRead.model_validate(asset).model_dump()
    data["storage_name"] = storage_names.get(asset.storage_config_id or 0)
    return data


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
    config = FileStorageConfig(name=payload.name)
    apply_config_payload(config, payload)
    _validate_config(config)
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
    _validate_config(config)
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
    _validate_config(config)
    if resolved.storage_type == "local":
        path = Path(resolved.local_path).expanduser()
        path.mkdir(parents=True, exist_ok=True)
        if not path.is_dir():
            raise HTTPException(status_code=400, detail="本地存储路径不可用")
    return ok({"status": "ok", "message": "配置字段检查通过，上传将使用当前主文件配置。"})


@router.get("")
def list_files(
    keyword: str | None = None,
    file_type: str | None = None,
    storage_type: str | None = None,
    usage_type: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
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
    if start_time:
        conditions.append(MediaAsset.created_at >= start_time)
    if end_time:
        conditions.append(MediaAsset.created_at <= end_time)
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    assets = db.scalars(
        statement.order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    storage_ids = {item.storage_config_id for item in assets if item.storage_config_id}
    storage_names = (
        dict(
            db.execute(
                select(FileStorageConfig.id, FileStorageConfig.name).where(
                    FileStorageConfig.id.in_(storage_ids)
                )
            ).all()
        )
        if storage_ids
        else {}
    )
    return ok({"items": [_media_dict(item, storage_names) for item in assets], **_paginate(total, page, page_size)})


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
