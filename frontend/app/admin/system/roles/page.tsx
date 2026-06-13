"use client";

import { ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { adminRequest } from "@/lib/auth";
import type { AdminRole } from "@/types/blog";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminRequest<AdminRole[]>("/admin/system/roles")
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">System / Roles</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">角色管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      <div className="motion-list grid gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <article key={role.code} className="interactive-card rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ink/50 dark:text-slate-500">{role.code}</p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-ink dark:text-slate-100">
                  <ShieldCheck className="h-5 w-5 text-blue-500" aria-hidden="true" />
                  {role.name}
                </h2>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">启用</span>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-ink/65 dark:text-slate-400">{role.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-paper p-3 dark:bg-slate-950">
                <p className="text-xs font-bold text-ink/45 dark:text-slate-500">用户数量</p>
                <p className="mt-1 flex items-center gap-2 text-lg font-black text-ink dark:text-slate-100">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {role.user_count}
                </p>
              </div>
              <div className="rounded-md bg-paper p-3 dark:bg-slate-950">
                <p className="text-xs font-bold text-ink/45 dark:text-slate-500">权限预留</p>
                <p className="mt-1 text-sm font-black text-ink dark:text-slate-100">{role.api_permissions.length} 个 API 权限</p>
              </div>
            </div>
          </article>
        ))}
        {!roles.length && !error ? (
          <div className="rounded-lg border border-dashed border-ink/15 bg-white p-8 text-center text-sm font-bold text-ink/45 dark:border-white/10 dark:bg-slate-900 dark:text-slate-500">
            暂无角色数据
          </div>
        ) : null}
      </div>
    </>
  );
}
