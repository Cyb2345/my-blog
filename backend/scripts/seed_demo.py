from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.comment import Comment
from app.models.link import Link
from app.models.post import Post
from app.models.tag import Tag
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        if not db.scalar(select(User).where(User.username == "admin")):
            db.add(
                User(
                    username="admin",
                    password_hash=get_password_hash("admin123456"),
                    nickname="站长",
                )
            )

        categories = [
            Category(name="Linux", slug="linux", description="系统运维和命令行实践", sort_order=1),
            Category(name="DevOps", slug="devops", description="自动化、CI/CD 与工程效率", sort_order=2),
            Category(name="Docker", slug="docker", description="容器与部署笔记", sort_order=3),
        ]
        for category in categories:
            if not db.scalar(select(Category).where(Category.slug == category.slug)):
                db.add(category)
        db.flush()

        tags = [
            Tag(name="Python", slug="python", description="Python 后端学习"),
            Tag(name="PostgreSQL", slug="postgresql", description="数据库实践"),
            Tag(name="Kubernetes", slug="kubernetes", description="集群与云原生"),
            Tag(name="Monitoring", slug="monitoring", description="监控告警"),
        ]
        for tag in tags:
            if not db.scalar(select(Tag).where(Tag.slug == tag.slug)):
                db.add(tag)
        db.flush()

        linux = db.scalar(select(Category).where(Category.slug == "linux"))
        devops = db.scalar(select(Category).where(Category.slug == "devops"))
        python = db.scalar(select(Tag).where(Tag.slug == "python"))
        postgres = db.scalar(select(Tag).where(Tag.slug == "postgresql"))
        monitoring = db.scalar(select(Tag).where(Tag.slug == "monitoring"))

        if not db.scalar(select(Post).where(Post.slug == "first-fastapi-blog")):
            db.add(
                Post(
                    title="用 FastAPI 搭一个能长期维护的博客后端",
                    slug="first-fastapi-blog",
                    summary="从路由、模型、迁移到 JWT 登录，梳理个人博客后端的第一版结构。",
                    content="""# 用 FastAPI 搭一个能长期维护的博客后端

这篇文章记录个人博客第一版后端的结构选择。

```python
from fastapi import FastAPI

app = FastAPI()
```

后端先把模型、路由和 schema 分清楚，后续迭代会轻松很多。
""",
                    cover_image="/images/blog-hero.png",
                    status="published",
                    category=devops,
                    tags=[python, postgres],
                    published_at=datetime.now(timezone.utc),
                )
            )

        if not db.scalar(select(Post).where(Post.slug == "linux-observability-notes")):
            db.add(
                Post(
                    title="Linux 服务器排查笔记：从负载到日志",
                    slug="linux-observability-notes",
                    summary="整理一些日常排查服务器性能、服务状态和日志问题的命令。",
                    content="""# Linux 服务器排查笔记

常用入口：

- `uptime` 看负载
- `top` 看进程
- `journalctl -u service-name` 看服务日志

排查时先确认现象，再缩小范围。
""",
                    cover_image="/images/blog-hero.png",
                    status="published",
                    category=linux,
                    tags=[monitoring],
                    published_at=datetime.now(timezone.utc),
                )
            )

        if not db.scalar(select(Link).where(Link.url == "https://fastapi.tiangolo.com/")):
            db.add(
                Link(
                    name="FastAPI",
                    url="https://fastapi.tiangolo.com/",
                    description="现代 Python API 框架文档",
                    avatar="/images/blog-hero.png",
                    sort_order=1,
                )
            )

        if not db.scalar(select(Comment).where(Comment.nickname == "访客")):
            db.add(
                Comment(
                    nickname="访客",
                    email="visitor@example.com",
                    content="这个博客第一版已经很适合写技术笔记了。",
                    status="approved",
                )
            )

        db.commit()
        print("Demo data seeded. Use scripts/create_admin.py to set or rotate admin credentials.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
