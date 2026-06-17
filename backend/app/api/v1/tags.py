from math import ceil
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.post import Post, post_tags
from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate
from app.services.post_service import paginate
from app.utils.response import ok

router = APIRouter(prefix="/tags", tags=["tags"])
admin_router = APIRouter(
    prefix="/admin/tags", tags=["admin-tags"], dependencies=[Depends(require_admin)]
)


def _tag_row(tag: Tag, post_count: int) -> dict:
    post_count = int(post_count or 0)
    return {
        "id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
        "description": tag.description,
        "created_at": tag.created_at,
        "updated_at": tag.updated_at,
        "post_count": post_count,
        "article_count": post_count,
    }


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or f"tag-{uuid4().hex[:8]}"


def _unique_slug(db: Session, value: str, tag_id: int | None = None) -> str:
    base = _slugify(value)
    candidate = base
    suffix = 2
    while True:
        statement = select(Tag.id).where(Tag.slug == candidate)
        if tag_id:
            statement = statement.where(Tag.id != tag_id)
        exists = db.scalar(statement)
        if not exists:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


@router.get("")
def list_tags(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Tag, func.count(Post.id))
        .outerjoin(post_tags, post_tags.c.tag_id == Tag.id)
        .outerjoin(
            Post,
            and_(
                Post.id == post_tags.c.post_id,
                Post.status == "published",
                Post.deleted_at.is_(None),
            ),
        )
        .group_by(Tag.id)
        .order_by(Tag.name.asc())
    ).all()
    return ok([_tag_row(tag, count) for tag, count in rows])


@router.get("/{slug}/posts")
def list_tag_posts(slug: str, page: int = 1, page_size: int = 10, db: Session = Depends(get_db)):
    tag = db.scalar(select(Tag).where(Tag.slug == slug))
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    statement = (
        select(Post)
        .join(Post.tags)
        .where(Tag.id == tag.id, Post.status == "published", Post.deleted_at.is_(None))
        .order_by(Post.published_at.desc().nullslast(), Post.id.desc())
    )
    return ok({"tag": tag, "posts": paginate(db, statement, page, page_size)})


@admin_router.get("")
def admin_list_tags(
    page: int | None = None,
    page_size: int | None = None,
    name: str | None = None,
    db: Session = Depends(get_db),
):
    statement = (
        select(Tag, func.count(post_tags.c.post_id))
        .outerjoin(post_tags, post_tags.c.tag_id == Tag.id)
        .group_by(Tag.id)
        .order_by(Tag.name.asc())
    )
    count_statement = select(func.count(Tag.id))

    keyword = name.strip() if name else ""
    if keyword:
        pattern = f"%{keyword}%"
        statement = statement.where(Tag.name.ilike(pattern))
        count_statement = count_statement.where(Tag.name.ilike(pattern))

    if page is None and page_size is None and not keyword:
        rows = db.execute(statement).all()
        return ok([_tag_row(tag, count) for tag, count in rows])

    current_page = max(page or 1, 1)
    current_page_size = min(max(page_size or 10, 1), 100)
    total = db.scalar(count_statement) or 0
    rows = db.execute(
        statement.offset((current_page - 1) * current_page_size).limit(current_page_size)
    ).all()
    return ok(
        {
            "items": [_tag_row(tag, count) for tag, count in rows],
            "total": total,
            "page": current_page,
            "page_size": current_page_size,
            "pages": ceil(total / current_page_size) if total else 0,
        }
    )


@admin_router.post("")
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    data["slug"] = _unique_slug(db, data.get("slug") or data["name"])
    tag = Tag(**data)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tag slug must be unique") from exc
    db.refresh(tag)
    return ok(tag)


@admin_router.put("/{tag_id}")
def update_tag(tag_id: int, payload: TagUpdate, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "slug" and value is None:
            continue
        if field == "slug" and value:
            value = _unique_slug(db, value, tag_id=tag.id)
        setattr(tag, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tag slug must be unique") from exc
    db.refresh(tag)
    return ok(tag)


@admin_router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    count = db.scalar(select(func.count(post_tags.c.post_id)).where(post_tags.c.tag_id == tag_id)) or 0
    if count:
        raise HTTPException(status_code=400, detail="Cannot delete a tag that has posts")
    db.delete(tag)
    db.commit()
    return ok(True)
