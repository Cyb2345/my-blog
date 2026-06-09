from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class CommentCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=64)
    email: EmailStr
    content: str = Field(min_length=2, max_length=2000)


class CommentRead(BaseModel):
    id: int
    nickname: str
    content: str
    status: Literal["pending", "approved", "rejected"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminCommentRead(CommentRead):
    email: EmailStr
    ip_address: str | None
    user_agent: str | None
