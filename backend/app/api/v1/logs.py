from math import ceil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.admin_system import AccessLog, OperationLog
from app.schemas.admin_system import AccessLogRead, BatchDeleteRequest, OperationLogRead
from app.utils.response import ok

router = APIRouter(
    prefix="/admin/logs",
    tags=["admin-logs"],
    dependencies=[Depends(require_admin)],
)


def _paginate(total: int, page: int, page_size: int) -> dict[str, int]:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": ceil(total / page_size) if total else 1,
    }


@router.get("/operation")
def list_operation_logs(
    username: str | None = None,
    method: str | None = None,
    api_name: str | None = None,
    ip: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    statement = select(OperationLog)
    count_statement = select(func.count(OperationLog.id))
    conditions = []
    if username:
        conditions.append(OperationLog.operator_username.ilike(f"%{username.strip()}%"))
    if method:
        conditions.append(OperationLog.request_method == method.upper())
    if api_name:
        conditions.append(OperationLog.api_name.ilike(f"%{api_name.strip()}%"))
    if ip:
        conditions.append(OperationLog.ip.ilike(f"%{ip.strip()}%"))
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    items = db.scalars(
        statement.order_by(OperationLog.created_at.desc(), OperationLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"items": [OperationLogRead.model_validate(item) for item in items], **_paginate(total, page, page_size)})


@router.delete("/operation/{log_id}")
def delete_operation_log(log_id: int, db: Session = Depends(get_db)):
    log = db.get(OperationLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="日志不存在")
    db.delete(log)
    db.commit()
    return ok(True)


@router.post("/operation/batch-delete")
def batch_delete_operation_logs(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    if not payload.ids:
        return ok({"deleted": 0})
    logs = db.scalars(select(OperationLog).where(OperationLog.id.in_(payload.ids))).all()
    for log in logs:
        db.delete(log)
    db.commit()
    return ok({"deleted": len(logs)})


@router.get("/access")
def list_access_logs(
    ip: str | None = None,
    browser: str | None = None,
    os: str | None = None,
    path: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    statement = select(AccessLog)
    count_statement = select(func.count(AccessLog.id))
    conditions = []
    if ip:
        conditions.append(AccessLog.ip.ilike(f"%{ip.strip()}%"))
    if browser:
        conditions.append(AccessLog.browser.ilike(f"%{browser.strip()}%"))
    if os:
        conditions.append(AccessLog.os.ilike(f"%{os.strip()}%"))
    if path:
        conditions.append(AccessLog.path.ilike(f"%{path.strip()}%"))
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    items = db.scalars(
        statement.order_by(AccessLog.created_at.desc(), AccessLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok({"items": [AccessLogRead.model_validate(item) for item in items], **_paginate(total, page, page_size)})


@router.delete("/access/{log_id}")
def delete_access_log(log_id: int, db: Session = Depends(get_db)):
    log = db.get(AccessLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="日志不存在")
    db.delete(log)
    db.commit()
    return ok(True)


@router.post("/access/batch-delete")
def batch_delete_access_logs(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    if not payload.ids:
        return ok({"deleted": 0})
    logs = db.scalars(select(AccessLog).where(AccessLog.id.in_(payload.ids))).all()
    for log in logs:
        db.delete(log)
    db.commit()
    return ok({"deleted": len(logs)})
