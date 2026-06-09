"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { CommentItem } from "@/types/blog";

export default function AdminCommentsPage() {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [error, setError] = useState("");

  function load() {
    adminRequest<CommentItem[]>("/admin/comments").then(setItems).catch((err: Error) => setError(err.message));
  }

  useEffect(load, []);

  async function action(path: string, method = "POST") {
    if (method === "DELETE" && !window.confirm("确认删除这条留言吗？")) return;
    try {
      await adminRequest(path, { method });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  const statusText: Record<CommentItem["status"], string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
  };

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Comments</p>
        <h1 className="mt-2 text-2xl font-black text-ink">留言管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <div className="motion-surface overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
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
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" className="h-9 min-h-9 px-3" onClick={() => action(`/admin/comments/${item.id}/approve`)}>
                      <Check className="h-4 w-4" />
                      通过
                    </Button>
                    <Button variant="ghost" className="h-9 min-h-9 px-3" onClick={() => action(`/admin/comments/${item.id}/reject`)}>
                      <X className="h-4 w-4" />
                      驳回
                    </Button>
                    <Button variant="danger" className="h-9 min-h-9 px-3" onClick={() => action(`/admin/comments/${item.id}`, "DELETE")}>
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
    </>
  );
}
