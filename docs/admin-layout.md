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
- 折叠后只显示居中的菜单图标，菜单文字、分组标题和展开箭头必须隐藏，且不得产生横向溢出。
- 桌面端侧栏宽度与主区域偏移立即更新，不做逐帧重排动画。
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

桌面端 TopBar 高度统一为 60px；多标签栏最小高度为 40px；后台主内容区默认使用 16px 内边距。列表页不得通过额外页面标题重复占用首屏高度。

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

后台路由跳转统一使用 `useAdminViewTransitionNavigate`，该 hook 立即调用 `router.push`，不等待动画。`AdminPageTransition` 使用统一的 160ms 轻量淡入，只执行新页面的轻量入场，不保留旧页面、不生成全页快照。

设置中心不提供页面动画选择，也不再读写 `admin_page_transition`。用户设备开启 `prefers-reduced-motion: reduce` 时，页面入场必须实际禁用。

页面切换动画不能阻塞路由切换和数据加载。点击菜单后应立即 `router.push`，新页面立即渲染；接口慢时由页面内部的 skeleton/loading 状态承接。

页面动画以当前路由为唯一事实来源。不得手动维护 `displayLocation` 或等待离场结束后再切换页面，也不得把 Sidebar、TopBar、Tabs、SettingsDrawer 纳入缩放范围。
