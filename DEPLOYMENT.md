# Docker Compose 生产部署文档

本文档用于把当前个人博客项目部署到服务器，并把本地 PostgreSQL 数据迁移到线上环境。项目采用：

- 后端：FastAPI，目录 `backend/`
- 前端：Next.js App Router，目录 `frontend/`
- 数据库：PostgreSQL 16
- 图片存储：Cloudflare R2，数据库只保存图片 URL 和元数据
- 部署方式：Docker Compose

> 重要：不要把真实 `.env`、数据库备份文件、R2 密钥提交到 Git 仓库。

## 一、当前项目部署相关文件

| 文件 | 作用 | 线上是否需要改 |
| --- | --- | --- |
| `docker-compose.yml` | 本地 Compose 启动文件 | 需要，当前有本地默认值 |
| `backend/Dockerfile` | 后端镜像构建 | 通常不用改 |
| `frontend/Dockerfile` | 前端镜像构建 | 通常不用改 |
| `backend/.env.example` | 后端环境变量模板 | 不直接部署，复制为 `backend/.env` |
| `frontend/.env.example` | 前端环境变量模板 | 可复制为 `frontend/.env.production`，或直接写入 Compose |
| `backend/alembic/` | 数据库迁移脚本 | 部署时必须执行 `alembic upgrade head` |
| `backend/scripts/create_admin.py` | 创建或重置管理员账号 | 首次上线或忘记密码时使用 |
| `backend/scripts/seed_demo.py` | 本地演示数据 | 生产环境不要自动执行 |

## 二、线上必须修改的配置

当前 `docker-compose.yml` 偏本地开发，里面有这些默认值，生产环境必须替换。

### 1. PostgreSQL 用户名和密码

当前本地默认值：

```yaml
POSTGRES_DB: blog
POSTGRES_USER: blog
POSTGRES_PASSWORD: blog_password
```

生产环境建议：

- `POSTGRES_PASSWORD` 改为强密码
- 可以继续使用数据库名 `blog` 和用户名 `blog`
- 不要把 PostgreSQL 的 `5432` 端口暴露到公网

需要修改位置：

```text
docker-compose.yml
backend/.env
```

生产数据库连接串示例：

```env
DATABASE_URL=postgresql+psycopg://blog:你的强密码@postgres:5432/blog
```

注意：在 Docker Compose 内部，后端连接数据库主机名应使用服务名 `postgres`，不是 `localhost`。

### 2. 后端 SECRET_KEY

当前默认值不能用于生产：

```yaml
SECRET_KEY: please-change-this-secret-in-production
```

生产环境需要生成一个长随机字符串，例如：

```bash
openssl rand -hex 32
```

填写到：

```text
backend/.env
```

示例：

```env
SECRET_KEY=替换为openssl生成的长随机字符串
```

### 3. 前端访问后端 API 地址

当前默认值：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

生产环境需要改为公网 API 地址，例如：

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

需要修改位置：

```text
docker-compose.yml 的 frontend.environment
```

或：

```text
frontend/.env.production
```

如果前端和后端使用同一个域名，也可以通过反向代理把 `/api/v1` 转发到后端，此时可以配置为：

```env
NEXT_PUBLIC_API_BASE_URL=https://example.com/api/v1
```

### 4. 后端 CORS

当前默认值：

```env
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

生产环境应改为真实前端域名，例如：

```env
BACKEND_CORS_ORIGINS=["https://example.com"]
```

如果前端和 API 分域：

```env
BACKEND_CORS_ORIGINS=["https://example.com","https://www.example.com"]
```

填写到：

```text
backend/.env
```

### 5. Cloudflare R2 配置

R2 密钥只能放在后端环境变量中，不能放到前端。

填写位置：

```text
backend/.env
```

必须配置：

```env
R2_ENABLED=true
R2_BUCKET_NAME=blog
R2_ENDPOINT=https://你的account_id.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://img.ccby.us
R2_ACCESS_KEY_ID=你的R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=你的R2_SECRET_ACCESS_KEY
R2_OBJECT_PREFIX=images
MAX_UPLOAD_IMAGE_SIZE_MB=5
```

项目要求所有 R2 object key 都在 `images/` 前缀下，前端展示地址格式为：

```text
https://img.ccby.us/images/...
```

### 6. Prometheus 监控配置

如果线上启用 Prometheus、node-exporter 和 cAdvisor，后端需要能通过 Docker 内网访问 Prometheus。

后端环境变量：

```env
PROMETHEUS_ENABLED=true
PROMETHEUS_BASE_URL=http://prometheus:9090
PROMETHEUS_TIMEOUT_SECONDS=5
PROMETHEUS_DEFAULT_RANGE_MINUTES=5
```

Compose 中 `backend` 需要加入监控网络：

```yaml
services:
  backend:
    networks:
      - traefik_proxy
      - monitoring_net

