"use client";

import {
  CheckCircle2,
  Database,
  Edit,
  Plus,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import {
  type TableSettings,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import type { FileStorageConfig, Paginated } from "@/types/blog";

type ConfigModalState = { mode: "create" | "edit"; item?: FileStorageConfig };

const configColumnOptions = [
  { key: "name", label: "配置名", locked: true },
  { key: "storage", label: "存储器" },
  { key: "primary", label: "主配置" },
  { key: "status", label: "状态" },
  { key: "publicUrl", label: "访问地址" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultSettings: TableSettings = {
  bordered: false,
  striped: true,
  headerBackground: false,
  density: "default",
  visibleColumns: configColumnOptions.map((column) => column.key),
};
const statusMap = {
  active: { label: "正常", variant: "success" as const },
  inactive: { label: "停用", variant: "danger" as const },
};

function storageLabel(type: FileStorageConfig["storage_type"]) {
  if (type === "local") return "本地磁盘";
  if (type === "s3") return "S3 Compatible";
  return "Cloudflare R2";
}

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
          ? "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]"
          : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]",
      )}
    >
      {children}
    </p>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4 md:grid-cols-2">
      <h3 className="font-black text-[var(--color-text)] md:col-span-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function AdminFileConfigPage() {
  const [configs, setConfigs] = useState<FileStorageConfig[]>([]);
  const [modal, setModal] = useState<ConfigModalState | null>(null);
  const [deleteItem, setDeleteItem] = useState<FileStorageConfig | null>(null);
  const [storageType, setStorageType] =
    useState<FileStorageConfig["storage_type"]>("r2");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useTableSettings(
    "admin-table-settings:files-config",
    defaultSettings,
    configColumnOptions,
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminRequest<Paginated<FileStorageConfig>>(
        "/admin/files/configs?page_size=50",
      );
      setConfigs(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(next: ConfigModalState) {
    setStorageType(next.item?.storage_type ?? "r2");
    setStatus(next.item?.status ?? "active");
    setModalError("");
    setModal(next);
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setModalError("");
  }

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setModalError("配置名称不能为空");
      return;
    }
    const payload = {
      name,
      storage_type: storageType,
      status,
      is_primary: form.get("is_primary") === "on",
      max_upload_size_mb: Number(form.get("max_upload_size_mb") || 5),
      allowed_file_types: String(form.get("allowed_file_types") ?? "").trim(),
      remark: modal.item?.remark ?? "",
      ...(storageType === "local"
        ? {
            local_path: String(form.get("local_path") ?? "").trim(),
            access_path: String(form.get("access_path") ?? "").trim(),
            public_base_url:
              String(form.get("public_base_url") ?? "").trim() || null,
            base_path: String(form.get("base_path") ?? "").trim() || "images",
          }
        : {
            bucket: String(form.get("bucket") ?? "").trim(),
            endpoint: String(form.get("endpoint") ?? "").trim(),
            public_base_url: String(form.get("public_base_url") ?? "").trim(),
            object_prefix:
              String(form.get("object_prefix") ?? "").trim() || "images",
            region:
              String(form.get("region") ?? "").trim() ||
              (storageType === "r2" ? "auto" : ""),
            access_key_id: String(form.get("access_key_id") ?? "").trim(),
            secret_access_key:
              String(form.get("secret_access_key") ?? "") || undefined,
          }),
    };
    setSaving(true);
    setModalError("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/files/configs/${modal.item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("文件配置已保存。");
      } else {
        await adminRequest("/admin/files/configs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("文件配置已新增。");
      }
      setModal(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function setPrimary(config: FileStorageConfig) {
    try {
      await adminRequest(`/admin/files/configs/${config.id}/set-primary`, {
        method: "POST",
      });
      setNotice("主存储配置已切换。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "切换失败");
    }
  }

  async function testConfig(config: FileStorageConfig) {
    try {
      const result = await adminRequest<{ message: string }>(
        `/admin/files/configs/${config.id}/test`,
        { method: "POST" },
      );
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "配置检查失败");
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminRequest(`/admin/files/configs/${deleteItem.id}`, {
        method: "DELETE",
      });
      setDeleteItem(null);
      setNotice("文件配置已删除。");
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<AdminDataTableColumn<FileStorageConfig>>>(
    () => [
      {
        key: "name",
        title: "配置名",
        width: 180,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("name"),
        render: (config) => (
          <span className="font-black text-[var(--color-text)]">
            {config.name}
          </span>
        ),
      },
      {
        key: "storage",
        title: "存储器",
        width: 170,
        hidden: !settings.visibleColumns.includes("storage"),
        render: (config) => {
          const Icon = config.storage_type === "local" ? Database : Server;
          return (
            <span className="inline-flex max-w-full items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] px-2 py-1 text-xs font-black text-[var(--admin-primary)] ring-1 ring-[color-mix(in_srgb,var(--admin-primary)_24%,transparent)]">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {storageLabel(config.storage_type)}
            </span>
          );
        },
      },
      {
        key: "primary",
        title: "主配置",
        width: 110,
        hidden: !settings.visibleColumns.includes("primary"),
        render: (config) => (
          <StatusTag
            status={config.is_primary}
            label={config.is_primary ? "是" : "否"}
          />
        ),
      },
      {
        key: "status",
        title: "状态",
        width: 100,
        hidden: !settings.visibleColumns.includes("status"),
        render: (config) => (
          <StatusTag status={config.status} map={statusMap} />
        ),
      },
      {
        key: "publicUrl",
        title: "访问地址",
        minWidth: 220,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("publicUrl"),
        render: (config) => config.public_base_url || config.access_path || "-",
      },
      {
        key: "createdAt",
        title: "创建时间",
        width: 180,
        hidden: !settings.visibleColumns.includes("createdAt"),
        render: (config) => (
          <span className="text-[var(--color-text-muted)]">
            {formatDate(config.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: 180,
        align: "center",
        hidden: !settings.visibleColumns.includes("actions"),
        render: (config) => (
          <RowActions
            actions={[
              {
                key: "edit",
                label: "编辑",
                icon: (
                  <Edit className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "edit",
                onClick: () => openModal({ mode: "edit", item: config }),
              },
              {
                key: "test",
                label: "检查配置",
                icon: (
                  <CheckCircle2
                    className={rowActionIconClass}
                    aria-hidden="true"
                  />
                ),
                variant: "neutral",
                onClick: () => void testConfig(config),
              },
              ...(!config.is_primary
                ? [
                    {
                      key: "primary",
                      label: "设为主配置",
                      icon: (
                        <ShieldCheck
                          className={rowActionIconClass}
                          aria-hidden="true"
                        />
                      ),
                      variant: "warning" as const,
                      onClick: () => void setPrimary(config),
                    },
                  ]
                : []),
              {
                key: "delete",
                label: config.is_primary ? "主配置不可删除" : "删除",
                icon: (
                  <Trash2 className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "delete",
                disabled: config.is_primary,
                onClick: () => setDeleteItem(config),
              },
            ]}
          />
        ),
      },
    ],
    [settings.visibleColumns],
  );

  return (
    <AdminPage
      title="文件配置"
      description="管理本地、Cloudflare R2 和 S3 Compatible 存储配置。"
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminDataTable
        columns={columns}
        data={configs}
        rowKey="id"
        settings={settings}
        loading={loading}
        emptyText="暂无文件配置"
        minWidth={1140}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => openModal({ mode: "create" })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              新增
            </Button>
            <AdminTableToolbar
              settings={settings}
              onSettingsChange={setSettings}
              columns={configColumnOptions}
              onRefresh={() => void load()}
              refreshing={loading}
              enableRefresh
              enableDensity
              enableColumns
              enableStyle
            />
          </div>
        }
      />

      <AdminModal
        open={Boolean(modal)}
        title={modal?.mode === "edit" ? "编辑存储配置" : "新增存储配置"}
        size="lg"
        onClose={closeModal}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" form="file-config-form" loading={saving}>
              确定
            </Button>
          </>
        }
      >
        <form
          id="file-config-form"
          key={modal?.item?.id ?? "new"}
          onSubmit={saveConfig}
          className="grid gap-5"
        >
          <ModalError message={modalError} />
          <FormSection title="基础信息">
            <Input
              name="name"
              label="配置名称"
              required
              defaultValue={modal?.item?.name ?? ""}
            />
            <Select
              label="存储器类型"
              value={storageType}
              onChange={(event) =>
                setStorageType(
                  event.target.value as FileStorageConfig["storage_type"],
                )
              }
              options={[
                { label: "本地磁盘", value: "local" },
                { label: "Cloudflare R2", value: "r2" },
                { label: "S3 Compatible", value: "s3" },
              ]}
            />
            <Select
              label="状态"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { label: "正常", value: "active" },
                { label: "停用", value: "inactive" },
              ]}
            />
            <div className="self-end">
              <Checkbox
                name="is_primary"
                label="设为主存储配置"
                defaultChecked={modal?.item?.is_primary ?? !configs.length}
              />
            </div>
          </FormSection>

          {storageType === "local" ? (
            <FormSection title="本地存储配置">
              <Input
                name="local_path"
                label="存储路径"
                required
                defaultValue={modal?.item?.local_path ?? "/app/uploads"}
                placeholder="/app/uploads"
              />
              <Input
                name="access_path"
                label="访问路径"
                required
                defaultValue={modal?.item?.access_path ?? "/uploads"}
                placeholder="/uploads"
              />
              <Input
                name="public_base_url"
                label="自定义域名"
                defaultValue={modal?.item?.public_base_url ?? ""}
                placeholder="https://static.example.com"
              />
              <Input
                name="base_path"
                label="基础路径"
                defaultValue={modal?.item?.base_path ?? "images"}
                placeholder="images"
              />
            </FormSection>
          ) : (
            <FormSection
              title={storageType === "r2" ? "Cloudflare R2 配置" : "S3 配置"}
            >
              <Input
                name="bucket"
                label="Bucket"
                required
                defaultValue={modal?.item?.bucket ?? ""}
              />
              <Input
                name="region"
                label="Region"
                defaultValue={
                  modal?.item?.region ?? (storageType === "r2" ? "auto" : "")
                }
              />
              <Input
                name="endpoint"
                label="Endpoint"
                required
                defaultValue={modal?.item?.endpoint ?? ""}
                placeholder="https://"
              />
              <Input
                name="public_base_url"
                label="公开访问域名"
                required
                defaultValue={modal?.item?.public_base_url ?? ""}
                placeholder="https://"
              />
              <Input
                name="object_prefix"
                label="路径前缀"
                defaultValue={modal?.item?.object_prefix ?? "images"}
              />
              <Input
                name="access_key_id"
                label="Access Key ID"
                required={!modal?.item?.access_key_id}
                defaultValue={modal?.item?.access_key_id ?? ""}
              />
              <Input
                name="secret_access_key"
                label="Secret Access Key"
                type="password"
                required={!modal?.item?.secret_access_key}
                placeholder={
                  modal?.item?.secret_access_key
                    ? "已配置，留空不修改"
                    : "请输入 Secret"
                }
              />
            </FormSection>
          )}

          <FormSection title="上传限制">
            <Input
              name="max_upload_size_mb"
              label="最大上传大小 MB"
              type="number"
              min={1}
              max={100}
              defaultValue={modal?.item?.max_upload_size_mb ?? 5}
            />
            <Input
              name="allowed_file_types"
              label="允许文件类型"
              defaultValue={
                modal?.item?.allowed_file_types ??
                "image/jpeg,image/png,image/webp"
              }
            />
          </FormSection>
        </form>
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteItem)}
        description={
          deleteItem
            ? `确定删除文件配置「${deleteItem.name}」吗？`
            : "确定删除该配置吗？"
        }
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPage>
  );
}
