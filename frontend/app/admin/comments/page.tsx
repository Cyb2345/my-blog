"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminPage } from "@/components/admin/AdminPage";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import type { CommentItem } from "@/types/blog";

function Notice({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: string;
}) {
  return (
    <p
      className={cn(
        "notice-pop rounded-md px-3 py-2 text-sm font-bold",
        variant === "error"
          ? "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive"
          : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]",
      )}
    >
      {children}
    </p>
  );
}

const statusMap = {
  pending: { label: "待审核", variant: "warning" as const },
  approved: { label: "已通过", variant: "success" as const },
  rejected: { label: "已拒绝", variant: "danger" as const },
};

export default function AdminCommentsPage() {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [deleteItem, setDeleteItem] = useState<CommentItem | null>(null);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await adminRequest<CommentItem[]>("/admin/comments"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "留言列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(path: string, method = "POST") {
    setError("");
    try {
      await adminRequest(path, { method });
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
      await adminRequest(`/admin/comments/${deleteItem.id}`, {
        method: "DELETE",
      });
      setDeleteItem(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<AdminDataTableColumn<CommentItem>>>(
    () => [
      {
        key: "nickname",
        title: "昵称",
        width: 140,
        render: (item) => (
          <span className="font-black text-foreground">{item.nickname}</span>
        ),
      },
      {
        key: "email",
        title: "邮箱",
        width: 190,
        ellipsis: true,
        render: (item) => item.email || "-",
      },
      {
        key: "content",
        title: "内容",
        minWidth: 320,
        ellipsis: true,
        render: (item) => item.content,
      },
      {
        key: "status",
        title: "状态",
        width: 110,
        render: (item) => <StatusTag status={item.status} map={statusMap} />,
      },
      {
        key: "createdAt",
        title: "时间",
        width: 140,
        render: (item) => formatDate(item.created_at),
      },
      {
        key: "actions",
        title: "操作",
        width: 150,
        align: "center",
        render: (item) => (
          <RowActions
            actions={[
              {
                key: "approve",
                label: "通过",
                icon: <Check className={rowActionIconClass} />,
                variant: "success",
                onClick: () =>
                  void action(`/admin/comments/${item.id}/approve`),
              },
              {
                key: "reject",
                label: "驳回",
                icon: <X className={rowActionIconClass} />,
                variant: "warning",
                onClick: () => void action(`/admin/comments/${item.id}/reject`),
              },
              {
                key: "delete",
                label: "删除",
                icon: <Trash2 className={rowActionIconClass} />,
                variant: "delete",
                onClick: () => setDeleteItem(item),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <AdminPage title="留言管理" description="审核、驳回或删除前台留言。">
      {error ? <Notice variant="error">{error}</Notice> : null}
      <AdminDataTable
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        emptyText="暂无留言"
        minWidth={900}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteItem)}
        description={
          deleteItem
            ? `确定删除留言「${deleteItem.nickname}」吗？`
            : "确定删除该留言吗？"
        }
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPage>
  );
}