networks:
  traefik_proxy:
    external: true
  monitoring_net:
    external: true
```

Prometheus 不应暴露公网；如果需要映射端口，只能绑定本机：

```yaml
ports:
  - "127.0.0.1:9090:9090"
```

### 7. 移除生产环境自动写入演示数据

当前 `docker-compose.yml` 后端启动命令包含：

```sh
python scripts/seed_demo.py
```

生产环境需要移除这一行，只保留数据库迁移和启动服务：

```sh
alembic upgrade head &&
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

原因：

- `seed_demo.py` 会写入演示文章、演示分类、演示标签和默认 admin
- 生产环境不应该反复执行演示数据初始化
- 管理员账号应使用 `scripts/create_admin.py` 单独创建或重置

### 8. PostgreSQL 端口暴露

当前本地 Compose 暴露了数据库端口：

```yaml
ports:
  - "5432:5432"
```

生产环境建议删除这个 `ports` 配置，让数据库只在 Docker 内部网络访问。

如果迁移期间需要临时连接，可以只绑定本机：

```yaml
ports:
  - "127.0.0.1:5432:5432"
```

迁移完成后建议关闭。

## 三、推荐生产目录结构

服务器上建议放到：

```text
/opt/personal-blog/
  docker-compose.yml
  backend/
    .env
  frontend/
  backups/
```

创建目录：

```bash
sudo mkdir -p /opt/personal-blog/backups
sudo chown -R $USER:$USER /opt/personal-blog
```

拉取代码：

```bash
cd /opt/personal-blog
git clone <你的仓库地址> .
```

如果不用 Git，也可以把项目目录上传到 `/opt/personal-blog`。

## 四、推荐生产版 Compose 配置

可以直接在服务器上把 `docker-compose.yml` 调整为下面这种结构。示例里的域名和密码都需要替换。

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: blog
      POSTGRES_USER: blog
      POSTGRES_PASSWORD: 替换为数据库强密码
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U blog -d blog"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: ./backend
    env_file:
      - ./backend/.env
    environment:
      PYTHONPATH: /app
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "alembic upgrade head &&
             uvicorn app.main:app --host 0.0.0.0 --port 8000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.example.com/api/v1
    depends_on:
      - backend
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

如果你暂时不用 Caddy/Nginx，也可以保留：

```yaml
ports:
  - "3000:3000"
```

和：

```yaml
ports:
  - "8000:8000"
```

但正式公网部署更推荐只暴露 `80/443`，由反向代理转发。

## 五、Caddy 反向代理示例

如果使用两个域名：

- 前台：`example.com`
- API：`api.example.com`

新增文件：

```text
deploy/Caddyfile
```

内容：

```caddyfile
example.com {
  encode gzip zstd
  reverse_proxy frontend:3000
}

api.example.com {
  encode gzip zstd
  reverse_proxy backend:8000
}
```

如果使用同一个域名：

```caddyfile
example.com {
  encode gzip zstd

  handle_path /api/* {
    reverse_proxy backend:8000
  }

  handle {
    reverse_proxy frontend:3000
  }
}
```

同域名方案下，前端环境变量可设置为：

```env
NEXT_PUBLIC_API_BASE_URL=https://example.com/api/v1
```

## 六、服务器首次部署步骤

### 1. 安装 Docker 和 Compose

以 Ubuntu 为例：

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
```

按 Docker 官方文档安装 Docker Engine 后检查：

```bash
docker version
docker compose version
```

### 2. 准备后端环境变量

复制模板：

```bash
cd /opt/personal-blog
cp backend/.env.example backend/.env
```

编辑：

```bash
nano backend/.env
```

生产示例：

```env
DATABASE_URL=postgresql+psycopg://blog:替换为数据库强密码@postgres:5432/blog
SECRET_KEY=替换为openssl生成的长随机字符串
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BACKEND_CORS_ORIGINS=["https://example.com"]

R2_ENABLED=true
R2_BUCKET_NAME=blog
R2_ENDPOINT=https://你的account_id.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://img.ccby.us
R2_ACCESS_KEY_ID=你的R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=你的R2_SECRET_ACCESS_KEY
R2_OBJECT_PREFIX=images
MAX_UPLOAD_IMAGE_SIZE_MB=5

