"use client";

import { Edit, Plus, Save, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { Paginated, SystemParam } from "@/types/blog";

export default function AdminParamsPage() {
  const [params, setParams] = useState<SystemParam[]>([]);
  const [editing, setEditing] = useState<SystemParam | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page) {
    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        page_size: "10",
      });
      if (keyword.trim()) query.set("keyword", keyword.trim());
      const data = await adminRequest<Paginated<SystemParam>>(`/admin/system/params?${query.toString()}`);
      setParams(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    await load(1);
  }

  async function saveParam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      key: String(form.get("key") ?? ""),
      value: String(form.get("value") ?? ""),
      is_system: form.get("is_system") === "on",
      remark: String(form.get("remark") ?? ""),
    };
    if (editing?.is_system && !window.confirm("这是系统内置参数，确认修改参数值吗？")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editing) {
        await adminRequest(`/admin/system/params/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: payload.name,
            value: payload.value,
            remark: payload.remark,
          }),
        });
        setNotice("参数已保存。");
      } else {
        await adminRequest("/admin/system/params", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("参数已新增。");
      }
      setEditing(null);
      await load(editing ? page : 1);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteParam(param: SystemParam) {
    if (!window.confirm(`确认删除参数「${param.name}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/system/params/${param.id}`, { method: "DELETE" });
      await load(page);
      setNotice("参数已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">System / Params</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">参数管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={search} className="motion-surface mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <AdminField label="关键词">
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="参数名称 / 键名 / 值" className={inputClass} />
        </AdminField>
        <Button type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          查询
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setKeyword(""); void load(1); }}>
          重置
        </Button>
      </form>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <form key={editing?.id ?? "new"} onSubmit={saveParam} className="motion-surface grid h-fit gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="text-lg font-black text-ink dark:text-slate-100">{editing ? "编辑参数" : "新增参数"}</h2>
          <AdminField label="参数名称">
            <input name="name" required defaultValue={editing?.name ?? ""} className={inputClass} />
          </AdminField>
          <AdminField label="参数键名">
            <input name="key" required disabled={Boolean(editing)} defaultValue={editing?.key ?? ""} className={inputClass} />
          </AdminField>
          <AdminField label="参数键值">
            <textarea name="value" rows={3} defaultValue={editing?.value ?? ""} className={inputClass} />
          </AdminField>
          <AdminField label="备注">
            <textarea name="remark" rows={3} defaultValue={editing?.remark ?? ""} className={inputClass} />
          </AdminField>
          {!editing ? (
            <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
              <input name="is_system" type="checkbox" />
              系统内置
            </label>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {editing ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {editing ? "保存参数" : "新增参数"}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
            ) : null}
          </div>
        </form>

        <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[980px] text-sm">
              <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="p-3">参数名称</th>
                  <th className="p-3">参数键名</th>
                  <th className="p-3">参数键值</th>
                  <th className="p-3">系统内置</th>
                  <th className="p-3">更新时间</th>
                  <th className="p-3">备注</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {params.map((param) => (
                  <tr key={param.id} className="border-t border-ink/10 dark:border-white/10">
                    <td className="p-3 font-black text-ink dark:text-slate-100">{param.name}</td>
                    <td className="p-3 font-mono text-xs font-bold text-ink/65 dark:text-slate-400">{param.key}</td>
                    <td className="max-w-[220px] truncate p-3 font-bold text-ink/70 dark:text-slate-300">{param.value}</td>
                    <td className="p-3">
                      <span className={param.is_system ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200"}>
                        {param.is_system ? "是" : "否"}
                      </span>
                    </td>
                    <td className="p-3 text-ink/60 dark:text-slate-400">{formatDate(param.updated_at)}</td>
                    <td className="max-w-[260px] truncate p-3 text-ink/60 dark:text-slate-400">{param.remark || "-"}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setEditing(param)}>
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          编辑
                        </Button>
                        {!param.is_system ? (
                          <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void deleteParam(param)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-4 py-3 text-sm font-bold text-ink/55 dark:border-white/10 dark:text-slate-400">
            <span>共 {total} 条</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" disabled={page <= 1} onClick={() => void load(page - 1)}>
                上一页
              </Button>
              <span>{page} / {pages}</span>
              <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" disabled={page >= pages} onClick={() => void load(page + 1)}>
                下一页
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
