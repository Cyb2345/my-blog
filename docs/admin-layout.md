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

页面切换动画只包裹主内容区域，禁止包裹 Sidebar、TopBar、Tabs 和 SettingsDrawer。默认动画：

- opacity 0 -> 1
- translateY(6px) -> 0
- 200ms

用户选择关闭动画后必须完全禁用 transition 和 animation。
