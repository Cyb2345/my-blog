from datetime import datetime

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    description: str | None = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    slug: str | None = Field(default=None, min_length=1, max_length=96, pattern=r"^[a-z0-9][a-z0-9-]*$")


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    slug: str | None = Field(default=None, min_length=1, max_length=96, pattern=r"^[a-z0-9][a-z0-9-]*$")
    description: str | None = None
    sort_order: int | None = None


class CategoryRead(CategoryBase):
    id: int
    slug: str
    post_count: int = 0
    article_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
