"use client";

import { Edit, Minus, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
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

const typeLabels: Record<AdminMenuItem["type"], string> = {
  directory: "目录",
  menu: "菜单",
  button: "按钮",
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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const flatMenus = useMemo(() => flattenMenus(tree), [tree]);

  async function load() {
    try {
      setTree(await adminRequest<AdminMenuItem[]>("/admin/menus"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
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
        await adminRequest(`/admin/menus/${modal.item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("菜单已保存。");
      } else {
        await adminRequest("/admin/menus", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("菜单已新增。");
      }
      setModal(null);
      setParentId("");
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
      setNotice(item.is_active ? "菜单已停用。" : "菜单已启用。");
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

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" onClick={() => openModal({ mode: "create" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            添加菜单
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1100px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">菜单名称</th>
                <th className="p-3">图标</th>
                <th className="p-3">类型</th>
                <th className="p-3">路由</th>
                <th className="p-3">组件路径</th>
                <th className="p-3">权限标识</th>
                <th className="p-3">排序</th>
                <th className="p-3">状态</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {flatMenus.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-black text-ink dark:text-slate-100">
                    <span style={{ paddingLeft: `${item.level * 20}px` }} className="inline-flex items-center gap-2">
                      {item.children?.length ? <Minus className="h-3.5 w-3.5 text-ink/40" aria-hidden="true" /> : <span className="h-3.5 w-3.5" />}
                      {item.name}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-ink/60 dark:text-slate-400">{item.icon || "-"}</td>
                  <td className="p-3">
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">{typeLabels[item.type]}</span>
                  </td>
                  <td className="max-w-[180px] truncate p-3 text-ink/65 dark:text-slate-400">{item.route || "-"}</td>
                  <td className="max-w-[220px] truncate p-3 text-ink/65 dark:text-slate-400">{item.component || "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.permission || "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.sort_order}</td>
                  <td className="p-3">
                    <span className={item.is_active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200"}>
                      {item.is_active ? "显示" : "隐藏"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => openModal({ mode: "create", parentId: item.id })}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => openModal({ mode: "edit", item })}>
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void toggleActive(item)}>
                        {item.is_active ? "隐藏" : "显示"}
                      </Button>
                      {!item.is_system ? (
                        <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => openDelete(item)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
              <CustomSelect
                value={menuType}
                onChange={(value) => setMenuType(value as AdminMenuItem["type"])}
                options={[
                  { label: "目录", value: "directory" },
                  { label: "菜单", value: "menu" },
                  { label: "按钮", value: "button" },
                ]}
              />
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
            <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
              <input name="is_active" type="checkbox" defaultChecked={modal?.item?.is_active ?? true} />
              显示菜单
            </label>
            <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
              <input name="is_system" type="checkbox" defaultChecked={modal?.item?.is_system ?? false} />
              系统内置
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
          </div>
        </form>
      </AdminModal>
      <DeleteConfirmDialog open={Boolean(deleteItem)} description={deleteItem ? `确定删除菜单「${deleteItem.name}」吗？` : "确定删除该菜单吗？"} error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteItem(null)} onConfirm={() => void confirmDelete()} />
    </>
  );
}