RATE_LIMIT_BACKEND=memory
LOGIN_RATE_LIMIT_PER_MINUTE=5
LOGIN_FAILURE_LOCK_THRESHOLD=5
LOGIN_FAILURE_LOCK_MINUTES=10
CAPTCHA_RATE_LIMIT_PER_MINUTE=20
MFA_RATE_LIMIT_PER_MINUTE=10
```

### 3. 启动数据库

```bash
docker compose up -d postgres
docker compose ps
```

确认数据库健康后继续：

```bash
docker compose logs -f postgres
```

### 4. 启动后端和前端

```bash
docker compose up -d --build backend frontend
```

如果配置了 Caddy：

```bash
docker compose up -d --build
```

检查：

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

### 5. 创建或重置管理员

不要在命令历史里长期保留真实密码。可以临时执行：

```bash
docker compose run --rm \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_NICKNAME=Admin \
  -e ADMIN_PASSWORD='替换为管理员强密码' \
  backend python scripts/create_admin.py
```

脚本行为：

- 如果 admin 不存在，会创建 admin
- 如果 admin 已存在，会更新密码、昵称、邮箱和角色

## 七、本地 PostgreSQL 迁移到线上

迁移前请确认线上环境已经配置好 `backend/.env`，并且线上 PostgreSQL 使用 PostgreSQL 16。

### 方案 A：本地数据库来自 Docker Compose

在本地项目目录执行：

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U blog -d blog -Fc > backups/blog_$(date +%F_%H%M).dump
```

说明：

- `-Fc` 表示 PostgreSQL 自定义格式，适合用 `pg_restore` 恢复
- 当前本地默认用户名是 `blog`
- 当前本地默认数据库是 `blog`
- 如果你已经改过本地数据库用户名或库名，请同步替换命令

把备份传到服务器：

```bash
scp backups/blog_YYYY-MM-DD_HHMM.dump user@server:/opt/personal-blog/backups/
```

### 方案 B：本地数据库直接运行在宿主机

如果不是 Docker Compose 数据库，而是本机 PostgreSQL：

```bash
mkdir -p backups
PGPASSWORD='你的本地数据库密码' pg_dump \
  -h localhost \
  -p 5432 \
  -U blog \
  -d blog \
  -Fc \
  -f backups/blog_$(date +%F_%H%M).dump
```

### 线上恢复数据库

先启动线上 PostgreSQL：

```bash
cd /opt/personal-blog
docker compose up -d postgres
```

如果线上数据库是空库，执行：

```bash
docker compose exec -T postgres pg_restore \
  -U blog \
  -d blog \
  --no-owner \
  --no-privileges \
  < backups/blog_YYYY-MM-DD_HHMM.dump
```

如果线上数据库已经有数据，并且确认要用本地备份覆盖线上数据，执行：

```bash
docker compose exec -T postgres pg_restore \
  -U blog \
  -d blog \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  < backups/blog_YYYY-MM-DD_HHMM.dump
```

> `--clean --if-exists` 会删除线上已有对象后再恢复。执行前务必确认备份无误。

恢复后执行迁移：

```bash
docker compose run --rm backend alembic upgrade head
```

然后启动服务：

```bash
docker compose up -d --build backend frontend
```

如果有 Caddy：

```bash
docker compose up -d --build
```

### 迁移后检查

```bash
docker compose exec postgres psql -U blog -d blog -c "\dt"
docker compose exec postgres psql -U blog -d blog -c "select count(*) from posts;"
docker compose exec postgres psql -U blog -d blog -c "select count(*) from media_assets;"
```

检查 Alembic 版本：

```bash
docker compose exec postgres psql -U blog -d blog -c "select * from alembic_version;"
```

当前项目至少应包含这些迁移：

```text
0001_initial
0002_site_users_media
0003_r2_media_metadata
```

## 八、图片和 R2 数据迁移说明

当前项目新的图片上传已经走 Cloudflare R2：

- 数据库存储 `url`
- 数据库存储 `object_key`
- 数据库存储 `bucket`
- 数据库存储 `mime_type`、尺寸、大小等元数据
- 不存储图片二进制

因此 PostgreSQL 迁移时会迁移图片引用信息，但不会迁移图片文件本身。

需要确认：

1. R2 bucket 线上仍然是同一个 bucket，或图片已经复制到新的 bucket
2. `R2_PUBLIC_BASE_URL` 仍然能访问旧图片 URL
3. 数据库里的图片 URL 形如：

```text
https://img.ccby.us/images/...
```

如果数据库里还有旧的本地图片路径，例如：

```text
/images/blog-hero.png
/uploads/...
```

需要二选一处理：

- 保留这些静态资源在前端 `public/` 或后端 `/uploads` 中
- 或手动重新上传到 R2，并更新数据库中的 URL

## 九、上线验证清单

### 服务状态

```bash
docker compose ps
```

所有核心服务应为 `running` 或 `healthy`：

- `postgres`
- `backend`
- `frontend`
- `caddy`，如果使用

### 后端健康检查

```bash
curl https://api.example.com/api/v1/health
```

