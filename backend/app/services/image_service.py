from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import re
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}

USAGE_FOLDERS = {
    "general": "general",
    "post_cover": "post-cover",
    "article_image": "article",
    "login_background": "login-bg",
    "site_hero": "hero",
    "avatar": "avatar",
    "link_avatar": "link-avatar",
}

MAX_WIDTH_BY_USAGE = {
    "post_cover": 1600,
    "article_image": 1600,
    "login_background": 1920,
    "site_hero": 1920,
    "avatar": 512,
    "link_avatar": 512,
    "general": 1600,
}


@dataclass(frozen=True)
class ProcessedImage:
    content: bytes
    filename: str
    original_name: str
    object_key: str
    mime_type: str
    size: int
    width: int
    height: int
    usage_type: str


def validate_usage_type(usage_type: str) -> str:
    if usage_type not in USAGE_FOLDERS:
        raise HTTPException(status_code=400, detail="Unsupported usage type")
    return usage_type


def _safe_stem(filename: str | None) -> str:
    stem = Path(filename or "image").stem.lower()
    stem = re.sub(r"[^a-z0-9]+", "_", stem)
    stem = re.sub(r"_+", "_", stem).strip("_")
    return stem[:48] or "image"


def _object_prefix(value: str | None = None) -> str:
    prefix = (value if value is not None else get_settings().R2_OBJECT_PREFIX).strip("/")
    if prefix != "images":
        raise HTTPException(status_code=500, detail="R2_OBJECT_PREFIX 必须配置为 images")
    return prefix


def _build_object_key(
    usage_type: str,
    original_name: str | None,
    object_prefix: str | None = None,
) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    filename = f"{_safe_stem(original_name)}_{uuid4().hex[:10]}.webp"
    object_key = "/".join(
        [
            _object_prefix(object_prefix),
            USAGE_FOLDERS[usage_type],
            now.strftime("%Y"),
            now.strftime("%m"),
            filename,
        ]
    )
    return object_key, filename


def process_upload_image(
    file: UploadFile,
    usage_type: str,
    *,
    max_size_mb: int | None = None,
    object_prefix: str | None = None,
) -> ProcessedImage:
    usage_type = validate_usage_type(usage_type)
    settings = get_settings()
    upload_limit_mb = max_size_mb or settings.MAX_UPLOAD_IMAGE_SIZE_MB
    max_size = upload_limit_mb * 1024 * 1024
    original_name = file.filename or "image"

    content = file.file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"图片大小不能超过 {upload_limit_mb}MB",
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 jpg、jpeg、png 和 webp 图片",
        )

    try:
        image = Image.open(BytesIO(content))
        image.verify()
        image = Image.open(BytesIO(content))
    except (OSError, SyntaxError, UnidentifiedImageError) as exc:
        raise HTTPException(status_code=400, detail="图片文件无法识别") from exc

    if image.format not in ALLOWED_IMAGE_TYPES.values():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 jpg、jpeg、png 和 webp 图片",
        )

    image = ImageOps.exif_transpose(image)
    max_width = MAX_WIDTH_BY_USAGE[usage_type]
    if image.width > max_width:
        ratio = max_width / image.width
        image = image.resize((max_width, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)

    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    output = BytesIO()
    image.save(output, format="WEBP", quality=82, method=6)
    processed = output.getvalue()
    object_key, filename = _build_object_key(usage_type, original_name, object_prefix)

    return ProcessedImage(
        content=processed,
        filename=filename,
        original_name=original_name,
        object_key=object_key,
        mime_type="image/webp",
        size=len(processed),
        width=image.width,
        height=image.height,
        usage_type=usage_type,
    )
