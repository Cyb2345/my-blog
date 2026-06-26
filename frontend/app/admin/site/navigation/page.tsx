"use client";

import { Edit, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  DataTableToolbar,
  type TableSettings,
  tableDensityCellClass,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { TableSkeletonRows } from "@/components/admin/TableSkeletonRows";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import type { NavigationItem } from "@/types/blog";

type NavModalState = {
  mode: "create" | "edit";
  item?: NavigationItem;
};

const settingsKey = "admin-table-settings:site-navigation";
const defaultSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default",
  visibleColumns: [],
};

export default function AdminNavigationPage() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [modal, setModal] = useState<NavModalState | null>(null);
  const [deleteItem, setDeleteItem] = useState<NavigationItem | null>(null);
  const [target, setTarget] = useState("self");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useTableSettings(settingsKey, defaultSettings);
  const cellClass = tableDensityCellClass[settings.density];

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await adminRequest<NavigationItem[]>("/admin/navigation"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "导航配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(next: NavModalState) {
    setTarget(next.item?.target ?? "self");
    setModalError("");
    setModal(next);
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setModalError("");
  }

  async function saveNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const href = String(form.get("href") ?? "").trim();
    if (!label || !href) {
      setModalError("名称和链接不能为空");
      return;
    }
    const payload = {
      label,
      href,
      icon: String(form.get("icon") ?? "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      target,
      is_visible: form.get("is_visible") === "on",
    };
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/navigation/${modal.item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("导航项已保存。");
      } else {
        await adminRequest("/admin/navigation", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("导航项已新增。");
      }
      setModal(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(item: NavigationItem) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/navigation/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_visible: !item.is_visible }),
      });
      setNotice(item.is_visible ? "导航项已隐藏。" : "导航项已显示。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminRequest(`/admin/navigation/${deleteItem.id}`, { method: "DELETE" });
      setDeleteItem(null);
      setNotice("导航项已删除。");
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-[var(--border-soft)]">
          <Button type="button" variant="ghost" onClick={() => openModal({ mode: "create" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增
          </Button>
          <DataTableToolbar
            settings={settings}
            onSettingsChange={setSettings}
            onRefresh={() => void load()}
            refreshing={loading}
            enableColumns={false}
          />
        </div>
        <div className="overflow-x-auto">
          <table
            className={cn(
              "admin-table w-full min-w-[860px] table-fixed border-collapse",
              settings.bordered &&
                "[&_td]:border-r [&_th]:border-r [&_td]:border-ink/10 [&_th]:border-ink/10 dark:[&_td]:border-[var(--border-soft)] dark:[&_th]:border-[var(--border-soft)]",
            )}
          >
            <colgroup>
              <col className="w-[150px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col className="w-[180px]" />
              <col className="w-[160px]" />
            </colgroup>
            <thead className={cn(settings.headerBackground && "bg-paper dark:bg-[var(--bg-soft)]")}>
              <tr>
                {["名称", "链接", "打开方式", "排序", "状态", "更新时间", "操作"].map((label) => (
                  <th key={label} className={cn(cellClass, label === "操作" && "text-center")}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !items.length ? <TableSkeletonRows columns={7} rows={6} cellClassName={cellClass} /> : null}
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-t border-ink/10 dark:border-[var(--border-soft)]",
                    settings.striped && index % 2 === 1 && "bg-paper/45 dark:bg-white/[0.03]",
                  )}
                >
                  <td className={cn("font-black text-ink dark:text-[var(--text)]", cellClass)}>{item.label}</td>
                  <td className={cellClass}><span className="block truncate" title={item.href}>{item.href}</span></td>
                  <td className={cellClass}>{item.target === "blank" ? "新窗口" : "当前页"}</td>
                  <td className={cellClass}>{item.sort_order}</td>
                  <td className={cellClass}>
                    <span className={cn(
                      "inline-flex rounded-md px-2 py-1 text-xs font-black ring-1",
                      item.is_visible
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
                        : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-[var(--text-secondary)] dark:ring-[var(--border-soft)]",
                    )}>
                      {item.is_visible ? "显示" : "隐藏"}
                    </span>
                  </td>
                  <td className={cellClass}>{formatDate(item.updated_at)}</td>
                  <td className={cellClass}>
                    <AdminTableActions>
                      <AdminTableActionButton variant="success" onClick={() => void toggleVisible(item)} title={item.is_visible ? "隐藏" : "显示"} aria-label={item.is_visible ? "隐藏" : "显示"}>
                        {item.is_visible ? <EyeOff className={adminTableActionIconClass} /> : <Eye className={adminTableActionIconClass} />}
                      </AdminTableActionButton>
                      <AdminTableActionButton variant="edit" onClick={() => openModal({ mode: "edit", item })} title="编辑" aria-label="编辑">
                        <Edit className={adminTableActionIconClass} />
                      </AdminTableActionButton>
                      <AdminTableActionButton variant="delete" onClick={() => setDeleteItem(item)} title="删除" aria-label="删除">
                        <Trash2 className={adminTableActionIconClass} />
                      </AdminTableActionButton>
                    </AdminTableActions>
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr><td colSpan={7} className="p-10 text-center font-bold text-ink/45 dark:text-[var(--text-muted)]">暂无导航数据</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑导航" : "新增导航"} size="md" onClose={closeModal}>
        <form key={modal?.item?.id ?? "new"} onSubmit={saveNavigation} className="grid gap-4">
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="名称 *"><input name="label" required defaultValue={modal?.item?.label ?? ""} className={inputClass} /></AdminField>
            <AdminField label="链接 *"><input name="href" required defaultValue={modal?.item?.href ?? ""} className={inputClass} /></AdminField>
            <AdminField label="排序"><input name="sort_order" type="number" defaultValue={modal?.item?.sort_order ?? 0} className={inputClass} /></AdminField>
            <AdminField label="打开方式">
              <CustomSelect
                name="target"
                value={target}
                onChange={setTarget}
                options={[
                  { label: "当前页", value: "self" },
                  { label: "新窗口", value: "blank" },
                ]}
              />
            </AdminField>
            <AdminField label="图标标识"><input name="icon" defaultValue={modal?.item?.icon ?? ""} className={inputClass} /></AdminField>
            <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)]">
              <input name="is_visible" type="checkbox" defaultChecked={modal?.item?.is_visible ?? true} />
              前台显示
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "提交中..." : "确定"}</Button>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteItem)}
        description={deleteItem ? `确定删除导航「${deleteItem.label}」吗？` : "确定删除该导航吗？"}
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
