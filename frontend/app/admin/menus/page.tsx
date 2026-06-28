"use client";

import { Edit, EyeOff, Eye, Minus, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/AdminDataTable";
import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AdminMenuItem } from "@/types/blog";

type FlatMenu = AdminMenuItem & { level: number };
type MenuModalState = {
  mode: "create" | "edit";
  item?: AdminMenuItem;
  parentId?: number | "";
};

function flattenMenus(items: AdminMenuItem[], level = 0): FlatMenu[] {
  return items.flatMap((item) => [
    { ...item, level },
    ...flattenMenus(item.children ?? [], level + 1),
  ]);
}

function Notice({ variant, children }: { variant: "error" | "success"; children: string }) {
  return (
    <p className={cn("notice-pop rounded-md px-3 py-2 text-sm font-bold", variant === "error" ? "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive" : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]")}>
      {children}
    </p>
  );
}

const typeMap = {
  directory: { label: "目录", variant: "warning" as const },
  menu: { label: "菜单", variant: "primary" as const },
  button: { label: "按钮", variant: "info" as const },
};

export default function AdminMenusPage() {
  const [tree, setTree] = useState<AdminMenuItem[]>([]);
  const [modal, setModal] = useState<MenuModalState | null>(null);
  const [parentId, setParentId] = useState<number | "">("");
  const [menuType, setMenuType] = useState<AdminMenuItem["type"]>("menu");
  const [deleteItem, setDeleteItem] = useState<AdminMenuItem | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const flatMenus = useMemo(() => flattenMenus(tree), [tree]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setTree(await adminRequest<AdminMenuItem[]>("/admin/menus"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "菜单加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(next: MenuModalState) {
    setModalError("");
    setParentId(next.item?.parent_id ?? next.parentId ?? "");
    setMenuType(next.item?.type ?? "menu");
    setModal(next);
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setParentId("");
    setMenuType("menu");
    setModalError("");
  }

  async function saveMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setModalError("菜单名称不能为空");
      return;
    }
    const payload = {
      parent_id: parentId || null,
      name,
      icon: String(form.get("icon") ?? "").trim() || null,
      type: menuType,
      route: String(form.get("route") ?? "").trim() || null,
      component: String(form.get("component") ?? "").trim() || null,
      permission: String(form.get("permission") ?? "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      is_active: form.get("is_active") === "on",
      is_system: form.get("is_system") === "on",
    };
    setSaving(true);
    setError("");
    setModalError("");
    setNotice("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/menus/${modal.item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("菜单已保存。");
      } else {
        await adminRequest("/admin/menus", { method: "POST", body: JSON.stringify(payload) });
        setNotice("菜单已新增。");
      }
      closeModal();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: AdminMenuItem) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/menus/${item.id}/${item.is_active ? "disable" : "enable"}`, { method: "POST" });
      await load();
      setNotice(item.is_active ? "菜单已隐藏。" : "菜单已显示。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  function openDelete(item: AdminMenuItem) {
    if (item.children?.length) {
      setError("存在子菜单，不能直接删除");
      return;
    }
    setDeleteError("");
    setDeleteItem(item);
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminRequest(`/admin/menus/${deleteItem.id}`, { method: "DELETE" });
      setDeleteItem(null);
      await load();
      setNotice("菜单已删除。");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<AdminDataTableColumn<FlatMenu>>>(
    () => [
      {
        key: "name",
        title: "菜单名称",
        minWidth: 220,
        render: (item) => (
          <span style={{ paddingLeft: `${item.level * 20}px` }} className="inline-flex items-center gap-2 font-black text-foreground">
            {item.children?.length ? <Minus className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <span className="size-3.5" />}
            {item.name}
          </span>
        ),
      },
      { key: "icon", title: "图标", width: 120, ellipsis: true, render: (item) => <span className="font-mono text-xs">{item.icon || "-"}</span> },
      { key: "type", title: "类型", width: 90, render: (item) => <StatusTag status={item.type} map={typeMap} /> },
      { key: "route", title: "路由", minWidth: 180, ellipsis: true, render: (item) => item.route || "-" },
      { key: "component", title: "组件路径", minWidth: 220, ellipsis: true, render: (item) => item.component || "-" },
      { key: "permission", title: "权限标识", minWidth: 160, ellipsis: true, render: (item) => item.permission || "-" },
      { key: "sort", title: "排序", width: 80, render: (item) => item.sort_order },
      { key: "status", title: "状态", width: 90, render: (item) => <StatusTag status={item.is_active} label={item.is_active ? "显示" : "隐藏"} /> },
      {
        key: "actions",
        title: "操作",
        width: 180,
        align: "center",
        render: (item) => (
          <RowActions
            actions={[
              { key: "child", label: "添加子菜单", icon: <Plus className={rowActionIconClass} />, variant: "success", onClick: () => openModal({ mode: "create", parentId: item.id }) },
              { key: "edit", label: "编辑", icon: <Edit className={rowActionIconClass} />, variant: "edit", onClick: () => openModal({ mode: "edit", item }) },
              { key: "visible", label: item.is_active ? "隐藏" : "显示", icon: item.is_active ? <EyeOff className={rowActionIconClass} /> : <Eye className={rowActionIconClass} />, variant: "warning", onClick: () => void toggleActive(item) },
              ...(!item.is_system ? [{ key: "delete", label: "删除", icon: <Trash2 className={rowActionIconClass} />, variant: "delete" as const, onClick: () => openDelete(item) }] : []),
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <AdminPage
      title="菜单管理"
      description="维护后台菜单树、路由、权限标识和显示状态。"
      actions={
        <Button type="button" onClick={() => openModal({ mode: "create" })}>
          <Plus className="size-4" aria-hidden="true" />
          添加菜单
        </Button>
      }
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminDataTable columns={columns} data={flatMenus} rowKey="id" loading={loading} emptyText="暂无菜单" minWidth={1100} />

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑菜单" : "添加菜单"} size="lg" onClose={closeModal}>
        <form key={modal?.item?.id ?? `new-${parentId}`} onSubmit={saveMenu} className="grid gap-4">
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="上级菜单">
              <CustomSelect
                value={String(parentId)}
                onChange={(value) => setParentId(value ? Number(value) : "")}
                options={[
                  { label: "一级菜单", value: "" },
                  ...flatMenus
                    .filter((item) => item.id !== modal?.item?.id && item.type !== "button")
                    .map((item) => ({ label: `${"　".repeat(item.level)}${item.name}`, value: String(item.id) })),
                ]}
              />
            </AdminField>
            <AdminField label="菜单名称 *">
              <input name="name" required defaultValue={modal?.item?.name ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="菜单类型">
              <CustomSelect value={menuType} onChange={(value) => setMenuType(value as AdminMenuItem["type"])} options={[{ label: "目录", value: "directory" }, { label: "菜单", value: "menu" }, { label: "按钮", value: "button" }]} />
            </AdminField>
            <AdminField label="图标">
              <input name="icon" defaultValue={modal?.item?.icon ?? ""} placeholder="Lucide 图标名" className={inputClass} />
            </AdminField>
            <AdminField label="路由">
              <input name="route" defaultValue={modal?.item?.route ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="组件路径">
              <input name="component" defaultValue={modal?.item?.component ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="权限标识">
              <input name="permission" defaultValue={modal?.item?.permission ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="排序">
              <input name="sort_order" type="number" defaultValue={modal?.item?.sort_order ?? 0} className={inputClass} />
            </AdminField>
            <Checkbox name="is_active" label="显示菜单" defaultChecked={modal?.item?.is_active ?? true} />
            <Checkbox name="is_system" label="系统内置" defaultChecked={modal?.item?.is_system ?? false} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
            <Button type="submit" loading={saving}>{saving ? "提交中..." : "提交"}</Button>
          </div>
        </form>
      </AdminModal>
      <DeleteConfirmDialog open={Boolean(deleteItem)} description={deleteItem ? `确定删除菜单「${deleteItem.name}」吗？` : "确定删除该菜单吗？"} error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteItem(null)} onConfirm={() => void confirmDelete()} />
    </AdminPage>
  );
}
