# 动画规范

## Token

动画 token 位于 `frontend/styles/motion.css`：

- `--motion-fast: 120ms`
- `--motion-normal: 200ms`
- `--motion-slow: 300ms`
- `--motion-page-fade: 200ms`
- `--motion-page-slide: 220ms`
- `--motion-page-zoom-enter: 240ms`
- `--motion-page-zoom-exit: 220ms`
- `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`
- `--ease-out: cubic-bezier(0, 0, 0.2, 1)`
- `--ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1)`

## 页面切换

后台页面切换由 `useAdminViewTransitionNavigate` 统一触发浏览器原生 View Transition API，并由 `AdminPageTransition` 限定后台主内容区域。`AdminPageTransition` 只作为主内容容器和 `view-transition-name: admin-page-content` 的挂载点，不得维护延迟路由状态或给新页面追加入场动画 class。`AdminSidebar`、`AdminTopBar`、`AdminTabs`、设置中心、通知面板和用户菜单不得参与页面切换动画，也不得因页面切换重新挂载。

支持的 `admin_page_transition` 值：

- `none`：无动画。页面立即显示，不加 `opacity` 动画，不加 `transform` 动画。
- `fade`：淡入淡出。`opacity: 0 -> 1`，不做位移，推荐 180ms 到 220ms。
- `slide-right`：向右滑动。`opacity: 0 -> 1`，`translateX(-12px) -> translateX(0)`，推荐 200ms 到 240ms。
- `slide-up`：向上滑动。`opacity: 0 -> 1`，`translateY(10px) -> translateY(0)`，推荐 200ms 到 240ms。
- `slide-down`：向下滑动。`opacity: 0 -> 1`，`translateY(-10px) -> translateY(0)`，推荐 200ms 到 240ms。
- `zoom`：缩放。参考后台模板的主内容缩放切换，只作用于主内容区域。旧内容只允许 `opacity` 加极轻微 `scale(1 -> 0.992)` / `translateY(0 -> 2px)` 收起，新内容使用 `opacity: 0 -> 1`、`scale(0.965) -> scale(1)`、`translateY(10px) -> translateY(0)` 入场，推荐 220ms 到 240ms。不得设置入场延迟，不得让主内容区域整块变黑或空掉。

默认值：

- localStorage 没有 `admin_page_transition` 时默认 `fade`。
- 用户设备开启 `prefers-reduced-motion: reduce` 且没有历史配置时默认 `none`。
- reduced motion 生效时，页面切换动画必须实际禁用。

页面切换逻辑必须是：

1. 路由立即切换。
2. 支持 View Transition API 时通过 `document.startViewTransition(() => navigate(targetPath))` 生成主内容旧/新快照。
3. 新页面立即渲染，并由 `::view-transition-old(admin-page-content)` / `::view-transition-new(admin-page-content)` 执行轻量过渡。
4. 接口慢时页面内部显示骨架屏或加载态。

禁止采用“旧页面先消失、主区域清空、等待接口、再显示新页面”的方式。页面切换动画不能阻塞路由切换、接口请求或数据加载。

所有后台菜单、标签页、快捷入口和后台内链跳转必须走 `useAdminViewTransitionNavigate`。浏览器不支持 View Transition API、用户选择 `none` 或系统开启 `prefers-reduced-motion: reduce` 时，必须直接普通路由跳转，不调用 `startViewTransition`。

缩放模式以稳定为先，快照动画只允许使用轻量 opacity、小幅 scale 和小幅 translate。旧快照可以轻微收起作为过渡参考，但必须和新快照交叉出现，避免黑屏、空场或旧页闪回。不得维护 `displayLocation`、`transitionStage` 或类似延迟路由状态；不得在动画结束后再切换页面；不得手动清空主内容区域、制造黑色/深色空场背景或入场延迟。

## 性能限制

页面切换只允许动画以下属性：

- `opacity`
- `transform`

禁止：

- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`
- `filter`
- `blur`
- 大范围 `box-shadow`
- 先清空页面再加载。
- 长时间黑屏。
- 等动画结束后才切路由。
- 大范围 blur / filter。
- 整个 Layout 参与动画。
- 对大表格行使用复杂入场动画。
- 表格宽度因动画跳动。
- 侧边栏、顶部栏、标签栏闪烁。
- 缩放使用 `scale(0.8)`、`scale(0.9)` 等过大幅度；后台页面 `zoom` 入场不得低于 `scale(0.965)`。

## 弹窗

弹窗使用 opacity + scale，持续 180ms 到 220ms。弹窗遮罩不使用大面积 blur 动画，允许静态轻微 backdrop。

## 抽屉

抽屉使用 translateX，持续 220ms 到 280ms。打开时 body 不应发生布局跳动。

## Hover

hover 只允许轻量属性：

- background-color
- border-color
- color
- opacity
- transform translateY(-1px)

禁止 hover 中使用 filter、blur、大范围 box-shadow 动画。

## Reduced Motion

必须尊重 `prefers-reduced-motion: reduce`。页面切换动画应禁用，普通微交互可降到 1ms 或禁用。

## 设置中心

后台右侧设置中心必须提供“页面切换动画”配置项，选项文案使用中文：

- 无动画
- 淡入淡出
- 向右滑动
- 向上滑动
- 向下滑动
- 缩放

选择后立即写入 localStorage 的 `admin_page_transition`，并同步到 `document.documentElement.dataset.pageTransition`，下一次后台页面切换立即生效，刷新页面后保持上次选择。当前选中项必须有明确激活状态。
