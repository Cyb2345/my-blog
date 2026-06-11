# 个人技术博客系统

一个按需求文档实现的前后端分离个人技术博客。后端使用 FastAPI、SQLAlchemy 2.x、Alembic、JWT 和 PostgreSQL；前端使用 Next.js、TypeScript 和 Tailwind CSS。

## 功能

- 前台：首页、文章列表、文章详情、分类、标签、搜索、时间线、友链、留言、关于
- 后台：登录、统计概览、文章管理、分类管理、标签管理、友链管理、留言审核
- 后端：JWT 鉴权、Markdown 文章内容、Cloudflare R2 图片上传、登录限流、软删除、分页与模糊搜索
- 部署：Docker Compose 启动 `postgres`、`backend`、`frontend`

## 本地环境

- Python 3.12 推荐
- Node.js 22 推荐
- PostgreSQL 16 推荐

## 后端启动

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python scripts/create_admin.py --username admin --password admin123456
uvicorn app.main:app --reload
```

后端地址：`http://localhost:8000`

健康检查：`http://localhost:8000/api/v1/health`

## 前端启动

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

前端地址：`http://localhost:3000`

## Docker Compose

```bash
docker compose up --build
```

首次启动会自动执行迁移并写入演示数据。默认后台账号：

```text
admin / admin123456
```

生产部署前请修改 `SECRET_KEY`、数据库密码和 Cloudflare R2 密钥。

服务器生产部署、Docker Compose 线上配置和 PostgreSQL 数据迁移步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 环境变量

后端：

- `DATABASE_URL`：PostgreSQL 连接串
- `SECRET_KEY`：JWT 签名密钥
- `ACCESS_TOKEN_EXPIRE_MINUTES`：Token 过期时间
- `BACKEND_CORS_ORIGINS`：允许的前端来源
- `R2_ENABLED`：是否启用 R2 图片上传，生产建议 `true`
- `R2_BUCKET_NAME`：Cloudflare R2 bucket 名称
- `R2_ENDPOINT`：Cloudflare R2 S3 API endpoint，例如 `https://<account_id>.r2.cloudflarestorage.com`
- `R2_PUBLIC_BASE_URL`：图片公开访问域名，当前为 `https://img.ccby.us`
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`：R2 API Token 密钥，只能写在后端环境变量中
- `R2_OBJECT_PREFIX`：必须为 `images`
- `MAX_UPLOAD_IMAGE_SIZE_MB`：单张图片最大上传大小，默认 `5`
- `LOGIN_RATE_LIMIT_PER_MINUTE`：同 IP 每分钟登录请求上限，默认 `5`
- `LOGIN_FAILURE_LOCK_THRESHOLD`：连续登录失败锁定阈值，默认 `5`
- `LOGIN_FAILURE_LOCK_MINUTES`：登录失败锁定分钟数，默认 `10`
- `CAPTCHA_RATE_LIMIT_PER_MINUTE`：同 IP 每分钟验证码请求上限，默认 `20`
- `MFA_RATE_LIMIT_PER_MINUTE`：同 IP 每分钟 MFA 验证请求上限，默认 `10`
- `PROMETHEUS_ENABLED`：是否启用 Prometheus 作为监控数据源
- `PROMETHEUS_BASE_URL`：后端访问 Prometheus 的内网地址，例如 `http://prometheus:9090`
- `PROMETHEUS_TIMEOUT_SECONDS`：Prometheus 查询超时时间
- `PROMETHEUS_DEFAULT_RANGE_MINUTES`：PromQL rate 默认查询窗口

前端：

- `NEXT_PUBLIC_API_BASE_URL`：后端 API 地址，默认 `http://localhost:8000/api/v1`

## Cloudflare R2 图片上传

所有后台图片上传都通过 FastAPI 后端接口完成：

```text
POST /api/v1/admin/uploads/image
```

支持用途包括：

```text
post_cover
article_image
login_background
site_hero
avatar
link_avatar
general
```

后端会校验图片类型和大小，仅允许 `jpg`、`jpeg`、`png`、`webp`，默认最大 `5MB`。图片会按用途缩放并转换为 WebP，然后上传到 Cloudflare R2。数据库 `media_assets` 只保存 URL、object key、bucket、尺寸、大小、用途等元数据，不保存图片二进制。

R2 object key 统一放在 `images/` 前缀下，例如：

```text
images/post-cover/2026/06/docker_a83f2c.webp
images/article/2026/06/wal_29ad81.webp
images/login-bg/2026/06/bg_91ac20.webp
images/hero/2026/06/home_72bd3e.webp
images/avatar/2026/06/user_7f2c19.webp
images/link-avatar/2026/06/site_abc123.webp
```

前端展示图片使用公开域名：

```text
https://img.ccby.us/images/...
```

Cloudflare 侧需要：

- 创建 R2 bucket，例如 `blog`
- 绑定自定义域 `img.ccby.us`
- 创建具有对象读写权限的 R2 API Token
- 为 `img.ccby.us` 配置图片缓存规则，建议 Edge TTL 7 到 30 天
- 可选配置 WAF 防盗链和图片域名速率限制

R2 密钥填写位置：

```text
backend/.env
```

可以从 `backend/.env.example` 复制一份：

```bash
cp backend/.env.example backend/.env
```

然后填写：

```text
R2_BUCKET_NAME=blog
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://img.ccby.us
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_OBJECT_PREFIX=images
```

不要把真实 `.env` 提交到仓库。Docker Compose 会在运行时读取 `backend/.env`，但 `backend/.dockerignore` 会避免 `.env` 被打包进镜像。

## 登录安全

后端对登录相关接口增加了内存限流，适合当前单实例个人项目：

- `GET /api/v1/auth/captcha`：同 IP 每分钟最多 20 次
- `POST /api/v1/auth/login`：同 IP 每分钟最多 5 次
- `POST /api/v1/auth/mfa/verify`：同 IP 每分钟最多 10 次
- 同一 IP 连续登录失败 5 次，锁定 10 分钟
- 同一用户名连续登录失败 5 次，锁定 10 分钟
- 登录成功后会清理该 IP 和用户名的失败计数

限流参数可在 `backend/.env` 中调整。当前 `RATE_LIMIT_BACKEND=memory`，多实例部署时建议后续扩展为 Redis。

## 监控中心

后台 `/admin/monitor/service` 支持服务监控。生产环境可部署 Prometheus、node-exporter 和 cAdvisor，后端会优先通过 Prometheus 查询宿主机与容器指标；Prometheus 不可用时自动回退到 psutil 基础监控。

Prometheus 不应暴露公网，推荐将 `backend` 与 `prometheus` 放入同一个 Docker 网络，并在后端环境变量中配置：

```env
PROMETHEUS_ENABLED=true
PROMETHEUS_BASE_URL=http://prometheus:9090
PROMETHEUS_TIMEOUT_SECONDS=5
PROMETHEUS_DEFAULT_RANGE_MINUTES=5
```

## 常见问题

- 前台看不到草稿：这是预期行为，公开接口只返回 `published` 文章。
- 分类/标签删除失败：已有文章关联时会阻止删除，先修改文章关联。
- Docker 前端无法访问 API：确认浏览器访问的后端地址是 `http://localhost:8000/api/v1`。

## 后续计划

- 关于页后台可编辑
- 文件上传 UI 与图片管理
- RSS 和站点地图
- 评论通知与更细的防刷策略
- Nginx/Traefik HTTPS 部署示例
