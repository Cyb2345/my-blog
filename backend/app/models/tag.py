from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.post import post_tags


class Tag(TimestampMixin, Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    slug: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    posts = relationship("Post", secondary=post_tags, back_populates="tags")
