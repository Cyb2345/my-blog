# 项目协作说明

- 后端代码位于 `backend/`，主入口是 `backend/app/main.py`。
- 前端代码位于 `frontend/`，使用 Next.js App Router。
- 新增后端表结构时，同步新增 Alembic migration。
- 后台接口必须挂 JWT 鉴权，公开接口只返回已发布内容。
- 不提交真实密钥，使用 `.env.example` 说明配置。
