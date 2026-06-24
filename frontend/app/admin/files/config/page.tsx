"use client";

import { CheckCircle2, Database, Edit, Plus, Server, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  DataTableToolbar,
  type TableSettings,
  tableDensityCellClass,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import type { FileStorageConfig, Paginated } from "@/types/blog";

type ConfigModalState = { mode: "create" | "edit"; item?: FileStorageConfig };

const defaultSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default",
  visibleColumns: [],
};

function storageLabel(type: FileStorageConfig["storage_type"]) {
  if (type === "local") return "本地磁盘";
  if (type === "s3") return "S3 Compatible";
  return "Cloudflare R2";
}

export default function AdminFileConfigPage() {
  const [configs, setConfigs] = useState<FileStorageConfig[]>([]);
  const [modal, setModal] = useState<ConfigModalState | null>(null);
  const [deleteItem, setDeleteItem] = useState<FileStorageConfig | null>(null);
  const [storageType, setStorageType] = useState<FileStorageConfig["storage_type"]>("r2");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useTableSettings("admin-table-settings:files-config", defaultSettings);
  const cellClass = tableDensityCellClass[settings.density];

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminRequest<Paginated<FileStorageConfig>>("/admin/files/configs?page_size=50");
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
            public_base_url: String(form.get("public_base_url") ?? "").trim() || null,
            base_path: String(form.get("base_path") ?? "").trim() || "images",
          }
        : {
            bucket: String(form.get("bucket") ?? "").trim(),
            endpoint: String(form.get("endpoint") ?? "").trim(),
            public_base_url: String(form.get("public_base_url") ?? "").trim(),
            object_prefix: String(form.get("object_prefix") ?? "").trim() || "images",
            region: String(form.get("region") ?? "").trim() || (storageType === "r2" ? "auto" : ""),
            access_key_id: String(form.get("access_key_id") ?? "").trim(),
            secret_access_key: String(form.get("secret_access_key") ?? "") || undefined,
          }),
    };
    setSaving(true);
    setModalError("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/files/configs/${modal.item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("文件配置已保存。");
      } else {
        await adminRequest("/admin/files/configs", { method: "POST", body: JSON.stringify(payload) });
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
      await adminRequest(`/admin/files/configs/${config.id}/set-primary`, { method: "POST" });
      setNotice("主存储配置已切换。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "切换失败");
    }
  }

  async function testConfig(config: FileStorageConfig) {
    try {
      const result = await adminRequest<{ message: string }>(`/admin/files/configs/${config.id}/test`, { method: "POST" });
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
      await adminRequest(`/admin/files/configs/${deleteItem.id}`, { method: "DELETE" });
      setDeleteItem(null);
      setNotice("文件配置已删除。");
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-[var(--border-soft)]">
          <Button type="button" variant="ghost" onClick={() => openModal({ mode: "create" })}><Plus className="h-4 w-4" />新增</Button>
          <DataTableToolbar settings={settings} onSettingsChange={setSettings} onRefresh={() => void load()} refreshing={loading} enableColumns={false} />
        </div>
        <div className="overflow-x-auto">
          <table className={cn("admin-table w-full min-w-[1140px] table-fixed border-collapse", settings.bordered && "[&_td]:border-r [&_th]:border-r [&_td]:border-ink/10 [&_th]:border-ink/10 dark:[&_td]:border-[var(--border-soft)] dark:[&_th]:border-[var(--border-soft)]")}>
            <colgroup><col className="w-[180px]" /><col className="w-[170px]" /><col className="w-[110px]" /><col className="w-[100px]" /><col className="w-[220px]" /><col className="w-[180px]" /><col className="w-[180px]" /></colgroup>
            <thead className={cn(settings.headerBackground && "bg-paper dark:bg-[var(--bg-soft)]")}>
              <tr>{["配置名", "存储器", "主配置", "状态", "访问地址", "创建时间", "操作"].map((label) => <th key={label} className={cn(cellClass, label === "操作" && "text-center")}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {configs.map((config, index) => (
                <tr key={config.id} className={cn("border-t border-ink/10 dark:border-[var(--border-soft)]", settings.striped && index % 2 === 1 && "bg-paper/45 dark:bg-white/[0.03]")}>
                  <td className={cn("font-black text-ink dark:text-[var(--text)]", cellClass)}>{config.name}</td>
                  <td className={cellClass}><span className="inline-flex items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-2 py-1 text-xs font-black text-blue-700 ring-1 ring-[color-mix(in_srgb,var(--primary)_28%,transparent)] dark:text-blue-100">{config.storage_type === "local" ? <Database className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}{storageLabel(config.storage_type)}</span></td>
                  <td className={cellClass}>{config.is_primary ? <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200">是</span> : "否"}</td>
                  <td className={cellClass}><span className={cn("rounded-md px-2 py-1 text-xs font-black ring-1", config.status === "active" ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-200" : "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-200")}>{config.status === "active" ? "正常" : "停用"}</span></td>
                  <td className={cellClass}><span className="block truncate" title={config.public_base_url || config.access_path || ""}>{config.public_base_url || config.access_path || "-"}</span></td>
                  <td className={cellClass}>{formatDate(config.created_at)}</td>
                  <td className={cellClass}>
                    <AdminTableActions>
                      <AdminTableActionButton variant="edit" onClick={() => openModal({ mode: "edit", item: config })} title="编辑" aria-label="编辑"><Edit className={adminTableActionIconClass} /></AdminTableActionButton>
                      <AdminTableActionButton variant="neutral" onClick={() => void testConfig(config)} title="检查配置" aria-label="检查配置"><CheckCircle2 className={adminTableActionIconClass} /></AdminTableActionButton>
                      {!config.is_primary ? <AdminTableActionButton variant="warning" onClick={() => void setPrimary(config)} title="设为主配置" aria-label="设为主配置"><ShieldCheck className={adminTableActionIconClass} /></AdminTableActionButton> : null}
                      <AdminTableActionButton variant="delete" disabled={config.is_primary} onClick={() => setDeleteItem(config)} title={config.is_primary ? "主配置不可删除" : "删除"} aria-label="删除"><Trash2 className={adminTableActionIconClass} /></AdminTableActionButton>
                    </AdminTableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑存储配置" : "新增存储配置"} size="lg" onClose={closeModal}>
        <form key={modal?.item?.id ?? "new"} onSubmit={saveConfig} className="grid gap-5">
          <ModalError message={modalError} />
          <section className="grid gap-4 rounded-lg border border-ink/10 bg-paper/50 p-4 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] md:grid-cols-2">
            <AdminField label="配置名称 *"><input name="name" required defaultValue={modal?.item?.name ?? ""} className={inputClass} /></AdminField>
            <AdminField label="存储器类型 *"><CustomSelect value={storageType} onChange={(value) => setStorageType(value as FileStorageConfig["storage_type"])} options={[{ label: "本地磁盘", value: "local", description: "保存到服务器本地目录" }, { label: "Cloudflare R2", value: "r2", description: "S3 API 兼容的 R2 存储" }, { label: "S3 Compatible", value: "s3", description: "AWS S3 或兼容对象存储" }]} /></AdminField>
            <AdminField label="状态"><CustomSelect value={status} onChange={setStatus} options={[{ label: "正常", value: "active" }, { label: "停用", value: "inactive" }]} /></AdminField>
            <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-bold dark:border-[var(--border-soft)] dark:bg-[var(--surface)]"><input name="is_primary" type="checkbox" defaultChecked={modal?.item?.is_primary ?? !configs.length} />设为主存储配置</label>
          </section>

          {storageType === "local" ? (
            <section className="grid gap-4 rounded-lg border border-ink/10 bg-paper/50 p-4 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] md:grid-cols-2">
              <h3 className="md:col-span-2 font-black text-ink dark:text-[var(--text)]">本地存储配置</h3>
              <AdminField label="存储路径 *"><input name="local_path" required defaultValue={modal?.item?.local_path ?? "/app/uploads"} placeholder="/app/uploads" className={inputClass} /></AdminField>
              <AdminField label="访问路径 *"><input name="access_path" required defaultValue={modal?.item?.access_path ?? "/uploads"} placeholder="/uploads" className={inputClass} /></AdminField>
              <AdminField label="自定义域名"><input name="public_base_url" defaultValue={modal?.item?.public_base_url ?? ""} placeholder="https://static.example.com" className={inputClass} /></AdminField>
              <AdminField label="基础路径"><input name="base_path" defaultValue={modal?.item?.base_path ?? "images"} placeholder="images" className={inputClass} /></AdminField>
            </section>
          ) : (
            <section className="grid gap-4 rounded-lg border border-ink/10 bg-paper/50 p-4 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] md:grid-cols-2">
              <h3 className="md:col-span-2 font-black text-ink dark:text-[var(--text)]">{storageType === "r2" ? "Cloudflare R2 配置" : "S3 配置"}</h3>
              <AdminField label="Bucket *"><input name="bucket" required defaultValue={modal?.item?.bucket ?? ""} className={inputClass} /></AdminField>
              <AdminField label="Region"><input name="region" defaultValue={modal?.item?.region ?? (storageType === "r2" ? "auto" : "")} className={inputClass} /></AdminField>
              <AdminField label="Endpoint *"><input name="endpoint" required defaultValue={modal?.item?.endpoint ?? ""} placeholder="https://" className={inputClass} /></AdminField>
              <AdminField label="公开访问域名 *"><input name="public_base_url" required defaultValue={modal?.item?.public_base_url ?? ""} placeholder="https://" className={inputClass} /></AdminField>
              <AdminField label="路径前缀"><input name="object_prefix" defaultValue={modal?.item?.object_prefix ?? "images"} className={inputClass} /></AdminField>
              <AdminField label="Access Key ID *"><input name="access_key_id" required={!modal?.item?.access_key_id} defaultValue={modal?.item?.access_key_id ?? ""} className={inputClass} /></AdminField>
              <AdminField label="Secret Access Key *"><input name="secret_access_key" type="password" required={!modal?.item?.secret_access_key} placeholder={modal?.item?.secret_access_key ? "已配置，留空不修改" : "请输入 Secret"} className={inputClass} /></AdminField>
            </section>
          )}

          <section className="grid gap-4 rounded-lg border border-ink/10 bg-paper/50 p-4 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] md:grid-cols-2">
            <h3 className="md:col-span-2 font-black text-ink dark:text-[var(--text)]">上传限制</h3>
            <AdminField label="最大上传大小 MB"><input name="max_upload_size_mb" type="number" min={1} max={100} defaultValue={modal?.item?.max_upload_size_mb ?? 5} className={inputClass} /></AdminField>
            <AdminField label="允许文件类型"><input name="allowed_file_types" defaultValue={modal?.item?.allowed_file_types ?? "image/jpeg,image/png,image/webp"} className={inputClass} /></AdminField>
          </section>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeModal}>取消</Button><Button type="submit" disabled={saving}>{saving ? "提交中..." : "确定"}</Button></div>
        </form>
      </AdminModal>

      <DeleteConfirmDialog open={Boolean(deleteItem)} description={deleteItem ? `确定删除文件配置「${deleteItem.name}」吗？` : "确定删除该配置吗？"} error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteItem(null)} onConfirm={() => void confirmDelete()} />
    </>
  );
}
