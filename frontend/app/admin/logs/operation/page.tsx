"use client";

import { Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { OperationLog, Paginated } from "@/types/blog";

export default function AdminOperationLogsPage() {
  const [items, setItems] = useState<OperationLog[]>([]);
  const [username, setUsername] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(nextPage = page, nextUsername = username, nextMethod = method) {
    try {
      const query = new URLSearchParams({ page: String(nextPage), page_size: "10" });
      if (nextUsername.trim()) query.set("username", nextUsername.trim());
      if (nextMethod) query.set("method", nextMethod);
      const data = await adminRequest<Paginated<OperationLog>>(`/admin/logs/operation?${query.toString()}`);
      setItems(data.items);
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
    await load(1);
  }

  async function deleteLog(item: OperationLog) {
    if (!window.confirm("确认删除这条操作日志吗？")) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/logs/operation/${item.id}`, { method: "DELETE" });
      await load(page);
      setNotice("操作日志已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Logs / Operation</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">操作日志</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={search} className="motion-surface mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <AdminField label="用户名">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" className={inputClass} />
        </AdminField>
        <AdminField label="请求方式">
          <select value={method} onChange={(event) => setMethod(event.target.value)} className={inputClass}>
            <option value="">全部</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </AdminField>
        <Button type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          查询
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setUsername(""); setMethod(""); void load(1, "", ""); }}>
          重置
        </Button>
      </form>

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1100px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">操作人</th>
                <th className="p-3">请求接口</th>
                <th className="p-3">请求方式</th>
                <th className="p-3">接口名</th>
                <th className="p-3">IP</th>
                <th className="p-3">请求耗时</th>
                <th className="p-3">状态码</th>
                <th className="p-3">创建时间</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-black text-ink dark:text-slate-100">{item.operator_username || "-"}</td>
                  <td className="max-w-[260px] truncate p-3 text-ink/65 dark:text-slate-400">{item.request_path}</td>
                  <td className="p-3">
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">{item.request_method}</span>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.api_name || "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.ip || "-"}</td>
                  <td className="p-3"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-600 dark:bg-sky-400/10 dark:text-sky-200">{item.duration_ms} ms</span></td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.response_code || "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatDate(item.created_at)}</td>
                  <td className="p-3">
                    <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void deleteLog(item)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm font-bold text-ink/45 dark:text-slate-500">暂无操作日志</td>
                </tr>
              ) : null}
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
    </>
  );
}
