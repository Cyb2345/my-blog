"use client";

import { Eye, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import type { AdminRole } from "@/types/blog";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [detail, setDetail] = useState<AdminRole | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    adminRequest<AdminRole[]>("/admin/system/roles")
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" variant="ghost" onClick={() => setNotice("第一版角色权限为系统预留配置，暂不支持新增自定义角色。")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增角色
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[760px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">角色名称</th>
                <th className="p-3">角色编码</th>
                <th className="p-3">描述</th>
                <th className="p-3">状态</th>
                <th className="p-3">用户数量</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.code} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-black text-ink dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" aria-hidden="true" />
                      {role.name}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs font-bold text-ink/60 dark:text-slate-400">{role.code}</td>
                  <td className="max-w-[360px] truncate p-3 text-ink/65 dark:text-slate-400">{role.description}</td>
                  <td className="p-3"><span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">启用</span></td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{role.user_count}</td>
                  <td className="p-3">
                    <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setDetail(role)}>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      详情
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal open={Boolean(detail)} title="角色详情" size="sm" onClose={() => setDetail(null)}>
        {detail ? (
          <div className="grid gap-3 text-sm">
            {[
              ["角色名称", detail.name],
              ["角色编码", detail.code],
              ["描述", detail.description],
              ["状态", detail.status === "active" ? "启用" : "停用"],
              ["用户数量", String(detail.user_count)],
              ["菜单权限", detail.menu_permissions.join(", ") || "-"],
              ["API 权限", detail.api_permissions.join(", ") || "-"],
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
    </>
  );
}
