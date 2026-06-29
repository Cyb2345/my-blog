# 后台布局规范

## 结构

后台布局使用 `AdminShell`，逻辑结构如下：

```text
AdminLayout
└── AdminShell
    ├── AdminSidebar
    ├── AdminMain
    │   ├── AdminTopBar
    │   │   ├── AdminTopLeftActions
    │   │   ├── AdminBreadcrumb
    │   │   └── AdminTopRightActions
    │   ├── AdminTabs
    │   └── AdminPageTransition
    │       └── PageContent
    └── AdminSettingsDrawer
```

当前实现中 `AdminSidebar` 仍内联在 `AdminShell`，后续可拆出文件，但不得改变路由和登录态行为。

## Sidebar

- 菜单优先来自 `/admin/menus`，失败时使用 fallback。
- 折叠宽度 72px，展开宽度来自 `settings.menuWidth`。
- 激活态使用 `--admin-primary`。
- 移动端侧边栏使用抽屉，不参与页面切换动画。

## TopBar

顶部栏包含：

- 折叠侧边栏
- 刷新
- 面包屑
- 快捷入口
- 通知
- 语言切换
- 全屏
- 设置中心
- 用户菜单

顶部栏功能只放在 layout 层，不在每个页面重复实现。

## Tabs

多标签栏由 `AdminTabs` 管理，状态保存在 `admin_open_tabs`。仪表盘 tab 固定不可关闭。页面跳转时只更新主内容，不重新挂载 layout。

## SettingsDrawer

设置中心必须控制真实主题能力：

- 明暗主题
- 后台主题色
- 盒子样式
- 容器宽度
- 多标签栏
- 手风琴菜单
- 顶部进度条
- 页面切换动画
- 圆角
- 字号
- 菜单宽度

所有设置保存到 localStorage，并通过 CSS variables 或 `data-admin-*` 属性立即生效。

## NotificationPopover

通知数据来自留言接口。只在 TopBar 层拉取，页面不重复拉取通知。已读状态保存在 localStorage。

## UserDropdown

用户菜单负责个人入口和退出登录。退出登录必须清理 token 并跳转 `/admin/login`。

## PageTransition

页面切换动画只作用于主内容区域，禁止包裹 Sidebar、TopBar、Tabs 和 SettingsDrawer。后台 Layout 必须稳定挂载，路由切换时只替换 `AdminPageTransition` 内部的 `PageContent`。

后台路由跳转必须统一使用 `useAdminViewTransitionNavigate`。支持 View Transition API 时，hook 调用 `document.startViewTransition(() => navigate(targetPath))`；不支持、用户选择无动画或系统开启减少动画时，直接普通路由跳转。`AdminPageTransition` 只负责承载主内容和挂载 `view-transition-name: admin-page-content`，不得再维护子页面 key 入场动画。

`useAdminViewTransitionNavigate` 根据 localStorage 中的 `admin_page_transition` 和 `html[data-page-transition]` 读取动画模式：

- `none`：无动画。
- `fade`：淡入淡出，默认值。
- `slide-right`：新页面从左侧轻微进入。
- `slide-up`：新页面从下方轻微上浮进入。
- `slide-down`：新页面从上方轻微下落进入。
- `zoom`：Fade-Scale。主内容旧快照从 `scale(1)` 缩到 `scale(0.96)` 并快速淡出，新主内容从 `scale(0.96)` 淡入恢复到正常尺寸；不使用位移，不设置等待空场，不让 Sidebar、TopBar、Tabs 参与缩放。

用户选择关闭动画后必须完全禁用页面切换的 transition 和 animation。用户设备开启 `prefers-reduced-motion: reduce` 时，页面切换动画必须实际禁用。

页面切换动画不能阻塞路由切换和数据加载。点击菜单后应立即 `router.push`，新页面立即渲染；接口慢时由页面内部的 skeleton/loading 状态承接。

页面动画以当前路由为唯一事实来源。不得手动维护 `displayLocation` 或等待离场结束后再切换页面，也不得把 Sidebar、TopBar、Tabs、SettingsDrawer 纳入缩放范围。
