from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.link import Link
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
def admin_list_links(db: Session = Depends(get_db)):
    links = db.scalars(select(Link).order_by(Link.sort_order.asc(), Link.name.asc())).all()
    return ok(links)


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
