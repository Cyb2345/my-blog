from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_system import SystemParam

MASKED_VALUE = "******"

_PARAM_CACHE: dict[str, str] = {}
_CACHE_READY = False

_SENSITIVE_EXACT_KEYS = {
    "database_url",
    "secret_key",
    "r2_access_key_id",
    "r2_secret_access_key",
    "next_server_actions_encryption_key",
}

_SENSITIVE_KEY_PARTS = (
    "mfa_secret",
    "password_hash",
    "access_token",
    "refresh_token",
    "api_token",
    "jwt_token",
)


def is_sensitive_param_key(key: str) -> bool:
    normalized = key.strip().lower()
    if normalized in _SENSITIVE_EXACT_KEYS:
        return True
    if normalized.endswith("_password"):
        return True
    return any(part in normalized for part in _SENSITIVE_KEY_PARTS)


def mask_param_value(key: str, value: str | None) -> str:
    if value and is_sensitive_param_key(key):
        return MASKED_VALUE
    return value or ""


def reload_params_cache(db: Session) -> None:
    global _CACHE_READY
    rows = db.execute(select(SystemParam.key, SystemParam.value)).all()
    _PARAM_CACHE.clear()
    _PARAM_CACHE.update({key: value for key, value in rows})
    _CACHE_READY = True


def get_cached_param(key: str, default: str | None = None) -> str | None:
    return _PARAM_CACHE.get(key, default)


def get_cached_bool_param(key: str, default: bool = False) -> bool:
    value = get_cached_param(key)
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def get_cached_int_param(key: str, default: int) -> int:
    value = get_cached_param(key)
    if value is None:
        return default
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def get_bool_param(db: Session, key: str, default: bool = False) -> bool:
    if not _CACHE_READY:
        reload_params_cache(db)
    return get_cached_bool_param(key, default)
