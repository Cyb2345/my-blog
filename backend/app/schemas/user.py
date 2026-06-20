from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class AdminUserRead(BaseModel):
    id: int
    username: str
    email: str | None = None
    nickname: str
    avatar: str | None = None
    role: str
    is_active: bool
    mfa_enabled: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(default="Admin", min_length=1, max_length=64)
    email: EmailStr | None = None
    avatar: str | None = None
    role: Literal["admin", "editor"] = "editor"
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    nickname: str | None = Field(default=None, min_length=1, max_length=64)
    email: EmailStr | None = None
    avatar: str | None = None
    role: Literal["admin", "editor"] | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class MfaCodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=12)


class MfaSetupResponse(BaseModel):
    qr_code_data_url: str
