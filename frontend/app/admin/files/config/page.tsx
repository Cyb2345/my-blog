"use client";

import { Edit, Plus, Save, Server, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { FileStorageConfig, Paginated } from "@/types/blog";

export default function AdminFileConfigPage() {
  const [configs, setConfigs] = useState<FileStorageConfig[]>([]);
  const [editing, setEditing] = useState<FileStorageConfig | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await adminRequest<Paginated<FileStorageConfig>>("/admin/files/configs?page_size=50");
      setConfigs(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const secret = String(form.get("secret_access_key") ?? "");
    const payload = {
      name: String(form.get("name") ?? ""),
      storage_type: String(form.get("storage_type") ?? "r2"),
      status: String(form.get("status") ?? "active"),
      is_primary: form.get("is_primary") === "on",
      bucket: String(form.get("bucket") ?? ""),
      endpoint: String(form.get("endpoint") ?? ""),
      public_base_url: String(form.get("public_base_url") ?? ""),
      object_prefix: String(form.get("object_prefix") ?? ""),
      access_key_id: String(form.get("access_key_id") ?? ""),
      secret_access_key: secret || undefined,
      max_upload_size_mb: Number(form.get("max_upload_size_mb") || 5),
      allowed_file_types: String(form.get("allowed_file_types") ?? ""),
      remark: String(form.get("remark") ?? ""),
    };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editing) {
        await adminRequest(`/admin/files/configs/${editing.id}`, {
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
      setEditing(null);
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function setPrimary(config: FileStorageConfig) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/files/configs/${config.id}/set-primary`, { method: "POST" });
      await load();
      setNotice("主配置已切换。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "切换失败");
    }
  }

  async function testConfig(config: FileStorageConfig) {
    setError("");
    setNotice("");
    try {
      const result = await adminRequest<{ message: string }>(`/admin/files/configs/${config.id}/test`, { method: "POST" });
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "测试失败");
    }
  }

  async function deleteConfig(config: FileStorageConfig) {
    if (!window.confirm(`确认删除文件配置「${config.name}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/files/configs/${config.id}`, { method: "DELETE" });
      await load();
      setNotice("文件配置已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Files / Config</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">文件配置</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <form key={editing?.id ?? "new"} onSubmit={saveConfig} className="motion-surface grid h-fit gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="text-lg font-black text-ink dark:text-slate-100">{editing ? "编辑配置" : "新增配置"}</h2>
          <AdminField label="配置名">
            <input name="name" required defaultValue={editing?.name ?? ""} className={inputClass} />
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="存储器">
              <select name="storage_type" defaultValue={editing?.storage_type ?? "r2"} className={inputClass}>
                <option value="r2">Cloudflare R2</option>
                <option value="local">本地存储</option>
                <option value="s3">S3 compatible</option>
              </select>
            </AdminField>
            <AdminField label="状态">
              <select name="status" defaultValue={editing?.status ?? "active"} className={inputClass}>
                <option value="active">正常</option>
                <option value="inactive">停用</option>
              </select>
            </AdminField>
          </div>
          <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
            <input name="is_primary" type="checkbox" defaultChecked={editing?.is_primary ?? !configs.length} />
            主配置
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Bucket">
              <input name="bucket" defaultValue={editing?.bucket ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="Object Prefix">
              <input name="object_prefix" defaultValue={editing?.object_prefix ?? "images"} className={inputClass} />
            </AdminField>
          </div>
          <AdminField label="Endpoint">
            <input name="endpoint" defaultValue={editing?.endpoint ?? ""} className={inputClass} />
          </AdminField>
          <AdminField label="Public Base URL">
            <input name="public_base_url" defaultValue={editing?.public_base_url ?? "https://img.ccby.us"} className={inputClass} />
          </AdminField>
          <AdminField label="Access Key ID">
            <input name="access_key_id" defaultValue={editing?.access_key_id ?? ""} placeholder="保存后会脱敏显示" className={inputClass} />
          </AdminField>
          <AdminField label="Secret Access Key">
            <input name="secret_access_key" type="password" placeholder={editing?.secret_access_key ? "已配置，留空表示不修改" : "请输入 Secret"} className={inputClass} />
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="最大上传大小 MB">
              <input name="max_upload_size_mb" type="number" min={1} max={100} defaultValue={editing?.max_upload_size_mb ?? 5} className={inputClass} />
            </AdminField>
            <AdminField label="允许文件类型">
              <input name="allowed_file_types" defaultValue={editing?.allowed_file_types ?? "image/jpeg,image/png,image/webp"} className={inputClass} />
            </AdminField>
          </div>
          <AdminField label="备注">
            <textarea name="remark" rows={3} defaultValue={editing?.remark ?? ""} className={inputClass} />
          </AdminField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {editing ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {editing ? "保存配置" : "新增配置"}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
            ) : null}
          </div>
        </form>

        <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[940px] text-sm">
              <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="p-3">配置名</th>
                  <th className="p-3">存储器</th>
                  <th className="p-3">主配置</th>
                  <th className="p-3">状态</th>
                  <th className="p-3">Public URL</th>
                  <th className="p-3">Secret</th>
                  <th className="p-3">创建时间</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id} className="border-t border-ink/10 dark:border-white/10">
                    <td className="p-3 font-black text-ink dark:text-slate-100">{config.name}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-600 dark:bg-sky-400/10 dark:text-sky-200">
                        <Server className="h-3.5 w-3.5" aria-hidden="true" />
                        {config.storage_type === "r2" ? "R2服务器" : config.storage_type}
                      </span>
                    </td>
                    <td className="p-3">{config.is_primary ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">是</span> : "否"}</td>
                    <td className="p-3">{config.status === "active" ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">正常</span> : <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200">停用</span>}</td>
                    <td className="max-w-[220px] truncate p-3 text-ink/60 dark:text-slate-400">{config.public_base_url || "-"}</td>
                    <td className="p-3 font-mono text-xs text-ink/60 dark:text-slate-400">{config.secret_access_key || "未配置"}</td>
                    <td className="p-3 text-ink/60 dark:text-slate-400">{formatDate(config.created_at)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setEditing(config)}>
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          编辑
                        </Button>
                        {!config.is_primary ? (
                          <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void setPrimary(config)}>
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            主配置
                          </Button>
                        ) : null}
                        <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void testConfig(config)}>
                          测试
                        </Button>
                        {!config.is_primary ? (
                          <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void deleteConfig(config)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
