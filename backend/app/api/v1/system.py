from math import ceil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_db, require_admin
from app.models.admin_system import SystemParam
from app.models.user import User
from app.schemas.admin_system import (
    BatchDeleteRequest,
    RoleRead,
    SystemParamCreate,
    SystemParamRead,
    SystemParamUpdate,
)
from app.services.system_param_service import (
    MASKED_VALUE,
    is_sensitive_param_key,
    mask_param_value,
    reload_params_cache,
)
from app.utils.response import ok

router = APIRouter(
    prefix="/admin/system",
    tags=["admin-system"],
    dependencies=[Depends(require_admin)],
)


def _default_params() -> list[dict[str, str | bool]]:
    settings = get_settings()
    return [
        {
            "name": "登录验证码类型",
            "key": "sys_captcha_type",
            "value": "image",
            "is_system": True,
            "remark": "可选 none / image / slider / turnstile；第一版后端当前使用图片验证码。",
        },
        {
            "name": "是否开启 MFA",
            "key": "sys_mfa_enabled",
            "value": "N",
            "is_system": True,
            "remark": "Y/N；用户级 MFA 已支持，系统级开关预留。",
        },
        {
            "name": "密码错误次数",
            "key": "password_error_count",
            "value": str(settings.LOGIN_FAILURE_LOCK_THRESHOLD),
            "is_system": True,
            "remark": "达到次数后锁定；当前运行时默认来自后端环境变量。",
        },
        {
            "name": "密码错误锁定分钟数",
            "key": "password_lock_minutes",
            "value": str(settings.LOGIN_FAILURE_LOCK_MINUTES),
            "is_system": True,
            "remark": "当前运行时默认来自后端环境变量。",
        },
        {
            "name": "登录接口每分钟限制",
            "key": "login_rate_limit_per_minute",
            "value": str(settings.LOGIN_RATE_LIMIT_PER_MINUTE),
            "is_system": True,
            "remark": "当前运行时默认来自后端环境变量。",
        },
        {
            "name": "验证码接口每分钟限制",
            "key": "captcha_rate_limit_per_minute",
            "value": str(settings.CAPTCHA_RATE_LIMIT_PER_MINUTE),
            "is_system": True,
            "remark": "当前运行时默认来自后端环境变量。",
        },
        {
            "name": "MFA 接口每分钟限制",
            "key": "mfa_rate_limit_per_minute",
            "value": str(settings.MFA_RATE_LIMIT_PER_MINUTE),
            "is_system": True,
            "remark": "当前运行时默认来自后端环境变量。",
        },
        {
            "name": "最大上传图片大小 MB",
            "key": "max_upload_image_size_mb",
            "value": str(settings.MAX_UPLOAD_IMAGE_SIZE_MB),
            "is_system": True,
            "remark": "R2 上传服务使用后端环境变量限制，后台参数用于统一展示和预留热更新。",
        },
        {
            "name": "默认主题模式",
            "key": "default_theme",
            "value": "system",
            "is_system": True,
            "remark": "可选 light / dark / system。",
        },
        {
            "name": "是否开启留言",
            "key": "open_message",
            "value": "Y",
            "is_system": True,
            "remark": "Y/N；预留给前台留言开关。",
        },
        {
            "name": "是否开启评论",
            "key": "open_comment",
            "value": "Y",
            "is_system": True,
            "remark": "Y/N；预留给文章评论开关。",
        },
        {
            "name": "访问日志保留天数",
            "key": "access_log_retention_days",
            "value": "90",
            "is_system": True,
            "remark": "后续可用于定期清理访问日志。",
        },
    ]


def _ensure_params(db: Session) -> None:
    existing = set(db.scalars(select(SystemParam.key)).all())
    changed = False
    for item in _default_params():
        if item["key"] in existing:
            continue
        db.add(SystemParam(**item))
        changed = True
    if changed:
        db.commit()


def _paginate(total: int, page: int, page_size: int) -> dict[str, int]:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": ceil(total / page_size) if total else 1,
    }


def _read_param(param: SystemParam) -> SystemParamRead:
    return SystemParamRead.model_validate(param).model_copy(
        update={"value": mask_param_value(param.key, param.value)}
    )


