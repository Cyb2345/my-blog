# 组件开发规范

## 分层

基础组件放在 `frontend/components/ui`，不能依赖后台接口、后台 context 或业务类型。后台组件放在 `frontend/components/admin`，可以依赖后台 layout、鉴权状态和业务约定。

## 基础组件

基础组件负责原子能力：

- `Button` / `IconButton`
- `Input` / `Textarea`
- `Select`
- `Switch` / `Checkbox`
- `Card`
- `Dialog` / `Drawer`
- `Popover` / `Tooltip`
- `Tag` / `Badge`
- `Pagination`
- `Skeleton`
- `Empty`
- `ConfirmDialog`

基础组件必须通过 props 表达变体、尺寸和状态，不允许要求调用方传一整串 Tailwind class 才能正常显示。

## 后台业务组件

后台业务组件负责页面模式：

- `AdminPage`：统一页面标题、说明、操作区和内容间距。
- `AdminSearchForm`：统一查询区域布局、查询和重置按钮。
- `AdminTableToolbar`：统一刷新、密度、列设置和样式设置。
- `AdminDataTable`：统一表格、loading、空状态、选择、分页、行操作。
- `StatusTag`：统一业务状态颜色和文案。
- `RowActions`：统一每行图标操作按钮。
- `DeleteConfirm`：统一删除二次确认。

## Props 命名

- 布尔值使用 `disabled`、`loading`、`selected`、`open`、`checked`、`required`。
- 事件使用 `onChange`、`onOpenChange`、`onClose`、`onConfirm`、`onReset`、`onSearch`。
- 视觉变体使用 `variant`，尺寸使用 `size`。
- 不把接口返回对象直接传给基础组件，先在页面或业务组件转换成展示 props。

## 样式规范

- 默认样式必须来自设计 token。
- 组件内部允许使用 Tailwind，但颜色、圆角、阴影、动画应映射到 CSS variables。
- 页面只允许通过 `className` 做布局微调，不允许覆盖核心视觉风格。
- 深色模式通过 token 或组件内部统一适配，不在页面级重复写一套 dark 样式。

## 复用原则

新增组件前先搜索：

```bash
rg "AdminDataTable|StatusTag|RowActions|DeleteConfirm|AdminSearchForm" frontend/components frontend/app/admin
```

如果已有组件能满足 80% 以上需求，应扩展已有组件；只有当差异确实是新的通用模式时才新增组件。

## 禁止事项

- 禁止在页面里手写完整按钮样式。
- 禁止复制旧表格后改字段。
- 禁止状态标签各页面自定义颜色。
- 禁止没有真实功能的工具栏按钮。
- 禁止组件内部直接请求接口，除非组件本身就是业务容器。
- 禁止基础组件依赖后台 context。

## 示例

```tsx
<AdminPage title="友链管理" description="管理前台友链展示">
  <AdminSearchForm onSearch={handleSearch} onReset={handleReset}>
    <Input label="友链名称" value={name} onChange={setName} />
    <Select label="状态" value={status} onChange={setStatus} options={statusOptions} />
  </AdminSearchForm>
  <AdminDataTable columns={columns} data={items} rowKey="id" />
</AdminPage>
```
