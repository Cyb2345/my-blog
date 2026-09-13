# 主题规范

## 目标

深色模式、浅色模式、后台主题色和设置中心必须统一。页面不得单独定义独立主题。

## Token

主题 token 位于：

- `frontend/styles/tokens.css`
- `frontend/styles/theme.css`
- `frontend/app/globals.css`
- `frontend/tailwind.config.ts`

必须使用 CSS variables：

- `--color-bg`
- `--color-bg-muted`
- `--color-surface`
- `--color-surface-hover`
- `--color-border`
- `--color-border-strong`
- `--color-text`
- `--color-text-muted`
- `--color-text-subtle`
- `--color-primary`
- `--admin-primary`

## 明暗模式

明暗主题通过 `next-themes` 和 `.dark` class 生效。组件不得只写浅色样式再依赖全局 hack 修补；迁移页面时应主动使用 token。

## 后台主题色

设置中心修改主题色后必须影响：

- 主按钮
- 菜单激活态
- 标签激活态
- 链接颜色
- 表格设置控件
- 焦点 ring

后台主题状态保存到 localStorage。

## 设置中心持久化

后台设置中心只保存可由用户调整的布局和主题偏好。页面动画由统一动画入口执行轻量淡入，不作为主题设置持久化；系统减少动画开启时必须禁用页面入场。

## 禁止

- 禁止页面里随机写 hex / rgb / rgba 颜色。
- 禁止某个页面独立指定主题色。
- 禁止组件单独维护一套 dark 样式。
- 禁止设置中心只改变控件本身而不影响全局。

## 自检

每次修改主题相关代码后至少检查：

- 浅色模式。
- 深色模式。
- 设置中心切换主题色。
- 主按钮、侧边栏激活态、表格标签是否同步变化。
- 页面刷新后设置是否恢复。

## 前台主题与导航

- 前台顶栏统一使用主题表面与前景 token，不在首页使用仅适合图片顶部的白色文字覆盖层；滚动到正文后同样保持可读。
- 桌面端为等宽两侧轨道与居中导航，Logo 在左，搜索、用户与主题切换在右；窄屏折叠菜单，不挤压或换行导航。
- 图片上的玻璃按钮使用固定的 `--color-on-image` 前景，不使用会随主题变黑的 `--background` 作为文字颜色。
- 主题切换从触发按钮中心展开，时长由 `--motion-theme` 统一控制。缺少 View Transition 或启用减少动画时立即切换，不用纯色遮罩覆盖正文。
- View Transition 样式仅在 `theme-transitioning` 期间启用，不改变后台主内容区域动画。
