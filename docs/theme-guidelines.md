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
