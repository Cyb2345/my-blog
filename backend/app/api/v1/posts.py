from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db, require_admin
from app.models.category import Category
from app.models.post import Post
from app.models.tag import Tag
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate
from app.services.post_service import paginate
from app.utils.response import ok

router = APIRouter(tags=["posts"])
admin_router = APIRouter(
    prefix="/admin/posts", tags=["admin-posts"], dependencies=[Depends(require_admin)]
)


def _post_options():
    return (selectinload(Post.category), selectinload(Post.tags), selectinload(Post.author))


def _category_dict(category: Category | None) -> dict | None:
    if category is None:
        return None
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "sort_order": category.sort_order,
        "created_at": category.created_at,
        "updated_at": category.updated_at,
    }


def _tag_dict(tag: Tag) -> dict:
    return {
        "id": tag.id,
        "name": tag.name,
        "slug": tag.slug,
        "description": tag.description,
        "created_at": tag.created_at,
        "updated_at": tag.updated_at,
    }


def _author_dict(user: User | None) -> dict | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar,
    }


def _post_dict(post: Post, include_content: bool = False) -> dict:
    data = {
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "summary": post.summary,
        "cover_image": post.cover_image,
        "status": post.status,
        "view_count": post.view_count,
        "is_recommended": post.is_recommended,
        "is_top": post.is_top,
        "category_id": post.category_id,
        "author": _author_dict(post.author),
        "category": _category_dict(post.category),
        "tags": [_tag_dict(tag) for tag in post.tags],
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "published_at": post.published_at,
    }
    if include_content:
        data["content"] = post.content
    return data


def _page_dict(page: dict, include_content: bool = False) -> dict:
    return {
        **page,
        "items": [_post_dict(post, include_content=include_content) for post in page["items"]],
    }


def _published_statement():
    return (
        select(Post)
        .options(*_post_options())
        .where(Post.status == "published", Post.deleted_at.is_(None))
        .order_by(Post.is_top.desc(), Post.published_at.desc().nullslast(), Post.id.desc())
    )


def _apply_public_filters(statement, keyword: str | None, category: str | None, tag: str | None):
    if keyword:
        like = f"%{keyword.strip()}%"
        statement = statement.where(
            or_(Post.title.ilike(like), Post.summary.ilike(like), Post.content.ilike(like))
        )
    if category:
        statement = statement.join(Post.category).where(Category.slug == category)
    if tag:
        statement = statement.join(Post.tags).where(Tag.slug == tag)
    return statement.distinct()


def _sync_tags(db: Session, post: Post, tag_ids: list[int]) -> None:
    if not tag_ids:
        post.tags = []
        return
    unique_ids = list(dict.fromkeys(tag_ids))
    tags = db.scalars(select(Tag).where(Tag.id.in_(unique_ids))).all()
    if len(tags) != len(unique_ids):
        raise HTTPException(status_code=400, detail="Some tags do not exist")
    post.tags = tags


def _ensure_category(db: Session, category_id: int | None) -> None:
    if category_id is None:
        return
    exists = db.scalar(select(Category.id).where(Category.id == category_id))
    if not exists:
        raise HTTPException(status_code=400, detail="Category does not exist")


def _parse_tag_ids(tag_id: int | None, tag_ids: str | None) -> list[int]:
    values: list[int] = []
    if tag_id is not None:
        values.append(tag_id)
    if tag_ids:
        for raw in tag_ids.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                values.append(int(raw))
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid tag_ids") from exc
    return list(dict.fromkeys(values))


@router.get("/posts")
def list_posts(
    page: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
    category: str | None = None,
    tag: str | None = None,
    db: Session = Depends(get_db),
):
    statement = _apply_public_filters(_published_statement(), keyword, category, tag)
    return ok(_page_dict(paginate(db, statement, page, page_size)))


