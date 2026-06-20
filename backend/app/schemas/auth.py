from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    captcha_id: str | None = Field(default=None, max_length=128)
    captcha_code: str | None = Field(default=None, max_length=12)
    mfa_code: str | None = Field(default=None, max_length=12)


class MfaVerifyRequest(BaseModel):
    temp_token: str = Field(min_length=1, max_length=512)
    code: str = Field(min_length=1, max_length=12)


class TokenPayload(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: int
    username: str
    email: str | None = None
    nickname: str
    avatar: str | None = None
    role: str
    is_active: bool = True
    mfa_enabled: bool = False

    model_config = {"from_attributes": True}
