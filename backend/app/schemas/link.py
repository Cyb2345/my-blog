from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class LinkBase(BaseModel):
    name: str = Field(min_length=1, max_length=96)
    url: HttpUrl
    description: str | None = None
    avatar: str | None = None
    status: Literal["active", "inactive"] = "active"
    sort_order: int = 0


class LinkCreate(LinkBase):
    pass


class LinkUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=96)
    url: HttpUrl | None = None
    description: str | None = None
    avatar: str | None = None
    status: Literal["active", "inactive"] | None = None
    sort_order: int | None = None


class LinkRead(LinkBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
