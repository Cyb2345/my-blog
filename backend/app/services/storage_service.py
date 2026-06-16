from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.services.file_storage_config_service import (
    get_primary_storage_config,
    resolve_storage_config,
)
from app.services.image_service import process_upload_image
from app.services.r2_storage import R2Storage


def upload_image_to_storage(file: UploadFile, usage_type: str, db: Session) -> dict:
    storage_config = resolve_storage_config(get_primary_storage_config(db))
    image = process_upload_image(
        file,
        usage_type,
        max_size_mb=storage_config.max_upload_size_mb,
        object_prefix=storage_config.object_prefix,
    )
    storage = R2Storage(storage_config=storage_config)
    url = storage.upload_object(
        object_key=image.object_key,
        content=image.content,
        content_type=image.mime_type,
    )
    return {
        "filename": image.filename,
        "original_name": image.original_name,
        "url": url,
        "storage_type": storage_config.storage_type,
        "bucket": storage_config.bucket,
        "object_key": image.object_key,
        "mime_type": image.mime_type,
        "size": image.size,
        "width": image.width,
        "height": image.height,
        "usage_type": image.usage_type,
    }
