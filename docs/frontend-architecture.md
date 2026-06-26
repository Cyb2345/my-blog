# 前端架构

## 项目目录

```text
frontend/
  app/                  Next.js App Router 页面
  app/admin/            后台页面和后台 layout
  components/ui/        基础 UI 组件
  components/admin/     后台业务组件和兼容组件
  components/blog/      前台文章阅读组件
  components/layout/    前台布局组件
  components/theme/     明暗主题组件
  lib/                  API、鉴权、工具函数、缓存
  styles/               设计 token、主题、动画
  types/                前后端共享类型
```

## 页面目录

公开页面位于 `frontend/app`，例如文章、分类、标签、友链、留言、搜索和时间线。公开页面只能展示已发布内容，数据通过 `frontend/lib/api.ts` 获取。

后台页面位于 `frontend/app/admin`。当前存在两类路径：

- 旧路径：`posts`、`categories`、`tags`、`links`、`comments`、`users` 等。
- 新菜单路径：`content/*`、`site/*`、`system/*`，多数 re-export 旧路径页面。

迁移时保留两类路由，不破坏已有菜单和浏览器收藏地址。

## 组件目录

`components/ui` 放基础组件，不依赖后台业务和接口。

`components/admin` 放后台业务组件，例如：

- `AdminPage`
- `AdminSearchForm`
- `AdminTableToolbar`
- `AdminDataTable`
- `StatusTag`
- `RowActions`
- `DeleteConfirm`
- `AdminShell`
- `AdminTopBar`
- `AdminTabs`
- `AdminSettingsDrawer`

旧组件如 `AdminModal`、`DataTableToolbar`、`DeleteConfirmDialog` 保留为兼容层，新增页面优先使用新命名组件。

## 布局目录

后台 layout 入口是 `frontend/app/admin/layout.tsx`，它在非登录页挂载 `AdminShell`。`AdminShell` 负责：

- 侧边栏
- 顶部栏
- 面包屑
- 多标签栏
- 设置中心
- 页面切换动画
- 登录态检查
- 后台菜单和站点 logo 拉取

Layout 必须稳定挂载，页面切换只替换主内容区域。

## API 请求

- 公开 API 封装：`frontend/lib/api.ts`
- 后台鉴权请求：`frontend/lib/auth.ts`
- 后台页面缓存：`frontend/lib/adminPageCache.ts`

后台增删改查必须使用带 JWT 的 `adminRequest` 或上传封装 `adminUpload`，不得依赖 Server Actions。

## 样式目录

全局 CSS 入口为 `frontend/app/globals.css`。设计系统 token 拆分在：

- `frontend/styles/tokens.css`
- `frontend/styles/theme.css`
- `frontend/styles/motion.css`

Tailwind 只作为 token 消费层，不在页面里新增随机颜色。

## 主题系统

公开主题由 `ThemeProvider` / `ThemeToggle` 管理。后台主题由 `AdminLayoutContext` 管理，并保存到 localStorage：

- `admin_primary_color`
- `admin_box_style`
- `admin_container_width`
- `admin_page_transition`
- `admin_radius`
- `admin_font_size`
- `admin_menu_width`

后台设置通过 CSS variables 和 `data-admin-*` 属性即时生效。

## 权限系统

后台页面进入 `AdminShell` 后检查本地 token。若没有 token，跳转 `/admin/login`。后台请求必须带 JWT，后端接口负责最终鉴权。

## 状态管理

当前主要使用 React 本地状态和 localStorage。页面级表格设置通过 `useTableSettings` 保存，后台布局设置通过 `AdminLayoutContext` 保存。

新增全局状态前必须先确认是否能通过 URL、组件 props、localStorage 或现有 context 解决。

## 审计问题清单

- 表格：多页面手写 `<table>`、分页、选择列、空状态和状态标签。
- 表单：查询表单样式重复，部分页面直接写 input/select class。
- 弹窗：大多复用 `AdminModal`，但 footer 和表单按钮位置仍散落在页面中。
- 状态标签：友链、文件、配置、日志等页面重复写 emerald/rose/blue 样式。
- 动画：已有后台页面切换轻量动画，但全局 `.motion-list`、`.admin-table tbody tr` 曾对列表行做动画，后台已通过 `.admin-shell` 禁用。
- 深色模式：存在大量 `dark:bg-slate-*` 和兼容 CSS hack，后续迁移应统一改为 token。
