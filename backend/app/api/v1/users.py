from math import ceil

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
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


class BatchDeleteUsersRequest(BaseModel):
    ids: list[int] = Field(default_factory=list)


def _read(user: User) -> AdminUserRead:
    return AdminUserRead.model_validate(user)


def _paginate(total: int, page: int, page_size: int) -> dict[str, int]:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": ceil(total / page_size) if total else 1,
    }


def _password_or_400(password: str) -> None:
    try:
        validate_password_complexity(password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
def list_users(
    username: str | None = None,
    login_method: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    statement = select(User)
    count_statement = select(func.count(User.id))
    conditions = []
    if username:
        pattern = f"%{username.strip()}%"
        conditions.append(
            or_(
                User.username.ilike(pattern),
                User.nickname.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    if login_method and login_method not in {"local", "local_account", "本地账号"}:
        conditions.append(User.id == -1)
    if status in {"active", "enabled", "启用", "true", "1"}:
        conditions.append(User.is_active.is_(True))
    elif status in {"inactive", "disabled", "禁用", "false", "0"}:
        conditions.append(User.is_active.is_(False))
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    pages = ceil(total / page_size) if total else 1
    page = min(page, pages)
    users = db.scalars(
        statement.order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok(
        {
            "items": [_read(user) for user in users],
            **_paginate(total, page, page_size),
        }
    )


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


def _guard_user_delete(db: Session, current_user: User, users: list[User]) -> None:
    if any(user.id == current_user.id for user in users):
        raise HTTPException(status_code=400, detail="不允许删除当前登录用户")
    admin_ids = [user.id for user in users if user.role == "admin"]
    if not admin_ids:
        return
    admin_count = db.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
    if admin_count <= len(set(admin_ids)):
        raise HTTPException(status_code=400, detail="至少需要保留一个管理员账号")


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _guard_user_delete(db, current_user, [user])
    db.delete(user)
    db.commit()
    return ok({"deleted": 1})


@router.post("/batch-delete")
def batch_delete_users(
    payload: BatchDeleteUsersRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ids = sorted({item for item in payload.ids if item > 0})
    if not ids:
        raise HTTPException(status_code=400, detail="请选择要删除的用户")
    users = db.scalars(select(User).where(User.id.in_(ids))).all()
    _guard_user_delete(db, current_user, list(users))
    for user in users:
        db.delete(user)
    db.commit()
    return ok({"deleted": len(users)})


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