应返回：

```json
{"code":0,"message":"ok","data":{"status":"healthy"}}
```

### 前端访问

浏览器访问：

```text
https://example.com
```

检查：

- 首页可打开
- 文章列表可打开
- 搜索页可打开
- 后台登录页可打开

### 管理后台

检查：

- 管理员可以登录
- 可以新增文章
- 可以上传文章封面
- 可以上传首页 Hero 图
- 可以上传友链头像
- 可以上传用户头像

上传成功后，返回图片地址必须是：

```text
https://img.ccby.us/images/...
```

### CORS

如果前端请求后端失败，优先检查：

```text
backend/.env
BACKEND_CORS_ORIGINS
```

里面必须包含真实前端域名。

### 前端 API 地址

如果前端访问的是 `localhost:8000`，说明生产构建时 `NEXT_PUBLIC_API_BASE_URL` 没改。

检查：

```text
docker-compose.yml
frontend.environment.NEXT_PUBLIC_API_BASE_URL
```

改完后需要重新构建前端：

```bash
docker compose up -d --build frontend
```

## 十、安全建议

生产环境至少做到：

- 只开放 `80`、`443`、`22`
- PostgreSQL 不暴露公网
- `SECRET_KEY` 使用强随机值
- 数据库密码使用强密码
- R2 密钥只放在 `backend/.env`
- `.env` 不提交 Git
- 后台管理员密码使用强密码
- Cloudflare R2 API Token 只给目标 bucket 必要权限
- 定期备份 PostgreSQL
- 重要升级前先做 `pg_dump`

服务器防火墙示例：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 十一、备份和恢复

### 定期备份 PostgreSQL

服务器上执行：

```bash
mkdir -p /opt/personal-blog/backups
cd /opt/personal-blog
docker compose exec -T postgres pg_dump -U blog -d blog -Fc > backups/blog_$(date +%F_%H%M).dump
```

建议把备份同步到另一台机器或对象存储。

### 恢复备份

```bash
cd /opt/personal-blog
docker compose up -d postgres
docker compose exec -T postgres pg_restore \
  -U blog \
  -d blog \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  < backups/blog_YYYY-MM-DD_HHMM.dump
docker compose run --rm backend alembic upgrade head
docker compose up -d --build
```

## 十二、升级发布流程

每次更新代码后：

```bash
cd /opt/personal-blog
git pull
docker compose build backend frontend
docker compose run --rm backend alembic upgrade head
docker compose up -d
docker compose logs -f backend
```

如果前端环境变量有变化，必须重新构建前端镜像：

```bash
docker compose up -d --build frontend
```

## 十三、需要改动项汇总

上线前必须改：

| 位置 | 当前问题 | 生产改法 |
| --- | --- | --- |
| `docker-compose.yml` 的 `POSTGRES_PASSWORD` | 默认 `blog_password` | 改强密码 |
| `docker-compose.yml` 的 `postgres.ports` | 暴露 `5432:5432` | 删除或仅绑定 `127.0.0.1` |
| `docker-compose.yml` 的 `backend.environment.DATABASE_URL` | 默认本地密码 | 改为线上数据库连接串，或交给 `backend/.env` |
| `docker-compose.yml` 的 `backend.environment.SECRET_KEY` | 默认弱密钥 | 改强随机值，或交给 `backend/.env` |
| `docker-compose.yml` 的 `BACKEND_CORS_ORIGINS` | 只允许 localhost | 改真实前端域名 |
| `docker-compose.yml` 的 `frontend.environment.NEXT_PUBLIC_API_BASE_URL` | 指向 localhost | 改公网 API 地址 |
| `docker-compose.yml` 的 `backend.command` | 自动执行 `seed_demo.py` | 生产删除演示数据脚本 |
| `backend/.env` | 本地模板配置 | 写入线上 DB、JWT、R2、CORS |
| `frontend/.env.production` 或 Compose | 本地 API 地址 | 写入公网 API 地址 |
| DNS | 未配置 | 前端域名指向服务器，图片域名指向 R2 |
| 反向代理 | 当前未内置生产代理 | 建议使用 Caddy/Nginx，通过 Compose 管理 |
| PostgreSQL 数据 | 本地 Docker volume | 使用 `pg_dump` 导出，线上 `pg_restore` 恢复 |

建议改：

| 位置 | 建议 |
| --- | --- |
| `docker-compose.yml` | 增加 `restart: unless-stopped` |
| `docker-compose.yml` | 增加 Caddy/Nginx 服务统一处理 HTTPS |
| `backend/.env` | 按生产访问量调整登录限流参数 |
| 服务器 | 开启防火墙，只暴露 80/443/22 |
| 备份策略 | 定期 `pg_dump` 并异地保存 |
