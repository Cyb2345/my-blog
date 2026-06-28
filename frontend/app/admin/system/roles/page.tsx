"use client";

import { Eye, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/AdminDataTable";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/types/blog";

function Notice({ variant, children }: { variant: "error" | "success"; children: string }) {
  return (
    <p className={cn("notice-pop rounded-md px-3 py-2 text-sm font-bold", variant === "error" ? "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive" : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]")}>
      {children}
    </p>
  );
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [detail, setDetail] = useState<AdminRole | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRoles(await adminRequest<AdminRole[]>("/admin/system/roles"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "角色列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo<Array<AdminDataTableColumn<AdminRole>>>(
    () => [
      {
        key: "name",
        title: "角色名称",
        width: 180,
        render: (role) => (
          <span className="inline-flex items-center gap-2 font-black text-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            {role.name}
          </span>
        ),
      },
      { key: "code", title: "角色编码", width: 130, render: (role) => <span className="font-mono text-xs font-bold">{role.code}</span> },
      { key: "description", title: "描述", minWidth: 280, ellipsis: true, dataIndex: "description" },
      { key: "status", title: "状态", width: 100, render: (role) => <StatusTag status={role.status} /> },
      { key: "users", title: "用户数量", width: 110, render: (role) => role.user_count },
      {
        key: "actions",
        title: "操作",
        width: 100,
        align: "center",
        render: (role) => <RowActions actions={[{ key: "detail", label: "详情", icon: <Eye className={rowActionIconClass} />, onClick: () => setDetail(role) }]} />,
      },
    ],
    [],
  );

  return (
    <AdminPage
      title="角色管理"
      description="查看系统角色和权限范围。"
      actions={
        <Button type="button" variant="ghost" onClick={() => setNotice("第一版角色权限为系统预留配置，暂不支持新增自定义角色。")}>
          <Plus className="size-4" aria-hidden="true" />
          新增角色
        </Button>
      }
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}
      <AdminDataTable columns={columns} data={roles} rowKey="code" loading={loading} emptyText="暂无角色" minWidth={760} />

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
    </AdminPage>
  );
}
