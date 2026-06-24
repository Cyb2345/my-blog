"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { CommentItem } from "@/types/blog";

export default function AdminCommentsPage() {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [deleteItem, setDeleteItem] = useState<CommentItem | null>(null);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function load() {
    adminRequest<CommentItem[]>("/admin/comments").then(setItems).catch((err: Error) => setError(err.message));
  }

  useEffect(load, []);

  async function action(path: string, method = "POST") {
    try {
      await adminRequest(path, { method });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminRequest(`/admin/comments/${deleteItem.id}`, { method: "DELETE" });
      setDeleteItem(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const statusText: Record<CommentItem["status"], string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
  };

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      <div className="motion-surface overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
        <table className="admin-table w-full min-w-[900px] text-sm">
          <thead className="bg-paper text-left text-ink/60">
            <tr>
              <th className="p-3">昵称</th>
              <th className="p-3">邮箱</th>
              <th className="p-3">内容</th>
              <th className="p-3">状态</th>
              <th className="p-3">时间</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-ink/10 align-top">
                <td className="p-3 font-bold">{item.nickname}</td>
                <td className="p-3 text-ink/60">{item.email}</td>
                <td className="max-w-md p-3 text-ink/70">{item.content}</td>
                <td className="p-3 text-ink/60">{statusText[item.status]}</td>
                <td className="p-3 text-ink/60">{formatDate(item.created_at)}</td>
                <td className="p-3">
                  <AdminTableActions>
                    <AdminTableActionButton variant="success" onClick={() => action(`/admin/comments/${item.id}/approve`)} title="通过" aria-label="通过"><Check className={adminTableActionIconClass} /></AdminTableActionButton>
                    <AdminTableActionButton variant="warning" onClick={() => action(`/admin/comments/${item.id}/reject`)} title="驳回" aria-label="驳回"><X className={adminTableActionIconClass} /></AdminTableActionButton>
                    <AdminTableActionButton variant="delete" onClick={() => setDeleteItem(item)} title="删除" aria-label="删除"><Trash2 className={adminTableActionIconClass} /></AdminTableActionButton>
                  </AdminTableActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteConfirmDialog open={Boolean(deleteItem)} description={deleteItem ? `确定删除留言「${deleteItem.nickname}」吗？` : "确定删除该留言吗？"} error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteItem(null)} onConfirm={() => void confirmDelete()} />
    </>
  );
}
