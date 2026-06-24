from fastapi import APIRouter, Depends, HTTPException
from math import ceil

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.link import Link
from app.schemas.admin_system import BatchDeleteRequest
from app.schemas.link import LinkCreate, LinkUpdate
from app.utils.response import ok

router = APIRouter(prefix="/links", tags=["links"])
admin_router = APIRouter(
    prefix="/admin/links", tags=["admin-links"], dependencies=[Depends(require_admin)]
)


@router.get("")
def list_links(db: Session = Depends(get_db)):
    links = db.scalars(
        select(Link)
        .where(Link.status == "active")
        .order_by(Link.sort_order.asc(), Link.name.asc())
    ).all()
    return ok(links)


@admin_router.get("")
def admin_list_links(
    name: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    statement = select(Link)
    count_statement = select(func.count(Link.id))
    if name:
        condition = Link.name.ilike(f"%{name.strip()}%")
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    if status in {"active", "inactive"}:
        condition = Link.status == status
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.scalar(count_statement) or 0
    pages = ceil(total / page_size) if total else 1
    page = min(page, pages)
    links = db.scalars(
        statement.order_by(Link.sort_order.asc(), Link.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ok(
        {
            "items": links,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        }
    )


@admin_router.post("")
def create_link(payload: LinkCreate, db: Session = Depends(get_db)):
    link = Link(**payload.model_dump(mode="json"))
    db.add(link)
    db.commit()
    db.refresh(link)
    return ok(link)


@admin_router.put("/{link_id}")
def update_link(link_id: int, payload: LinkUpdate, db: Session = Depends(get_db)):
    link = db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    for field, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(link, field, value)
    db.commit()
    db.refresh(link)
    return ok(link)


@admin_router.delete("/{link_id}")
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return ok(True)


@admin_router.post("/batch-delete")
def batch_delete_links(payload: BatchDeleteRequest, db: Session = Depends(get_db)):
    ids = sorted({item for item in payload.ids if item > 0})
    if not ids:
        raise HTTPException(status_code=400, detail="请选择要删除的友链")
    links = db.scalars(select(Link).where(Link.id.in_(ids))).all()
    for link in links:
        db.delete(link)
    db.commit()
    return ok({"deleted": len(links)})
