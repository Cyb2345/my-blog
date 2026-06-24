from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.comment import Comment
from app.schemas.comment import CommentCreate
from app.services.system_param_service import get_bool_param, reload_params_cache
from app.utils.response import ok

router = APIRouter(prefix="/comments", tags=["comments"])
admin_router = APIRouter(
    prefix="/admin/comments", tags=["admin-comments"], dependencies=[Depends(require_admin)]
)


@router.get("")
def list_comments(db: Session = Depends(get_db)):
    comments = db.scalars(
        select(Comment)
        .where(Comment.status == "approved")
        .order_by(Comment.created_at.desc(), Comment.id.desc())
    ).all()
    return ok(comments)


@router.post("")
def create_comment(
    payload: CommentCreate, request: Request, db: Session = Depends(get_db)
):
    reload_params_cache(db)
    if not get_bool_param(db, "open_message", True):
        raise HTTPException(status_code=403, detail="留言功能暂未开放")
    client_host = request.client.host if request.client else None
    if client_host:
        recent_count = db.scalar(
            select(func.count(Comment.id)).where(
                Comment.ip_address == client_host,
                Comment.created_at >= datetime.now(timezone.utc) - timedelta(seconds=60),
            )
        )
        if recent_count:
            raise HTTPException(status_code=429, detail="Please wait before posting again")

    comment = Comment(
        nickname=payload.nickname,
        email=str(payload.email),
        content=payload.content,
        ip_address=client_host,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return ok(comment, message="Comment submitted and waiting for review")


@admin_router.get("")
def admin_list_comments(status_filter: str | None = None, db: Session = Depends(get_db)):
    statement = select(Comment).order_by(Comment.created_at.desc(), Comment.id.desc())
    if status_filter in {"pending", "approved", "rejected"}:
        statement = statement.where(Comment.status == status_filter)
    return ok(db.scalars(statement).all())


@admin_router.post("/{comment_id}/approve")
def approve_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.status = "approved"
    db.commit()
    db.refresh(comment)
    return ok(comment)


@admin_router.post("/{comment_id}/reject")
def reject_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.status = "rejected"
    db.commit()
    db.refresh(comment)
    return ok(comment)


@admin_router.delete("/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return ok(True)
