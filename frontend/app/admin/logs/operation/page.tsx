"use client";

import { Eye, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminSearchForm } from "@/components/admin/AdminSearchForm";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import type { OperationLog, Paginated } from "@/types/blog";

function Notice({ variant, children }: { variant: "error" | "success"; children: string }) {
  return (
    <p className={cn("notice-pop rounded-md px-3 py-2 text-sm font-bold", variant === "error" ? "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive" : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]")}>
      {children}
    </p>
  );
}

export default function AdminOperationLogsPage() {
  const [items, setItems] = useState<OperationLog[]>([]);
  const [username, setUsername] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<OperationLog | null>(null);
  const [deleteItem, setDeleteItem] = useState<OperationLog | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load(nextPage = page, nextUsername = username, nextMethod = method, nextPageSize = pageSize) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(nextPage), page_size: String(nextPageSize) });
      if (nextUsername.trim()) query.set("username", nextUsername.trim());
      if (nextMethod) query.set("method", nextMethod);
      const data = await adminRequest<Paginated<OperationLog>>(`/admin/logs/operation?${query.toString()}`);
      setItems(data.items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作日志加载失败");
    } finally {
      setLoading(false);
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

  const columns = useMemo<Array<AdminDataTableColumn<OperationLog>>>(
    () => [
      { key: "operator", title: "操作人", width: 130, render: (item) => <span className="font-black text-foreground">{item.operator_username || "-"}</span> },
      { key: "path", title: "请求接口", minWidth: 240, ellipsis: true, dataIndex: "request_path" },
      { key: "method", title: "请求方式", width: 110, render: (item) => <StatusTag status={item.request_method} label={item.request_method} map={{ POST: { label: "POST", variant: "warning" }, PUT: { label: "PUT", variant: "info" }, DELETE: { label: "DELETE", variant: "danger" }, PATCH: { label: "PATCH", variant: "primary" }, GET: { label: "GET", variant: "success" } }} /> },
      { key: "api", title: "接口名", width: 180, ellipsis: true, render: (item) => item.api_name || "-" },
      { key: "ip", title: "IP", width: 140, render: (item) => item.ip || "-" },
      { key: "duration", title: "请求耗时", width: 120, render: (item) => <StatusTag status="duration" label={`${item.duration_ms} ms`} map={{ duration: { label: `${item.duration_ms} ms`, variant: "info" } }} /> },
      { key: "code", title: "状态码", width: 100, render: (item) => item.response_code || "-" },
      { key: "createdAt", title: "创建时间", width: 140, render: (item) => formatDate(item.created_at) },
      {
        key: "actions",
        title: "操作",
        width: 110,
        align: "center",
        render: (item) => (
          <RowActions
            actions={[
              { key: "detail", label: "详情", icon: <Eye className={rowActionIconClass} />, onClick: () => setDetail(item) },
              { key: "delete", label: "删除", icon: <Trash2 className={rowActionIconClass} />, variant: "delete", onClick: () => setDeleteItem(item) },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <AdminPage title="操作日志" description="查看和清理后台接口操作记录。">
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminSearchForm onSubmit={search} onReset={() => { setUsername(""); setMethod(""); void load(1, "", ""); }} loading={loading}>
        <Input label="用户名" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入用户名" />
        <AdminField label="请求方式">
          <CustomSelect value={method} onChange={setMethod} options={["", "POST", "PUT", "DELETE", "PATCH"].map((value) => ({ label: value || "全部", value }))} />
        </AdminField>
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        emptyText="暂无操作日志"
        minWidth={1100}
        pagination={<Pagination page={page} totalPages={pages} total={total} pageSize={pageSize} onPageChange={(nextPage) => void load(nextPage)} onPageSizeChange={(nextSize) => { setPageSize(nextSize); void load(1, username, method, nextSize); }} />}
      />

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
              <div key={label} className="grid gap-1 rounded-md bg-muted p-3">
                <p className="text-xs font-black text-muted-foreground">{label}</p>
                <p className="break-all font-bold text-foreground">{value}</p>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setDetail(null)}>关闭</Button>
            </div>
          </div>
        ) : null}
      </AdminModal>
      <DeleteConfirmDialog open={Boolean(deleteItem)} description="确定删除该操作日志吗？" error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteItem(null)} onConfirm={() => void confirmDelete()} />
    </AdminPage>
  );
}
