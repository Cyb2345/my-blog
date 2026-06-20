from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Personal Tech Blog"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "postgresql+psycopg://blog:blog_password@localhost:5432/blog"
    SECRET_KEY: str = Field(default="please-change-me-in-production", min_length=16)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    UPLOAD_DIR: str = "uploads"

    R2_ENABLED: bool = True
    R2_BUCKET_NAME: str = "blog"
    R2_ENDPOINT: str = ""
    R2_PUBLIC_BASE_URL: str = "https://img.ccby.us"
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_OBJECT_PREFIX: str = "images"
    MAX_UPLOAD_IMAGE_SIZE_MB: int = 5

    RATE_LIMIT_BACKEND: str = "memory"
    REDIS_URL: str = "redis://redis:6379/0"
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5
    LOGIN_FAILURE_LOCK_THRESHOLD: int = 5
    LOGIN_FAILURE_LOCK_MINUTES: int = 10
    CAPTCHA_RATE_LIMIT_PER_MINUTE: int = 20
    MFA_RATE_LIMIT_PER_MINUTE: int = 10

    PROMETHEUS_ENABLED: bool = False
    PROMETHEUS_BASE_URL: str = "http://prometheus:9090"
    PROMETHEUS_TIMEOUT_SECONDS: int = 5
    PROMETHEUS_DEFAULT_RANGE_MINUTES: int = 5

    IP_LOCATION_PROVIDER: str = "ipapi"
    IP2REGION_DB_PATH: str = ""
    MAXMIND_GEOIP_DB_PATH: str = ""
    IPINFO_TOKEN: str = ""
    IP_LOCATION_TIMEOUT_SECONDS: float = 0.8


@lru_cache
def get_settings() -> Settings:
    return Settings()
