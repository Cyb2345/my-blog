"use client";

import { Eye, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { OperationLog, Paginated } from "@/types/blog";

export default function AdminOperationLogsPage() {
  const [items, setItems] = useState<OperationLog[]>([]);
  const [username, setUsername] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<OperationLog | null>(null);
  const [deleteItem, setDeleteItem] = useState<OperationLog | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminRequest(`/admin/logs/operation/${deleteItem.id}`, { method: "DELETE" });
      setDeleteItem(null);
      await load(page);
      setNotice("操作日志已删除。");
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

      <form onSubmit={search} className="motion-surface mb-4 grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)] sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
        <AdminField label="用户名">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" className={inputClass} />
        </AdminField>
        <AdminField label="请求方式">
          <CustomSelect value={method} onChange={setMethod} options={["", "POST", "PUT", "DELETE", "PATCH"].map((value) => ({ label: value || "全部", value }))} />
        </AdminField>
        <div className="flex items-end gap-2"><Button type="submit"><Search className="h-4 w-4" aria-hidden="true" />查询</Button><Button type="button" variant="ghost" onClick={() => { setUsername(""); setMethod(""); void load(1, "", ""); }}>重置</Button></div>
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
                  <td className="p-3"><span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-black text-blue-800 ring-1 ring-blue-200 dark:bg-[color-mix(in_srgb,var(--primary)_34%,transparent)] dark:text-white dark:ring-[color-mix(in_srgb,var(--primary)_58%,transparent)]">{item.duration_ms} ms</span></td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.response_code || "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatDate(item.created_at)}</td>
                  <td className="p-3">
                    <AdminTableActions>
                      <AdminTableActionButton variant="neutral" onClick={() => setDetail(item)} title="详情" aria-label="详情"><Eye className={adminTableActionIconClass} /></AdminTableActionButton>
                      <AdminTableActionButton variant="delete" onClick={() => setDeleteItem(item)} title="删除" aria-label="删除"><Trash2 className={adminTableActionIconClass} /></AdminTableActionButton>
                    </AdminTableActions>
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

      <AdminModal open={Boolean(detail)} title="操作日志详情" size="md" onClose={() => setDetail(null)}>
        {detail ? (
          <div className="grid gap-3 text-sm">
            {[
              ["操作人", detail.operator_username || "-"],
              ["请求接口", detail.request_path],
              ["请求方式", detail.request_method],
              ["接口名", detail.api_name || "-"],
              ["IP", detail.ip || "-"],
              ["IP 来源", detail.ip_location || "-"],
              ["请求耗时", `${detail.duration_ms} ms`],
              ["创建时间", formatDate(detail.created_at)],
              ["响应状态", String(detail.response_code ?? "-")],
              ["请求参数", detail.request_body || "未记录请求体，避免敏感字段入库"],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-md bg-paper p-3 dark:bg-slate-950">
                <p className="text-xs font-black text-ink/45 dark:text-slate-500">{label}</p>
                <p className="break-all font-bold text-ink/75 dark:text-slate-300">{value}</p>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setDetail(null)}>关闭</Button>
            </div>
          </div>
        ) : null}
      </AdminModal>
      <DeleteConfirmDialog open={Boolean(deleteItem)} description="确定删除该操作日志吗？" error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteItem(null)} onConfirm={() => void confirmDelete()} />
    </>
  );
}
