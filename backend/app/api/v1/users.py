from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.core.security import get_password_hash, validate_password_complexity
from app.models.user import User
from app.schemas.user import (
    AdminUserCreate,
    AdminUserRead,
    AdminUserUpdate,
    MfaCodeRequest,
    MfaSetupResponse,
    ResetPasswordRequest,
)
from app.services.totp_service import (
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_totp_secret,
    provisioning_uri,
    qr_code_data_url,
    verify_totp,
)
from app.utils.response import ok

router = APIRouter(
    prefix="/admin/users", tags=["admin-users"], dependencies=[Depends(require_admin)]
)


def _read(user: User) -> AdminUserRead:
    return AdminUserRead.model_validate(user)


def _password_or_400(password: str) -> None:
    try:
        validate_password_complexity(password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
def list_users(db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.created_at.desc(), User.id.desc())).all()
    return ok([_read(user) for user in users])


@router.post("")
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db)):
    _password_or_400(payload.password)
    conditions = [User.username == payload.username]
    if payload.email:
        conditions.append(User.email == str(payload.email))
    conflict = db.scalar(select(User).where(or_(*conditions)))
    if conflict:
        raise HTTPException(status_code=400, detail="用户名或邮箱已存在")

    user = User(
        username=payload.username,
        email=str(payload.email) if payload.email else None,
        password_hash=get_password_hash(payload.password),
        nickname=payload.nickname,
        avatar=payload.avatar,
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="用户名或邮箱已存在") from exc
    db.refresh(user)
    return ok(_read(user))


@router.put("/{user_id}")
def update_user(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        data["email"] = str(data["email"]) if data["email"] else None
    for field, value in data.items():
        setattr(user, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="邮箱已存在") from exc
    db.refresh(user)
    return ok(_read(user))


@router.post("/{user_id}/enable")
def enable_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return ok(_read(user))


@router.post("/{user_id}/disable")
def disable_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return ok(_read(user))


@router.post("/{user_id}/reset-password")
def reset_password(user_id: int, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _password_or_400(payload.password)
    user.password_hash = get_password_hash(payload.password)
    db.commit()
    db.refresh(user)
    return ok(_read(user))


@router.post("/{user_id}/mfa/setup")
def setup_mfa(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    secret = generate_totp_secret()
    user.mfa_secret = encrypt_totp_secret(secret)
    user.mfa_enabled = False
    db.commit()
    uri = provisioning_uri(secret, user.username)
    return ok(
        MfaSetupResponse(
            secret=secret,
            provisioning_uri=uri,
            qr_code_data_url=qr_code_data_url(uri),
        )
    )


@router.post("/{user_id}/mfa/verify")
def verify_user_mfa(user_id: int, payload: MfaCodeRequest, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or not user.mfa_secret:
        raise HTTPException(status_code=404, detail="MFA setup not found")
    try:
        secret = decrypt_totp_secret(user.mfa_secret)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="MFA secret invalid") from exc
    if not verify_totp(secret, payload.code):
        raise HTTPException(status_code=400, detail="动态验证码错误")
    user.mfa_enabled = True
    db.commit()
    db.refresh(user)
    return ok(_read(user))


@router.post("/{user_id}/mfa/disable")
def disable_user_mfa(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.mfa_enabled = False
    user.mfa_secret = None
    db.commit()
    db.refresh(user)
    return ok(_read(user))
