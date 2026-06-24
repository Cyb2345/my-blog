from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.services.file_storage_config_service import (
    get_primary_storage_config,
    resolve_storage_config,
)
from app.services.image_service import process_upload_image
from app.services.r2_storage import R2Storage
from app.services.system_param_service import get_cached_int_param


def _join_url(base: str, path: str) -> str:
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def _upload_local(*, content: bytes, object_key: str, local_path: str, access_path: str, public_base_url: str) -> str:
    root = Path(local_path).expanduser().resolve()
    destination = (root / object_key).resolve()
    if root not in destination.parents:
        raise HTTPException(status_code=400, detail="本地存储路径无效")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    public_path = _join_url(access_path or "/uploads", object_key)
    return _join_url(public_base_url, public_path) if public_base_url else public_path


def upload_image_to_storage(file: UploadFile, usage_type: str, db: Session) -> dict:
    storage_config = resolve_storage_config(get_primary_storage_config(db))
    allowed_types = {
        value.strip()
        for value in storage_config.allowed_file_types.split(",")
        if value.strip()
    }
    brand_types = {"image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"}
    if allowed_types and file.content_type not in allowed_types and not (
        usage_type == "general" and file.content_type in brand_types
    ):
        raise HTTPException(status_code=400, detail="当前存储配置不允许上传该文件类型")
    global_limit = get_cached_int_param(
        "max_upload_image_size_mb",
        storage_config.max_upload_size_mb,
    )
    upload_limit = min(storage_config.max_upload_size_mb, max(global_limit, 1))
    image = process_upload_image(
        file,
        usage_type,
        max_size_mb=upload_limit,
        object_prefix=storage_config.base_path if storage_config.storage_type == "local" else storage_config.object_prefix,
    )
    if storage_config.storage_type == "local":
        url = _upload_local(
            content=image.content,
            object_key=image.object_key,
            local_path=storage_config.local_path,
            access_path=storage_config.access_path,
            public_base_url=storage_config.public_base_url,
        )
        bucket = None
    elif storage_config.storage_type in {"r2", "s3"}:
        storage = R2Storage(storage_config=storage_config)
        url = storage.upload_object(
            object_key=image.object_key,
            content=image.content,
            content_type=image.mime_type,
        )
        bucket = storage_config.bucket
    else:
        raise HTTPException(status_code=400, detail="当前存储器类型暂不支持上传")
    return {
        "filename": image.filename,
        "original_name": image.original_name,
        "url": url,
        "storage_type": storage_config.storage_type,
        "bucket": bucket,
        "object_key": image.object_key,
        "mime_type": image.mime_type,
        "size": image.size,
        "width": image.width,
        "height": image.height,
        "usage_type": image.usage_type,
        "storage_config_id": storage_config.id,
    }
