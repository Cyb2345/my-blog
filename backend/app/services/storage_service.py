from fastapi import UploadFile

from app.core.config import get_settings
from app.services.image_service import process_upload_image
from app.services.r2_storage import R2Storage


def upload_image_to_storage(file: UploadFile, usage_type: str) -> dict:
    settings = get_settings()
    image = process_upload_image(file, usage_type)
    storage = R2Storage(settings)
    url = storage.upload_object(
        object_key=image.object_key,
        content=image.content,
        content_type=image.mime_type,
    )
    return {
        "filename": image.filename,
        "original_name": image.original_name,
        "url": url,
        "storage_type": "r2",
        "bucket": settings.R2_BUCKET_NAME,
        "object_key": image.object_key,
        "mime_type": image.mime_type,
        "size": image.size,
        "width": image.width,
        "height": image.height,
        "usage_type": image.usage_type,
    }
