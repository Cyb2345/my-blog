# 动画规范

## 技术方案

后台主内容动画使用 `motion`。`AdminPageTransition` 是唯一的后台页面动画入口，按路由类型自动选择预设；`useAdminViewTransitionNavigate` 只负责立即执行 `router.push`。

设置中心不提供页面动画选择，不读取或写入 `admin_page_transition`。后台页面不得自行实现另一套路由动画。

## Token

通用 CSS 动画 token 位于 `frontend/styles/motion.css`：

- `--motion-fast: 120ms`
- `--motion-normal: 200ms`
- `--motion-slow: 300ms`
- `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`
- `--ease-in: cubic-bezier(0.4, 0, 1, 1)`
- `--ease-out: cubic-bezier(0, 0, 0.2, 1)`
- `--ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1)`

Motion 页面预设统一使用 170ms 到 220ms 的 tween，并以 `[0.16, 1, 0.3, 1]` 作为主要缓动。

## 页面预设

`AdminPageTransition` 根据路径自动匹配：

- `dashboard`：仪表盘，`opacity + translateY(6px) + scale(0.995)`，220ms。
- `list`：文章、分类、标签、用户、角色、日志等列表，`opacity + translateY(5px)`，170ms。
- `settings`：站点配置、首页配置、导航配置、文件配置和参数配置，`opacity + translateX(6px)`，180ms。
- `editor`：新建和编辑文章，`opacity + scale(0.99)`，200ms。
- `media`：媒体库和文件列表，`opacity + translateY(4px) + scale(0.997)`，190ms。
- `monitor`：服务监控，纯 `opacity`，200ms，避免图表和指标布局抖动。

未单独匹配的后台页面统一使用 `list` 预设。

## 页面切换原则

1. 点击菜单、Tabs、快捷入口或后台链接后立即执行路由切换。
2. Motion 只动画新页面主内容容器，不等待旧页面离场。
3. 不保留旧页面 DOM，不生成整页 View Transition 快照。
4. Sidebar、TopBar、Tabs、设置中心、通知面板和用户菜单不得参与页面动画，也不得随路由重新挂载。
5. 页面内部 loading 和 skeleton 独立承接接口等待，不用路由动画遮挡加载过程。
6. 不维护 `displayLocation`、`transitionStage` 或定时延迟路由状态。

## 性能限制

页面动画只允许使用：

- `opacity`
- `transform`

禁止：

- 动画 `width`、`height`、`top`、`left`、`margin` 或 `padding`。
- 大范围 `filter`、`blur`、`box-shadow` 和 `clip-path` 页面切换。
- 对后台大表格逐行动画或 stagger。
- 在 Motion 页面入场之外叠加 `motion-card`、`motion-panel`、`motion-surface` 或列表入场。
- 长时间保留 `will-change`。
- 使用 `mode="wait"` 延迟新页面显示。

## 弹窗和抽屉

- 弹窗使用 `opacity + scale`，持续 180ms 到 220ms。
- 抽屉使用 `translateX`，持续 220ms 到 280ms。
- 遮罩只做 opacity，不使用大面积 blur 动画。
- 打开抽屉时 body 不应发生布局跳动。

## Hover

Hover 只允许轻量的背景、边框、文字、透明度或 `translateY(-1px)` 变化。禁止 hover 使用 blur、filter 或大范围阴影动画。

## Reduced Motion

`AdminPageTransition` 必须使用 Motion 的 `useReducedMotion()`。系统开启 `prefers-reduced-motion: reduce` 时，页面 `initial` 设为 `false`、持续时间设为 `0`；CSS 微交互降到 1ms 或禁用。
