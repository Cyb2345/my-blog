# 从 Jenkins 切换到 GitHub Actions

## 部署链路

推送到 `schadcn` → GitHub 托管 runner 构建两个 Docker 镜像 → 推送 GHCR → SSH 到服务器拉取镜像 → Compose 更新容器并检查健康状态。

生产服务器不再运行 npm install、Next.js build 或 Docker build。运行中的应用、数据库本身仍需要足够内存；迁移减少的是构建和 Jenkins 的资源开销。

- `.github/workflows/deploy.yml`：构建和部署入口。
- `docker-compose.production.yml`：只使用镜像的生产配置，保留当前域名、Traefik 网络和路由。
- `scripts/deploy/remote.sh`：校验 SSH 主机、传输本次部署文件。
- `scripts/deploy/deploy.sh`：服务器部署锁、拉取、健康检查和失败回退。
- 原 `docker-compose.yml` 与 Jenkins 配置暂时保留，便于切换前继续使用；不会自动停止 Jenkins。

镜像地址使用小写仓库路径，标签为完整 40 位提交 SHA：

```text
ghcr.io/cyb2345/my-blog/backend:<完整提交SHA>
ghcr.io/cyb2345/my-blog/frontend:<完整提交SHA>
```

不使用 latest。短 SHA 或尚未构建过的提交没有对应镜像。

## 1. 准备服务器

以实际部署用户执行。需有 Bash、tar、flock、Docker 与支持 `up --wait` 的 Docker Compose V2 或更新版本，以及 SSH 服务。部署用户应能直接执行 Docker 命令并写入部署目录；Docker 权限相当于服务器高权限，使用专用部署账户和专用 SSH 密钥。

```bash
docker compose version
command -v flock
uname -m
docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' blog-backend
docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/uploads"}}{{.Type}} {{.Name}} {{.Source}}{{end}}{{end}}' blog-backend
docker network inspect traefik_proxy monitoring_net
```

记录原 Compose 项目名和 uploads 的真实卷名。生产文件将其作为外部卷使用，避免新目录导致新建空卷。脚本默认从现有 `blog-backend` 自动识别，也可显式配置。

本方案适用于当前命名卷部署；如果结果为 bind mount，应先相应调整生产 Compose 挂载，不要将目录名填为卷名。

由管理员创建 `/opt/my-blog` 并赋予部署用户写权限。确认现有后端配置 `/opt/.env` 存在且部署用户可读，不复制到 GitHub 或镜像。可在服务器创建 `/opt/my-blog/deploy.conf`：

```bash
# 填实际已有值，不是新建卷名。文件内容按 Bash 语法解析。
COMPOSE_PROJECT_NAME='原Compose项目名'
UPLOADS_VOLUME='原uploads卷名'
BACKEND_ENV_FILE='/opt/.env'
```

执行 `chmod 600 /opt/my-blog/deploy.conf`。脚本不会删除卷，也不会修改后端 env 文件。先保留上传数据和数据库备份。

默认构建为 x86_64。若服务器 `uname -m` 为 aarch64，在下文 Variables 设置 `BUILD_RUNNER=ubuntu-24.04-arm`，使用 GitHub 托管 ARM runner；不要在这台低内存生产服务器上安装 self-hosted runner 进行构建。

## 2. 配置部署 SSH 密钥

在可信本机创建专用密钥：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/my-blog-actions -C my-blog-actions
```

无人值守脚本当前使用无口令专用密钥。将 `~/.ssh/my-blog-actions.pub` 的内容加入服务器部署账户的 `~/.ssh/authorized_keys`，保留原有条目；目录权限 700，authorized_keys 权限 600。私钥仅存入 GitHub Secret，勿提交到仓库。

通过已有可信服务器连接获取 SSH 主机公钥及指纹：

```bash
cat /etc/ssh/ssh_host_ed25519_key.pub
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

构造 known_hosts 内容，使用 Actions 实际连接的域名或 IP：

```text
服务器域名或IP ssh-ed25519 主机公钥内容
```

非 22 端口格式：

```text
[服务器域名或IP]:端口 ssh-ed25519 主机公钥内容
```

通过可信渠道核对指纹后保存。不要未经核验就信任网络扫描出的主机密钥。脚本使用 StrictHostKeyChecking=yes，目前 SERVER_HOST 接受 IPv4 或域名。

## 3. 在 GitHub 填写 Secrets 与 Variables

进入仓库 → **Settings → Secrets and variables → Actions**。

### Secrets → New repository secret

| 名称 | 填写内容 |
| --- | --- |
| SERVER_HOST | 服务器公网 IPv4 或域名，不带协议 |
| SERVER_USER | 部署账户 |
| SERVER_PORT | SSH 端口，可省略，默认 22 |
| SERVER_SSH_KEY | 专用私钥完整内容，包括 BEGIN/END 行 |
| SERVER_KNOWN_HOSTS | 上一步核验后的 known_hosts 内容 |

