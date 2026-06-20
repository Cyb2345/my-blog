from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import get_client_ip, rate_limiter
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, MfaVerifyRequest, UserRead
from app.services.auth_service import authenticate_user
from app.services.captcha_service import create_captcha, validate_captcha
from app.services.login_security_service import login_security
from app.services.system_param_service import (
    get_bool_param,
    get_cached_int_param,
    reload_params_cache,
)
from app.services.totp_service import decrypt_totp_secret, verify_totp
from app.utils.response import ok

router = APIRouter(prefix="/auth", tags=["auth"])
LOGIN_FAILED_DETAIL = "登录失败，请检查账号、密码、验证码或动态验证码"


def authenticate_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username, User.is_active.is_(True)))


def is_system_mfa_enabled(db: Session) -> bool:
    return get_bool_param(db, "sys_mfa_enabled", False)


@router.get("/captcha")
def captcha(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    reload_params_cache(db)
    ip = get_client_ip(request)
    rate_limiter.check(
        key=f"captcha:ip:{ip}",
        limit=get_cached_int_param("captcha_rate_limit_per_minute", settings.CAPTCHA_RATE_LIMIT_PER_MINUTE),
        window_seconds=60,
        message="验证码请求过于频繁，请稍后再试",
    )
    return ok(create_captcha())


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    reload_params_cache(db)
    ip = get_client_ip(request)
    rate_limiter.check(
        key=f"login:ip:{ip}",
        limit=get_cached_int_param("login_rate_limit_per_minute", settings.LOGIN_RATE_LIMIT_PER_MINUTE),
        window_seconds=60,
        message="登录请求过于频繁，请稍后再试",
    )
    login_security.ensure_login_allowed(ip, payload.username)

    if not validate_captcha(payload.captcha_id, payload.captcha_code):
        login_security.record_login_failure(ip, payload.username)
        raise HTTPException(status_code=400, detail=LOGIN_FAILED_DETAIL)

    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        login_security.record_login_failure(ip, payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=LOGIN_FAILED_DETAIL,
        )
    if is_system_mfa_enabled(db) and user.mfa_enabled:
        if not user.mfa_secret:
            login_security.record_login_failure(ip, payload.username)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_FAILED_DETAIL)
        try:
            secret = decrypt_totp_secret(user.mfa_secret)
        except ValueError as exc:
            login_security.record_login_failure(ip, payload.username)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_FAILED_DETAIL) from exc
        if not payload.mfa_code or not verify_totp(secret, payload.mfa_code):
            login_security.record_login_failure(ip, payload.username)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=LOGIN_FAILED_DETAIL)

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    login_security.record_login_success(ip, payload.username)
    token = create_access_token(user.username)
    return ok({"access_token": token, "token_type": "bearer"})


@router.post("/mfa/verify")
def verify_mfa(payload: MfaVerifyRequest, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    reload_params_cache(db)
    ip = get_client_ip(request)
    rate_limiter.check(
        key=f"mfa:ip:{ip}",
        limit=get_cached_int_param("mfa_rate_limit_per_minute", settings.MFA_RATE_LIMIT_PER_MINUTE),
        window_seconds=60,
        message="MFA 验证请求过于频繁，请稍后再试",
    )
    login_security.ensure_mfa_token_allowed(payload.temp_token)
    login_security.record_mfa_token_failure(payload.temp_token)
    raise HTTPException(status_code=400, detail="MFA 验证流程未启用，请重新登录")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return ok(UserRead.model_validate(current_user))


@router.post("/logout")
def logout():
    return ok(True)
