"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { NavigationItem } from "@/types/blog";

type NavModalState = {
  mode: "create" | "edit";
  item?: NavigationItem;
};

export default function AdminNavigationPage() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [modal, setModal] = useState<NavModalState | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await adminRequest<NavigationItem[]>("/admin/navigation"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(next: NavModalState) {
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
      target: form.get("target"),
      is_visible: form.get("is_visible") === "on",
    };
    setSaving(true);
    setError("");
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

  async function deleteNavigation(item: NavigationItem) {
    if (!window.confirm(`确认删除导航「${item.label}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/navigation/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("导航项已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Site / Navigation</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">导航配置</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" onClick={() => openModal({ mode: "create" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增导航
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[780px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">名称</th>
                <th className="p-3">链接</th>
                <th className="p-3">打开方式</th>
                <th className="p-3">排序</th>
                <th className="p-3">状态</th>
                <th className="p-3">更新时间</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-black text-ink dark:text-slate-100">{item.label}</td>
                  <td className="max-w-[260px] truncate p-3 text-ink/65 dark:text-slate-400">{item.href}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.target === "blank" ? "新窗口" : "当前页"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.sort_order}</td>
                  <td className="p-3">
                    <span className={item.is_visible ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200"}>
                      {item.is_visible ? "显示" : "隐藏"}
                    </span>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatDate(item.updated_at)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => openModal({ mode: "edit", item })}>
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void deleteNavigation(item)}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑导航" : "新增导航"} size="md" onClose={closeModal}>
        <form key={modal?.item?.id ?? "new"} onSubmit={saveNavigation} className="grid gap-4">
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="名称 *">
              <input name="label" required defaultValue={modal?.item?.label ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="链接 *">
              <input name="href" required defaultValue={modal?.item?.href ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="排序">
              <input name="sort_order" type="number" defaultValue={modal?.item?.sort_order ?? 0} className={inputClass} />
            </AdminField>
            <AdminField label="打开方式">
              <select name="target" defaultValue={modal?.item?.target ?? "self"} className={inputClass}>
                <option value="self">当前页</option>
                <option value="blank">新窗口</option>
              </select>
            </AdminField>
            <AdminField label="图标标识">
              <input name="icon" defaultValue={modal?.item?.icon ?? ""} className={inputClass} />
            </AdminField>
            <label className="flex items-center gap-2 self-end rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
              <input name="is_visible" type="checkbox" defaultChecked={modal?.item?.is_visible ?? true} />
              前台显示
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