@router.get("/roles")
def list_roles(db: Session = Depends(get_db)):
    counts = dict(
        db.execute(select(User.role, func.count(User.id)).group_by(User.role)).all()
    )
    roles = [
        RoleRead(
            name="管理员",
            code="admin",
            description="拥有后台全部管理能力。",
            user_count=counts.get("admin", 0),
            menu_permissions=["*"],
            api_permissions=["*"],
        ),
        RoleRead(
            name="编辑者",
            code="editor",
            description="预留角色，后续可开放内容管理和媒体上传能力。",
            user_count=counts.get("editor", 0),
            menu_permissions=["content:*", "files:list"],
            api_permissions=["posts:*", "categories:*", "tags:*", "uploads:image"],
        ),
    ]
    return ok(roles)


@router.get("/params")
def list_params(
    keyword: str | None = None,
    name: str | None = None,
    key: str | None = None,
    is_system: bool | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    _ensure_params(db)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    statement = select(SystemParam)
    count_statement = select(func.count(SystemParam.id))
    if keyword:
        pattern = f"%{keyword.strip()}%"
        condition = or_(
            SystemParam.name.ilike(pattern),
            SystemParam.key.ilike(pattern),
            SystemParam.value.ilike(pattern),
            SystemParam.remark.ilike(pattern),
        )
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    if name:
        pattern = f"%{name.strip()}%"
        condition = SystemParam.name.ilike(pattern)
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    if key:
        pattern = f"%{key.strip()}%"
        condition = SystemParam.key.ilike(pattern)
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    if is_system is not None:
        condition = SystemParam.is_system.is_(is_system)
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    pages = ceil(total / page_size) if total else 1
    page = min(page, pages)
    items = db.scalars(
        statement.order_by(SystemParam.is_system.desc(), SystemParam.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok(
        {
            "items": [_read_param(item) for item in items],
            **_paginate(total, page, page_size),
        }
    )


@router.post("/params")
def create_param(payload: SystemParamCreate, db: Session = Depends(get_db)):
    param = SystemParam(**payload.model_dump())
    db.add(param)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="参数键名已存在") from exc
    db.refresh(param)
    reload_params_cache(db)
    return ok(_read_param(param))


@router.get("/params/{param_id}")
def get_param(param_id: int, db: Session = Depends(get_db)):
    param = db.get(SystemParam, param_id)
    if not param:
        raise HTTPException(status_code=404, detail="参数不存在")
    return ok(_read_param(param))


@router.put("/params/{param_id}")
def update_param(param_id: int, payload: SystemParamUpdate, db: Session = Depends(get_db)):
    param = db.get(SystemParam, param_id)
    if not param:
        raise HTTPException(status_code=404, detail="参数不存在")
    data = payload.model_dump(exclude_unset=True)
    if (
        "value" in data
        and is_sensitive_param_key(param.key)
        and str(data["value"] or "").strip() in {"", MASKED_VALUE}
    ):
        data.pop("value")
    for field, value in data.items():
        setattr(param, field, value)
    db.commit()
    db.refresh(param)
    reload_params_cache(db)
    return ok(_read_param(param))


@router.delete("/params/{param_id}")
def delete_param(param_id: int, db: Session = Depends(get_db)):
    param = db.get(SystemParam, param_id)
    if not param:
        raise HTTPException(status_code=404, detail="参数不存在")
    if param.is_system:
        raise HTTPException(status_code=400, detail="系统内置参数不允许删除")
    db.delete(param)
    db.commit()
    reload_params_cache(db)
    return ok(True)


@router.post("/params/batch-delete")
def batch_delete_params(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    ids = sorted({item for item in payload.ids if item > 0})
    if not ids:
        raise HTTPException(status_code=400, detail="请选择要删除的参数")
    params = db.scalars(select(SystemParam).where(SystemParam.id.in_(ids))).all()
    if any(param.is_system for param in params):
        raise HTTPException(status_code=400, detail="系统内置参数不允许删除")
    for param in params:
        db.delete(param)
    db.commit()
    reload_params_cache(db)
    return ok({"deleted": len(params)})
