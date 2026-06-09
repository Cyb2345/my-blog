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
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "sort_order": category.sort_order,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
        "post_count": post_count,
    }


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
def admin_list_categories(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Category, func.count(Post.id))
        .outerjoin(Post, Post.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.sort_order.asc(), Category.name.asc())
    ).all()
    return ok([_category_row(category, count) for category, count in rows])


@admin_router.post("")
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    category = Category(**payload.model_dump())
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
