from functools import cached_property

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from app.core.config import Settings, get_settings
from app.services.file_storage_config_service import ResolvedStorageConfig, missing_r2_fields


class R2Storage:
    def __init__(
        self,
        settings: Settings | None = None,
        storage_config: ResolvedStorageConfig | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.storage_config = storage_config

    @property
    def bucket_name(self) -> str:
        return self.storage_config.bucket if self.storage_config else self.settings.R2_BUCKET_NAME

    @property
    def endpoint(self) -> str:
        return self.storage_config.endpoint if self.storage_config else self.settings.R2_ENDPOINT

    @property
    def public_base_url(self) -> str:
        return (
            self.storage_config.public_base_url
            if self.storage_config
            else self.settings.R2_PUBLIC_BASE_URL
        )

    @property
    def access_key_id(self) -> str:
        return (
            self.storage_config.access_key_id
            if self.storage_config
            else self.settings.R2_ACCESS_KEY_ID
        )

    @property
    def secret_access_key(self) -> str:
        return (
            self.storage_config.secret_access_key
            if self.storage_config
            else self.settings.R2_SECRET_ACCESS_KEY
        )

    @property
    def object_prefix(self) -> str:
        return (
            self.storage_config.object_prefix
            if self.storage_config
            else self.settings.R2_OBJECT_PREFIX
        ).strip("/")

    def _ensure_configured(self) -> None:
        if self.storage_config and self.storage_config.storage_type != "r2":
            raise HTTPException(status_code=400, detail="当前主文件配置不是 R2 存储")
        if self.storage_config and self.storage_config.status != "active":
            raise HTTPException(status_code=503, detail="当前 R2 文件配置未启用")
        if not self.storage_config and not self.settings.R2_ENABLED:
            raise HTTPException(status_code=503, detail="R2 存储未启用")
        missing = (
            missing_r2_fields(self.storage_config)
            if self.storage_config
            else [
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
        )
        if missing:
            raise HTTPException(status_code=503, detail="R2 存储未配置，请检查当前文件配置或后端 .env")
        if "<" in self.endpoint or ">" in self.endpoint:
            raise HTTPException(status_code=503, detail="R2_ENDPOINT 仍是占位符，请填写 Cloudflare R2 账户 endpoint")
        if not self.endpoint.startswith("https://"):
            raise HTTPException(status_code=503, detail="R2_ENDPOINT 必须是 https:// 开头的地址")
        if self.object_prefix != "images":
            raise HTTPException(status_code=500, detail="R2_OBJECT_PREFIX 必须配置为 images")

    @cached_property
    def client(self):
        self._ensure_configured()
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def public_url(self, object_key: str) -> str:
        base_url = self.public_base_url.rstrip("/")
        return f"{base_url}/{object_key.lstrip('/')}"

    def upload_object(self, *, object_key: str, content: bytes, content_type: str) -> str:
        self._ensure_configured()
        if not object_key.startswith("images/"):
            raise HTTPException(status_code=500, detail="R2 object key 必须以 images/ 开头")
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=content,
                ContentType=content_type,
                CacheControl="public, max-age=604800, immutable",
            )
        except (BotoCoreError, ClientError) as exc:
            raise HTTPException(status_code=502, detail="图片上传到 R2 失败") from exc
        return self.public_url(object_key)
