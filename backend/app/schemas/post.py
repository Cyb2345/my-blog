from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.category import CategoryRead
from app.schemas.tag import TagRead


class PostBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=180, pattern=r"^[a-z0-9][a-z0-9-]*$")
    summary: str | None = None
    content: str = Field(min_length=1)
    cover_image: str | None = None
    category_id: int | None = None


class PostCreate(PostBase):
    status: Literal["draft", "published"] = "draft"
    tag_ids: list[int] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=180, pattern=r"^[a-z0-9][a-z0-9-]*$")
    summary: str | None = None
    content: str | None = Field(default=None, min_length=1)
    cover_image: str | None = None
    status: Literal["draft", "published"] | None = None
    category_id: int | None = None
    tag_ids: list[int] | None = None


class PostRead(BaseModel):
    id: int
    title: str
    slug: str
    summary: str | None
    content: str
    cover_image: str | None
    status: str
    view_count: int
    category_id: int | None
    category: CategoryRead | None = None
    tags: list[TagRead] = []
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None

    model_config = {"from_attributes": True}


class PostListItem(BaseModel):
    id: int
    title: str
    slug: str
    summary: str | None
    cover_image: str | None
    status: str
    view_count: int
    category: CategoryRead | None = None
    tags: list[TagRead] = []
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None

    model_config = {"from_attributes": True}
