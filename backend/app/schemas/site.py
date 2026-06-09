from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, computed_field


class MediaAssetRead(BaseModel):
    id: int
    filename: str
    original_name: str
    url: str
    storage_type: str = "r2"
    bucket: str | None = None
    object_key: str
    mime_type: str
    size: int
    width: int | None = None
    height: int | None = None
    usage_type: str
    display_mode: str | None = None
    is_active: bool
    created_by_id: int | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def original_filename(self) -> str:
        return self.original_name

    model_config = {"from_attributes": True}


class SiteConfigUpdate(BaseModel):
    values: dict[str, str] = Field(default_factory=dict)


class SiteConfigRead(BaseModel):
    values: dict[str, str]


class NavigationItemRead(BaseModel):
    id: int
    label: str
    href: str
    icon: str | None = None
    sort_order: int
    target: str
    is_visible: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NavigationItemCreate(BaseModel):
    label: str = Field(min_length=1, max_length=64)
    href: str = Field(min_length=1, max_length=500)
    icon: str | None = Field(default=None, max_length=64)
    sort_order: int = 0
    target: Literal["self", "blank"] = "self"
    is_visible: bool = True


class NavigationItemUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=64)
    href: str | None = Field(default=None, min_length=1, max_length=500)
    icon: str | None = Field(default=None, max_length=64)
    sort_order: int | None = None
    target: Literal["self", "blank"] | None = None
    is_visible: bool | None = None


class LoginBackgroundUpdate(BaseModel):
    display_mode: Literal["random", "round_robin", "fixed"] = "random"
    fixed_media_id: int | None = None


class HomeBackgroundUpdate(BaseModel):
    display_mode: Literal["random", "round_robin", "fixed"] = "fixed"
    fixed_media_id: int | None = None
