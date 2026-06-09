import type { Category, FriendLink, Paginated, Post, Tag } from "@/types/blog";

export const fallbackCategories: Category[] = [
  {
    id: 1,
    name: "Linux",
    slug: "linux",
    description: "系统运维与命令行实践",
    sort_order: 1,
    post_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "DevOps",
    slug: "devops",
    description: "自动化、CI/CD 与工程效率",
    sort_order: 2,
    post_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const fallbackTags: Tag[] = [
  {
    id: 1,
    name: "Python",
    slug: "python",
    description: "Python 后端学习",
    post_count: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Docker",
    slug: "docker",
    description: "容器部署",
    post_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "PostgreSQL",
    slug: "postgresql",
    description: "数据库",
    post_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const fallbackPosts: Post[] = [
  {
    id: 1,
    title: "用 FastAPI 搭一个能长期维护的博客后端",
    slug: "first-fastapi-blog",
    summary: "从路由、模型、迁移到 JWT 登录，梳理个人博客后端的第一版结构。",
    content: "# 用 FastAPI 搭一个能长期维护的博客后端\n\n后端先把模型、路由和 schema 分清楚。",
    cover_image: "/images/blog-hero.png",
    status: "published",
    view_count: 128,
    category: fallbackCategories[1],
    tags: [fallbackTags[0], fallbackTags[2]],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Linux 服务器排查笔记：从负载到日志",
    slug: "linux-observability-notes",
    summary: "整理一些日常排查服务器性能、服务状态和日志问题的命令。",
    content: "# Linux 服务器排查笔记\n\n常用入口：`uptime`、`top`、`journalctl`。",
    cover_image: "/images/blog-hero.png",
    status: "published",
    view_count: 89,
    category: fallbackCategories[0],
    tags: [fallbackTags[1]],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
];

export const fallbackPage: Paginated<Post> = {
  items: fallbackPosts,
  total: fallbackPosts.length,
  page: 1,
  page_size: 10,
  pages: 1,
};

export const fallbackLinks: FriendLink[] = [
  {
    id: 1,
    name: "FastAPI",
    url: "https://fastapi.tiangolo.com/",
    description: "现代 Python API 框架文档",
    avatar: "/images/blog-hero.png",
    status: "active",
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
