# 前端设计系统

本文档是博客后台前端设计规范的主入口。新增或修改 UI 时，优先遵循这里定义的 token、组件和页面模式；旧页面与本文档冲突时，以本文档为准，逐步迁移。

## 审计结论

当前前端位于 `frontend/`，Next.js App Router 页面位于 `frontend/app`。后台页面集中在 `frontend/app/admin`，其中 `content/*`、`site/*`、`system/*` 多数是对旧路径页面的 re-export。后台已具备 `AdminShell`、`AdminTopBar`、`AdminTabs`、`AdminSettingsDrawer`、`AdminPageTransition` 等布局能力，但列表页仍大量手写 `<table>`、分页、状态标签和操作按钮。

已存在的可复用组件包括 `Button`、`EmptyState`、`AdminModal`、`DeleteConfirmDialog`、`DataTableToolbar`、`AdminTableActionButton`、`CustomSelect`、`AdminField`、`TableSkeletonRows`。缺失或不完整的核心层包括 `AdminPage`、`AdminSearchForm`、`AdminDataTable`、`StatusTag`、`RowActions`、统一 `Pagination`、统一 `Dialog/Drawer` 和完整 token 文档。

重复样式主要集中在：

- `rounded-lg border border-ink/10 bg-white shadow-sm` 卡片结构。
- `bg-red-50 text-red-700`、`bg-green-50 text-green-700` 通知。
- `bg-emerald-*`、`bg-rose-*` 状态标签。
- `bg-paper` / `dark:bg-slate-*` 表格表头、斑马纹和分页按钮。
- 页面内反复定义查询栏、工具栏、分页和空状态。

优先迁移页面：

1. 文章管理：`frontend/app/admin/posts/page.tsx`
2. 友链管理：`frontend/app/admin/links/page.tsx`
3. 文件列表：`frontend/app/admin/files/list/page.tsx`
4. 文件配置：`frontend/app/admin/files/config/page.tsx`

## 设计 Token

统一 token 位于：

- `frontend/styles/tokens.css`
- `frontend/styles/theme.css`
- `frontend/styles/motion.css`
- `frontend/tailwind.config.ts`
- `frontend/app/globals.css`

页面和组件不得绕过 token 写随机颜色、圆角、阴影、间距和动画。

## 颜色规范

基础颜色：

- `--color-primary`
- `--color-primary-hover`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`

表面与边框：

- `--color-bg`
- `--color-bg-muted`
- `--color-surface`
- `--color-surface-hover`
- `--color-border`
- `--color-border-strong`

文本：

- `--color-text`
- `--color-text-muted`
- `--color-text-subtle`
- `--color-text-inverse`

后台主题色使用 `--admin-primary`，设置中心修改主题色后必须立即影响按钮、菜单激活态、标签激活态、链接颜色和表格设置控件。

## 字体和字号

字体族使用系统无衬线字体：

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

字号 token：

- `--font-size-xs`
- `--font-size-sm`
- `--font-size-base`
- `--font-size-lg`
- `--font-size-xl`

字重 token：

- `--font-weight-normal`
- `--font-weight-medium`
- `--font-weight-semibold`
- `--font-weight-bold`

## 间距

页面、表单、卡片、表格工具栏统一使用：

- `--space-1`
- `--space-2`
- `--space-3`
- `--space-4`
- `--space-5`
- `--space-6`
- `--space-8`

后台页面默认主内容内边距为移动端 `--space-4`，桌面端 `--space-6`。

## 圆角和阴影

圆角：

- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-full`

阴影：

- `--shadow-card`
- `--shadow-popover`
- `--shadow-dialog`

后台默认卡片圆角不超过 `--radius-lg`。除头像、开关、徽标外，不使用大面积胶囊形圆角。

## 按钮规范

按钮必须使用 `Button` 或 `IconButton`。支持：

- `primary`
- `secondary`
- `danger`
- `ghost`
- `outline`
- `text`

尺寸：

- `sm`
- `md`
- `lg`
- `icon`

工具按钮优先使用 lucide-react 图标并提供 `aria-label` / `title`。

## 表格规范

后台列表页必须迁移到 `AdminDataTable` 或其兼容层。表格必须支持：

- loading
- 空状态
- 分页
- 批量选择
- 行操作
- 状态标签
- 长文本省略和 `title` / tooltip
- 表格密度、边框、斑马纹、表头背景设置

不要在页面里继续写完整 `<table>` 结构，除非正在迁移旧页面，且必须在同次变更中补充迁移 TODO 或使用兼容组件。

## 标签和状态

状态统一使用 `StatusTag` 或 `Tag`：

- 成功 / 正常 / 启用 / 上架：success
- 警告 / 待处理：warning
- 错误 / 禁用 / 下架 / 失败：danger
- 信息 / 默认：info 或 neutral

## 弹窗和表单

弹窗统一使用 `Dialog`、`Drawer` 或后台兼容的 `AdminModal`。表单 label、输入框高度、按钮位置、错误提示必须一致：

- 取消按钮在左，确认按钮在右。
- 保存中显示 loading。
- 保存失败不关闭弹窗。
- 保存成功后关闭弹窗并刷新数据。
- 删除必须二次确认。

## 动画

页面切换只允许轻量 `opacity` 和 `translateY(6px)`，持续 180ms 到 220ms。大表格、侧边栏、顶部栏、标签栏不得参与页面切换动画。