@router.get("/posts/search")
def search_posts(
    keyword: str,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    statement = _apply_public_filters(_published_statement(), keyword, None, None)
    return ok(_page_dict(paginate(db, statement, page, page_size)))


@router.get("/posts/{slug}")
def get_post(slug: str, db: Session = Depends(get_db)):
    post = db.scalar(_published_statement().where(Post.slug == slug))
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    post.view_count += 1
    db.commit()
    db.refresh(post)

    all_posts = db.scalars(_published_statement()).unique().all()
    current_index = next((index for index, item in enumerate(all_posts) if item.id == post.id), -1)
    previous_post = all_posts[current_index + 1] if current_index + 1 < len(all_posts) else None
    next_post = all_posts[current_index - 1] if current_index > 0 else None

    return ok({
        "post": _post_dict(post, include_content=True),
        "previous": _post_dict(previous_post) if previous_post else None,
        "next": _post_dict(next_post) if next_post else None,
    })


@admin_router.get("")
def admin_list_posts(
    page: int = 1,
    page_size: int = 10,
    title: str | None = None,
    keyword: str | None = None,
    category_id: int | None = None,
    tag_id: int | None = None,
    tag_ids: str | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
):
    statement = (
        select(Post)
        .options(*_post_options())
        .where(Post.deleted_at.is_(None))
        .order_by(Post.is_top.desc(), Post.created_at.desc(), Post.id.desc())
    )
    search_title = (title or keyword or "").strip()
    if search_title:
        statement = statement.where(Post.title.ilike(f"%{search_title}%"))
    if category_id is not None:
        statement = statement.where(Post.category_id == category_id)
    selected_tag_ids = _parse_tag_ids(tag_id, tag_ids)
    if selected_tag_ids:
        statement = statement.join(Post.tags).where(Tag.id.in_(selected_tag_ids))
    if status_filter in {"draft", "published"}:
        statement = statement.where(Post.status == status_filter)
    return ok(_page_dict(paginate(db, statement.distinct(), page, page_size)))


@admin_router.post("")
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    _ensure_category(db, payload.category_id)
    data = payload.model_dump(exclude={"tag_ids"})
    data["created_by_id"] = current_user.id
    if payload.status == "published":
        data["published_at"] = datetime.now(timezone.utc)
    post = Post(**data)
    _sync_tags(db, post, payload.tag_ids)
    db.add(post)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Post slug must be unique") from exc
    post = db.scalar(select(Post).options(*_post_options()).where(Post.id == post.id))
    return ok(_post_dict(post, include_content=True))


@admin_router.get("/{post_id}")
def get_admin_post(post_id: int, db: Session = Depends(get_db)):
    post = db.scalar(
        select(Post)
        .options(*_post_options())
        .where(Post.id == post_id, Post.deleted_at.is_(None))
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return ok(_post_dict(post, include_content=True))


@admin_router.put("/{post_id}")
def update_post(
    post_id: int,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = db.scalar(select(Post).options(*_post_options()).where(Post.id == post_id))
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")

    data = payload.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)
    if "category_id" in data:
        _ensure_category(db, data["category_id"])
    for field, value in data.items():
        setattr(post, field, value)
    if post.created_by_id is None:
        post.created_by_id = current_user.id
    if payload.status == "published" and post.published_at is None:
        post.published_at = datetime.now(timezone.utc)
    if tag_ids is not None:
        _sync_tags(db, post, tag_ids)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Post slug must be unique") from exc
    post = db.scalar(select(Post).options(*_post_options()).where(Post.id == post_id))
    return ok(_post_dict(post, include_content=True))


@admin_router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "deleted"
    post.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return ok(True)


@admin_router.post("/{post_id}/publish")
def publish_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "published"
    if post.published_at is None:
        post.published_at = datetime.now(timezone.utc)
    db.commit()
    post = db.scalar(select(Post).options(*_post_options()).where(Post.id == post_id))
    return ok(_post_dict(post, include_content=True))


@admin_router.post("/{post_id}/unpublish")
def unpublish_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post or post.deleted_at:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "draft"
    db.commit()
    post = db.scalar(select(Post).options(*_post_options()).where(Post.id == post_id))
    return ok(_post_dict(post, include_content=True))
