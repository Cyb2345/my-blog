"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { normalizeSlug } from "@/lib/utils";
import type { Category } from "@/types/blog";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await adminRequest<Category[]>("/admin/categories"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function closeModal() {
    if (saving) return;
    setEditing(null);
    setModalError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const slug = normalizeSlug(form.get("slug"));
    if (!name || !slug) {
      setModalError("名称和 Slug 不能为空");
      return;
    }
    setModalError("");
    setNotice("");
    setSaving(true);
    const payload = {
      name,
      slug,
      description: form.get("description") || null,
      sort_order: Number(form.get("sort_order") || 0),
    };
    try {
      if (editing?.id) {
        await adminRequest(`/admin/categories/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("分类已保存，列表已刷新。");
      } else {
        await adminRequest("/admin/categories", { method: "POST", body: JSON.stringify(payload) });
        setNotice("分类已新增，列表已刷新。");
      }
      setEditing(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Category) {
    if (!window.confirm(`确认删除分类「${item.name}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/categories/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("分类已删除，列表已刷新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Categories</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">分类管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" onClick={() => setEditing({ id: 0, name: "", slug: "", description: "", sort_order: 0, post_count: 0, created_at: "", updated_at: "" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增分类
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[680px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">名称</th>
                <th className="p-3">Slug</th>
                <th className="p-3">文章数</th>
                <th className="p-3">排序</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-bold text-ink dark:text-slate-100">{item.name}</td>
                  <td className="p-3 text-ink/60 dark:text-slate-400">{item.slug}</td>
                  <td className="p-3 text-ink/60 dark:text-slate-400">{item.post_count ?? 0}</td>
                  <td className="p-3 text-ink/60 dark:text-slate-400">{item.sort_order}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setEditing(item)}>
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void remove(item)}>
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

      <AdminModal open={Boolean(editing)} title={editing?.id ? "编辑分类" : "新增分类"} size="sm" onClose={closeModal}>
        {editing ? (
          <form key={editing.id || "new"} onSubmit={handleSubmit} className="grid gap-4">
            <ModalError message={modalError} />
            <AdminField label="名称 *">
              <input name="name" required defaultValue={editing.name} className={inputClass} />
            </AdminField>
            <AdminField label="Slug *">
              <input name="slug" required defaultValue={editing.slug} className={inputClass} />
              <span className="text-xs font-medium text-ink/50 dark:text-slate-500">保存时会自动转成小写英文、数字和短横线。</span>
            </AdminField>
            <AdminField label="描述">
              <textarea name="description" rows={3} defaultValue={editing.description ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="排序">
              <input name="sort_order" type="number" defaultValue={editing.sort_order ?? 0} className={inputClass} />
            </AdminField>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
              <Button type="submit" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
            </div>
          </form>
        ) : null}
      </AdminModal>
    </>
  );
}
