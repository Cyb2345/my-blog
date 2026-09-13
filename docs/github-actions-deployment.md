# GitHub Actions 新服务器部署

## 部署链路

推送到 `schadcn` 后，GitHub 托管 runner 顺序构建后端与前端镜像，按完整提交 SHA 推送到 GHCR，再通过 SSH 将该 SHA 部署到目标服务器。服务器不执行源码构建。

当前临时入口使用服务器 IP：

- 站点：`http://SERVER_IP/`
- 后台：`http://SERVER_IP/admin/login`
- API：`http://SERVER_IP/api/v1`

Traefik 监听 80 端口，以 `/api` 和 `/uploads` 转发后端，其余路径转发前端。备案和域名准备完成后，再为 Traefik 增加 Host、HTTPS 与证书配置。

## 生产服务

`docker-compose.production.yml` 包含：

- Traefik `v3.7.4`
- PostgreSQL `16-alpine`
- Prometheus `v3.5.0`
- node-exporter `v1.8.2`
- cAdvisor `v0.49.1`
- 博客后端与前端 GHCR 镜像

PostgreSQL、Prometheus 和上传目录使用固定命名卷。PostgreSQL 与监控端口不映射到公网；只有 Traefik 的 80 端口对外提供服务。Prometheus 默认保留 15 天、最多 512MB 数据，以适配小内存服务器。

基础镜像需提前存在于目标服务器。部署脚本只拉取本项目的 GHCR 前后端镜像，避免目标网络访问 Docker Hub 不稳定时影响日常发布。

## 服务器文件

服务器配置目录默认为 `/opt/my-blog`：

```text
/opt/my-blog/
├── deploy.conf       # 非敏感部署参数
├── backend.env       # 后端密钥、数据库 URL、R2 配置
├── postgres.env      # PostgreSQL 账号和密码
├── backups/          # 迁移备份
├── releases/         # 按完整 SHA 保存的 Compose 与 Prometheus 配置
├── current-sha
└── previous-images.env
```

权限建议：目录 `0700`，三个配置文件和数据库备份 `0600`。示例 `deploy.conf`：

```bash
COMPOSE_PROJECT_NAME=my-blog
PUBLIC_API_BASE_URL=http://SERVER_IP/api/v1
BACKEND_ENV_FILE=/opt/my-blog/backend.env
POSTGRES_ENV_FILE=/opt/my-blog/postgres.env
POSTGRES_VOLUME=my-blog-postgres
UPLOADS_VOLUME=my-blog-uploads
PROMETHEUS_VOLUME=my-blog-prometheus
```

`backend.env` 至少应正确配置：

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@postgres:5432/DATABASE
SECRET_KEY=LONG_RANDOM_SECRET
BACKEND_CORS_ORIGINS=["http://SERVER_IP"]
PROMETHEUS_ENABLED=true
PROMETHEUS_BASE_URL=http://prometheus:9090
```

真实密钥只保存在服务器和 GitHub Actions Secrets，不提交仓库。

## GitHub Actions 配置

Repository Secrets：

| 名称 | 内容 |
| --- | --- |
| `SERVER_HOST` | 新服务器 IP |
| `SERVER_USER` | SSH 部署用户 |
| `SERVER_PORT` | SSH 端口 |
| `SERVER_SSH_KEY` | 专用部署私钥 |
| `SERVER_KNOWN_HOSTS` | 已与服务器本机公钥核对的 known_hosts 行 |

Repository Variables：

| 名称 | 内容 |
| --- | --- |
| `ENABLE_AUTO_DEPLOY` | `true` |
| `DEPLOY_PATH` | `/opt/my-blog` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://SERVER_IP/api/v1` |
| `BUILD_RUNNER` | 可省略，默认 `ubuntu-latest` |

工作流要求显式设置 `NEXT_PUBLIC_API_BASE_URL`，防止误把旧域名编译进前端镜像。

## 发布和回滚

部署脚本会：

1. 校验完整 SHA、服务器配置、基础镜像。
2. 使用 GitHub 短期令牌登录 GHCR。
3. 最多三次拉取当前 SHA 的前后端镜像。
4. 执行 Alembic migration 并等待 PostgreSQL、后端、前端健康检查。
5. 成功后写入 `current-sha`；失败时恢复上一次前后端镜像。

回滚只切换应用镜像，不回滚数据库 migration。服务器不会自动 prune 镜像或删除卷。

## 本地验证

```bash
for script in scripts/deploy/*.sh; do bash -n "$script"; done
bash scripts/deploy/test-deploy.sh
git diff --check
```
