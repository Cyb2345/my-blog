from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PaginatedRead(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int


class RoleRead(BaseModel):
    name: str
    code: Literal["admin", "editor"]
    description: str
    status: Literal["active", "inactive"] = "active"
    user_count: int = 0
    menu_permissions: list[str] = Field(default_factory=list)
    api_permissions: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SystemParamRead(BaseModel):
    id: int
    name: str
    key: str
    value: str
    is_system: bool
    remark: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SystemParamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=96)
    key: str = Field(min_length=1, max_length=96, pattern=r"^[A-Za-z0-9_.-]+$")
    value: str = ""
    is_system: bool = False
    remark: str | None = Field(default=None, max_length=500)


class SystemParamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=96)
    value: str | None = None
    remark: str | None = Field(default=None, max_length=500)


class FileStorageConfigRead(BaseModel):
    id: int
    name: str
    storage_type: str
    is_primary: bool
    status: str
    bucket: str | None = None
    endpoint: str | None = None
    public_base_url: str | None = None
    object_prefix: str | None = None
    region: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None
    local_path: str | None = None
    access_path: str | None = None
    base_path: str | None = None
    max_upload_size_mb: int
    allowed_file_types: str
    remark: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FileStorageConfigCreate(BaseModel):
    name: str = Field(min_length=1, max_length=96)
    storage_type: Literal["r2", "local", "s3"] = "r2"
    is_primary: bool = False
    status: Literal["active", "inactive"] = "active"
    bucket: str | None = Field(default=None, max_length=255)
    endpoint: str | None = Field(default=None, max_length=500)
    public_base_url: str | None = Field(default=None, max_length=500)
    object_prefix: str | None = Field(default=None, max_length=255)
    region: str | None = Field(default=None, max_length=128)
    access_key_id: str | None = Field(default=None, max_length=255)
    secret_access_key: str | None = None
    local_path: str | None = Field(default=None, max_length=500)
    access_path: str | None = Field(default=None, max_length=500)
    base_path: str | None = Field(default=None, max_length=255)
    max_upload_size_mb: int = Field(default=5, ge=1, le=100)
    allowed_file_types: str = "image/jpeg,image/png,image/webp"
    remark: str | None = Field(default=None, max_length=500)


class FileStorageConfigUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=96)
    storage_type: Literal["r2", "local", "s3"] | None = None
    is_primary: bool | None = None
    status: Literal["active", "inactive"] | None = None
    bucket: str | None = Field(default=None, max_length=255)
    endpoint: str | None = Field(default=None, max_length=500)
    public_base_url: str | None = Field(default=None, max_length=500)
    object_prefix: str | None = Field(default=None, max_length=255)
    region: str | None = Field(default=None, max_length=128)
    access_key_id: str | None = Field(default=None, max_length=255)
    secret_access_key: str | None = None
    local_path: str | None = Field(default=None, max_length=500)
    access_path: str | None = Field(default=None, max_length=500)
    base_path: str | None = Field(default=None, max_length=255)
    max_upload_size_mb: int | None = Field(default=None, ge=1, le=100)
    allowed_file_types: str | None = None
    remark: str | None = Field(default=None, max_length=500)


class OperationLogRead(BaseModel):
    id: int
    operator_id: int | None = None
    operator_username: str | None = None
    request_path: str
    request_method: str
    api_name: str | None = None
    ip: str | None = None
    ip_location: str | None = None
    duration_ms: int
    request_body: str | None = None
    response_code: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccessLogRead(BaseModel):
    id: int
    ip: str | None = None
    ip_location: str | None = None
    browser: str | None = None
    os: str | None = None
    path: str
    referer: str | None = None
    user_agent: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BatchDeleteRequest(BaseModel):
    ids: list[int] = Field(default_factory=list)


class AdminMenuRead(BaseModel):
    id: int
    parent_id: int | None = None
    name: str
    icon: str | None = None
    type: str
    route: str | None = None
    component: str | None = None
    permission: str | None = None
    sort_order: int
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime
    children: list["AdminMenuRead"] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AdminMenuCreate(BaseModel):
    parent_id: int | None = None
    name: str = Field(min_length=1, max_length=96)
    icon: str | None = Field(default=None, max_length=64)
    type: Literal["directory", "menu", "button"] = "menu"
    route: str | None = Field(default=None, max_length=255)
    component: str | None = Field(default=None, max_length=255)
    permission: str | None = Field(default=None, max_length=128)
    sort_order: int = 0
    is_active: bool = True
    is_system: bool = False


class AdminMenuUpdate(BaseModel):
    parent_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=96)
    icon: str | None = Field(default=None, max_length=64)
    type: Literal["directory", "menu", "button"] | None = None
    route: str | None = Field(default=None, max_length=255)
    component: str | None = Field(default=None, max_length=255)
    permission: str | None = Field(default=None, max_length=128)
    sort_order: int | None = None
    is_active: bool | None = None


AdminMenuRead.model_rebuild()
