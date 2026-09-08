# 后台动画与导航规范

## 唯一入口
AdminPageTransition 保持稳定 DOM，不使用路由 key 再次挂载 children。App Router 负责路由段生命周期。
所有后台页面统一为 160ms、opacity 0.94 → 1 的原生 Web Animations 入场，不缩放、不平移大表格、不从全透明开始。
首次加载不做入场；仅 pathname 提交变化时执行。接口数据更新、主题切换和刷新不重复播放。
动画取消时恢复正常样式，不持有旧页面、快照、定时路由或永久 will-change。

## 导航流程
点击菜单或 Tabs 立即 router.push；React useTransition 的 pending 状态驱动顶部进度条，不按动画时间猜测路由完成。
进度条只表示路由或 RSC 刷新，不代表页面业务接口加载完成；表格自行承接 loading。
菜单和 Tabs 在指针悬停、键盘聚焦时按需预加载，30 秒内去重，避免加载整个后台。
Sidebar、TopBar、Tabs 不参与页面入场。桌面侧栏折叠及分组展开立即布局，避免逐帧重排大型表格。

## 动效层级
- 页面：--admin-motion-enter，160ms，纯 opacity。
- 按钮和表单：--motion-fast，120ms，颜色/边框反馈，不上浮或按压位移。
- 设置抽屉：统一 Radix Sheet，--admin-motion-drawer，240ms，translate；遮罩淡入淡出。
- 抽屉关闭保留离场动画，支持 Escape、焦点约束和关闭后焦点恢复。
- 保留全站 Motion 依赖供其他组件使用，后台路由不再需要 Motion 运行时。

## 性能
中文默认语言跳过主内容 DOM 翻译遍历和 MutationObserver。英文兼容翻译保留，切回中文恢复文本后停止监听。
大表格行、卡片禁止叠加路由入场。禁止大面积 blur、阴影、宽高动画、离场等待及重复子树挂载。

## 减少动画
系统 prefers-reduced-motion 开启时不创建页面动画；播放过程中开启则立即取消。
CSS 微交互和 Radix 动画降低到 1ms，进度条保持静态提示。
