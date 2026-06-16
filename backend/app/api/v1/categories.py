from math import ceil
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.category import Category
from app.models.post import Post
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.post_service import paginate
from app.utils.response import ok

router = APIRouter(prefix="/categories", tags=["categories"])
admin_router = APIRouter(
    prefix="/admin/categories", tags=["admin-categories"], dependencies=[Depends(require_admin)]
)


def _category_row(category: Category, post_count: int) -> dict:
    post_count = int(post_count or 0)
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "sort_order": category.sort_order,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
        "post_count": post_count,
        "article_count": post_count,
    }


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or f"category-{uuid4().hex[:8]}"


def _unique_slug(db: Session, value: str, category_id: int | None = None) -> str:
    base = _slugify(value)
    candidate = base
    suffix = 2
    while True:
        statement = select(Category.id).where(Category.slug == candidate)
        if category_id:
            statement = statement.where(Category.id != category_id)
        exists = db.scalar(statement)
        if not exists:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


@router.get("")
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Category, func.count(Post.id))
        .outerjoin(
            Post,
            and_(
                Post.category_id == Category.id,
                Post.status == "published",
                Post.deleted_at.is_(None),
            ),
        )
        .group_by(Category.id)
        .order_by(Category.sort_order.asc(), Category.name.asc())
    ).all()
    return ok([_category_row(category, count) for category, count in rows])


@router.get("/{slug}/posts")
def list_category_posts(
    slug: str, page: int = 1, page_size: int = 10, db: Session = Depends(get_db)
):
    category = db.scalar(select(Category).where(Category.slug == slug))
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    statement = (
        select(Post)
        .where(
            Post.category_id == category.id,
            Post.status == "published",
            Post.deleted_at.is_(None),
        )
        .order_by(Post.published_at.desc().nullslast(), Post.id.desc())
    )
    return ok({"category": category, "posts": paginate(db, statement, page, page_size)})


@admin_router.get("")
def admin_list_categories(
    page: int | None = None,
    page_size: int | None = None,
    name: str | None = None,
    db: Session = Depends(get_db),
):
    post_counts = (
        select(Post.category_id.label("category_id"), func.count(Post.id).label("post_count"))
        .group_by(Post.category_id)
        .subquery()
    )
    statement = (
        select(Category, func.coalesce(post_counts.c.post_count, 0))
        .outerjoin(post_counts, post_counts.c.category_id == Category.id)
        .order_by(Category.sort_order.asc(), Category.name.asc())
    )
    count_statement = select(func.count(Category.id))

    keyword = name.strip() if name else ""
    if keyword:
        pattern = f"%{keyword}%"
        statement = statement.where(Category.name.ilike(pattern))
        count_statement = count_statement.where(Category.name.ilike(pattern))

    if page is None and page_size is None and not keyword:
        rows = db.execute(statement).all()
        return ok([_category_row(category, count) for category, count in rows])

    current_page = max(page or 1, 1)
    current_page_size = min(max(page_size or 10, 1), 100)
    total = db.scalar(count_statement) or 0
    rows = db.execute(
        statement.offset((current_page - 1) * current_page_size).limit(current_page_size)
    ).all()
    return ok(
        {
            "items": [_category_row(category, count) for category, count in rows],
            "total": total,
            "page": current_page,
            "page_size": current_page_size,
            "pages": ceil(total / current_page_size) if total else 0,
        }
    )


@admin_router.post("")
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    data["slug"] = _unique_slug(db, data.get("slug") or data["name"])
    category = Category(**data)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category slug must be unique") from exc
    db.refresh(category)
    return ok(category)


@admin_router.put("/{category_id}")
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "slug" and value is None:
            continue
        if field == "slug" and value:
            value = _unique_slug(db, value, category_id=category.id)
        setattr(category, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category slug must be unique") from exc
    db.refresh(category)
    return ok(category)


@admin_router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    count = db.scalar(select(func.count(Post.id)).where(Post.category_id == category_id)) or 0
    if count:
        raise HTTPException(status_code=400, detail="Cannot delete a category that has posts")
    db.delete(category)
    db.commit()
    return ok(True)
