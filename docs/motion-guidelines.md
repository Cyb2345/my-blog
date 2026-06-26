# 动画规范

## Token

动画 token 位于 `frontend/styles/motion.css`：

- `--motion-fast: 120ms`
- `--motion-normal: 200ms`
- `--motion-slow: 300ms`
- `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`
- `--ease-out: cubic-bezier(0, 0, 0.2, 1)`

## 页面切换

后台页面切换只允许主内容轻微淡入：

- opacity 0 -> 1
- translateY(6px) -> translateY(0)
- 180ms 到 220ms

禁止：

- 先清空页面再加载。
- 长时间黑屏。
- 等动画结束后才切路由。
- 大范围 blur / filter。
- 整个 Layout 参与动画。
- 对大表格行使用复杂入场动画。

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

必须尊重 `prefers-reduced-motion: reduce`，动画时长应降到 1ms 或禁用。
