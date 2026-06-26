# 项目协作说明

## 开发前必须阅读

任何 Agent / Codex 在修改本项目之前，必须先阅读以下规范文件：

1. `docs/design-system.md`
2. `docs/frontend-architecture.md`
3. `docs/component-guidelines.md`
4. `docs/admin-layout.md`
5. `docs/page-patterns.md`
6. `docs/motion-guidelines.md`
7. `docs/theme-guidelines.md`

如果这些文件不存在，需要先创建规范文件，再继续开发。若规范文件与旧页面实现冲突，以规范文件为准，按迁移优先级逐步重构旧页面。

每次 Agent 修改页面切换、后台布局、设置中心或动画相关代码时，必须先阅读 `docs/motion-guidelines.md`，并确保页面切换动画只作用于后台主内容区域。

## 项目边界

- 后端代码位于 `backend/`，主入口是 `backend/app/main.py`。
- 前端代码位于 `frontend/`，使用 Next.js App Router。
- 新增后端表结构时，同步新增 Alembic migration。
- 后台接口必须挂 JWT 鉴权，公开接口只返回已发布内容。
- 不提交真实密钥，使用 `.env.example` 说明配置。

## 前端开发原则

- 可维护、可复用、可扩展、风格统一。
- 组件优先，设计变量优先，不允许页面级重复造轮子。
- 后台页面优先复用 `components/ui`、`components/admin` 和 `layouts/admin` 中的组件。
- 修改 UI 前必须检查现有设计 token、主题变量、组件库、页面模式和深色模式。
- 新增页面必须保留现有路由、API、权限、登录状态和业务数据结构。

## 禁止行为

- 禁止在页面中写死颜色、按钮样式、表格样式、弹窗样式、随机圆角、随机阴影和随机动画时间。
- 禁止每个页面单独实现表格、查询栏、分页、弹窗、状态标签、行操作和删除确认。
- 禁止复制旧页面后只改字段。
- 禁止新增没有真实功能的按钮。
- 禁止绕过统一组件库直接写复杂 UI。
- 禁止页面切换动画影响加载速度，禁止让 Layout 随页面切换反复重新挂载。
- 禁止保留无意义空白、重复标题、英文路径占位内容。
- 禁止本地存储配置复用 R2 / S3 的 Access Key、Secret、Bucket、Endpoint、Region 字段。

## 必须优先复用的组件

基础组件：

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Switch`
- `Checkbox`
- `Card`
- `Dialog`
- `Drawer`
- `Popover`
- `Tooltip`
- `Tag`
- `Badge`
- `Pagination`
- `Skeleton`
- `Empty`
- `ConfirmDialog`

后台业务组件：

- `AdminPage`
- `AdminSearchForm`
- `AdminTableToolbar`
- `AdminDataTable`
- `StatusTag`
- `RowActions`
- `DeleteConfirm`
- `AdminLayout`
- `AdminSidebar`
- `AdminTopBar`
- `AdminTabs`
- `AdminSettingsDrawer`
- `AdminPageTransition`

如果缺少同类组件，应优先补齐组件体系，再迁移页面，不要继续在页面里写散乱代码。

## 新增后台页面结构

新增后台页面时默认使用以下结构：

```tsx
<AdminPage title="页面标题" description="页面说明">
  <AdminSearchForm />
  <Card>
    <AdminTableToolbar />
    <AdminDataTable />
  </Card>
</AdminPage>
```

列表页使用 `AdminDataTable`，查询区域使用 `AdminSearchForm`，状态显示使用 `StatusTag`，行操作使用 `RowActions`，删除确认使用 `DeleteConfirm`，弹窗使用 `Dialog` 或既有 `AdminModal` 的兼容封装。

## 修改页面前检查清单

- 是否已有同类组件可以复用。
- 是否已有同类页面可以参考。
- 是否新增了重复样式或写死颜色。
- 是否破坏浅色 / 深色模式。
- 是否会影响页面切换动画性能。
- 是否会造成 Layout 重新挂载。
- 是否会产生无意义空白。
- 是否影响现有 API、权限、路由、登录状态。

## 开发完成后的自检

- 页面风格是否统一。
- 表格、弹窗、按钮、状态标签、分页是否来自统一组件或明确兼容层。
- 颜色、字体、圆角、阴影、间距、动画是否来自设计变量。
- 深色模式和浅色模式是否正常。
- 页面是否有多余空白或重复标题。
- 是否破坏现有 API、权限、路由、登录状态和加载速度。