`GITHUB_TOKEN` 由 GitHub 自动提供，不需要手工创建。构建任务有 `packages: write` 权限，用于发布镜像；SSH 部署不转发此 token。

### Variables → New repository variable

| 名称 | 值 |
| --- | --- |
| ENABLE_AUTO_DEPLOY | **准备完成前不要设置 true**；设置 true 才允许更新服务器 |
| DEPLOY_PATH | 可省略，默认 /opt/my-blog，使用无空格绝对路径 |
| BUILD_RUNNER | 可省略，默认 ubuntu-latest；ARM 服务器用 ubuntu-24.04-arm |
| NEXT_PUBLIC_API_BASE_URL | 可省略，默认 https://www.ccby.us/api/v1，编译进前端 |

本次没有改变业务域名。换域名时还需同步修改生产 Compose 的 Traefik Host 规则和相关环境配置，单独改 API_URL 不代表整个域名配置已更新。

## 4. 首次构建

提交推送后，进入仓库 **Actions → Build and Deploy**。即使未启用自动部署，build 仍会构建并发布镜像，deploy 显示跳过属于预期。

如果构建镜像发布报权限问题，检查仓库 Actions 权限和对应 Package 的 Actions access 是否允许本仓库写入。

部署任务使用 GitHub 自动签发、短期有效的 `GITHUB_TOKEN` 拉取当前仓库镜像。令牌通过 SSH 标准输入发送，服务器仅在临时 `DOCKER_CONFIG` 中使用，部署结束即删除；服务器不需要保存 classic PAT 或长期 GHCR 登录信息。

Actions build 成功后，可先保持 `ENABLE_AUTO_DEPLOY` 关闭。服务器镜像拉取权限、网络和 CPU 架构会在首次 deploy 中统一验证。

## 5. 正式切换

1. 确认 Actions 的 build 成功，服务器已能拉取两个镜像。
2. **禁用 Jenkins 当前任务的自动触发/定时构建**，等已运行任务结束，避免两个系统同时更新同名容器。
3. 设置 Repository Variable：`ENABLE_AUTO_DEPLOY=true`。
4. 再次向 `schadcn` 推送提交，触发完整部署；也可在 GitHub 界面重跑整个工作流。只有 workflow 文件在默认分支中时，手动 Run workflow 入口才会出现。
5. 检查 deploy 日志和服务器 `docker ps`，访问前台、后台登录、API 和历史上传文件。
6. 验证完成后再停止不再使用的 Jenkins 服务/容器，释放常驻内存。

完整构建在云端，服务器只 pull 和 up。原容器在拉取失败时不变；容器更新过程可能短暂中断服务，不是蓝绿或零停机部署。

GitHub workflow concurrency 与服务器 flock 两层避免并发。GitHub 可替换尚未开始的待执行工作流，已开始的部署不会主动取消。

## 6. 失败处理与回滚

- pull 失败：尚未更新容器，检查 Actions 的 `packages: read` 权限、镜像标签、服务器网络和磁盘。
- up 或健康检查失败：尝试用更新前的两个镜像恢复容器，仍将该部署标记为失败。
- 后端健康探测 `/api/v1/health`、前端探测 `/admin/login`；它们不覆盖全部业务，应另行检查登录、数据和上传。
- 回退仅切换镜像，不撤销数据库变更；旧镜像缺失或旧服务本身不健康时，回退也可能失败，应查看 Actions 和容器日志。
- 原镜像不做自动 prune；自行监控磁盘空间，并保留可用回滚版本。

服务器保存：
- `releases/<完整SHA>/compose.yml`：各次发布配置。
- `current-sha`：最后成功发布的 SHA。
- `previous-images.env`：最近一次尝试更新前的镜像引用（首次迁移时也可能是 Jenkins 的本地镜像）。

手工恢复最近一次更新前镜像，先暂停自动部署，确认没有 Jenkins 部署，并以部署账户执行：

```bash
cd /opt/my-blog
exec 9>.deploy.lock
flock -w 300 9
set -a
source deploy.conf
source previous-images.env
set +a
# RELEASE 改成发生故障的那次完整 SHA
RELEASE='完整40位SHA'
docker compose -p "$COMPOSE_PROJECT_NAME" -f "releases/$RELEASE/compose.yml" \
  up -d --no-build --pull never --wait --wait-timeout 180
flock -u 9
exec 9>&-
```

执行前应确认 deploy.conf 已填入真实项目名、卷名和 env 文件。恢复更早的 Actions 版本时，将两个 IMAGE 环境变量设为那个版本的完整 SHA，再 pull/up。不要用 `docker compose down -v`，也不要在回滚前删除旧镜像。

## 本地验证

```bash
for script in scripts/deploy/*.sh; do bash -n "$script"; done
bash scripts/deploy/test-deploy.sh
git diff --check
```

测试使用模拟 Docker，覆盖成功、拉取失败、健康检查失败回退、缺少上传卷和无效 SHA，不连接生产服务器。
