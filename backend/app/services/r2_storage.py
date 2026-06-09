from functools import cached_property

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from app.core.config import Settings, get_settings


class R2Storage:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _ensure_configured(self) -> None:
        if not self.settings.R2_ENABLED:
            raise HTTPException(status_code=503, detail="R2 存储未启用")
        missing = [
            name
            for name in (
                "R2_BUCKET_NAME",
                "R2_ENDPOINT",
                "R2_PUBLIC_BASE_URL",
                "R2_ACCESS_KEY_ID",
                "R2_SECRET_ACCESS_KEY",
            )
            if not getattr(self.settings, name)
        ]
        if missing:
            raise HTTPException(status_code=503, detail="R2 存储未配置，请在后端 .env 中填写 R2_*")
        if "<" in self.settings.R2_ENDPOINT or ">" in self.settings.R2_ENDPOINT:
            raise HTTPException(status_code=503, detail="R2_ENDPOINT 仍是占位符，请填写 Cloudflare R2 账户 endpoint")
        if not self.settings.R2_ENDPOINT.startswith("https://"):
            raise HTTPException(status_code=503, detail="R2_ENDPOINT 必须是 https:// 开头的地址")
        if self.settings.R2_OBJECT_PREFIX.strip("/") != "images":
            raise HTTPException(status_code=500, detail="R2_OBJECT_PREFIX 必须配置为 images")

    @cached_property
    def client(self):
        self._ensure_configured()
        return boto3.client(
            "s3",
            endpoint_url=self.settings.R2_ENDPOINT,
            aws_access_key_id=self.settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=self.settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def public_url(self, object_key: str) -> str:
        base_url = self.settings.R2_PUBLIC_BASE_URL.rstrip("/")
        return f"{base_url}/{object_key.lstrip('/')}"

    def upload_object(self, *, object_key: str, content: bytes, content_type: str) -> str:
        self._ensure_configured()
        if not object_key.startswith("images/"):
            raise HTTPException(status_code=500, detail="R2 object key 必须以 images/ 开头")
        try:
            self.client.put_object(
                Bucket=self.settings.R2_BUCKET_NAME,
                Key=object_key,
                Body=content,
                ContentType=content_type,
                CacheControl="public, max-age=604800, immutable",
            )
        except (BotoCoreError, ClientError) as exc:
            raise HTTPException(status_code=502, detail="图片上传到 R2 失败") from exc
        return self.public_url(object_key)
