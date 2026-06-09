from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.models.category import Category
from app.models.comment import Comment
from app.models.link import Link
from app.models.media import MediaAsset
from app.models.post import Post
from app.models.tag import Tag
from app.models.user import User
from app.utils.response import ok

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    total_posts = db.scalar(
        select(func.count(Post.id)).where(Post.deleted_at.is_(None))
    ) or 0
    published_posts = db.scalar(
        select(func.count(Post.id)).where(Post.status == "published", Post.deleted_at.is_(None))
    ) or 0
    draft_posts = db.scalar(
        select(func.count(Post.id)).where(Post.status == "draft", Post.deleted_at.is_(None))
    ) or 0
    return ok(
        {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts,
            "categories": db.scalar(select(func.count(Category.id))) or 0,
            "tags": db.scalar(select(func.count(Tag.id))) or 0,
            "comments": db.scalar(select(func.count(Comment.id))) or 0,
            "pending_comments": db.scalar(
                select(func.count(Comment.id)).where(Comment.status == "pending")
            )
            or 0,
            "links": db.scalar(select(func.count(Link.id))) or 0,
            "users": db.scalar(select(func.count(User.id))) or 0,
            "media": db.scalar(select(func.count(MediaAsset.id))) or 0,
        }
    )
