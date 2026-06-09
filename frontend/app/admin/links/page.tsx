"use client";

import { Edit, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { getAssetUrl } from "@/lib/utils";
import type { FriendLink, MediaAsset } from "@/types/blog";

export default function AdminLinksPage() {
  const [items, setItems] = useState<FriendLink[]>([]);
  const [editing, setEditing] = useState<FriendLink | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("/images/blog-hero.png");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function load() {
    try {
      setItems(await adminRequest<FriendLink[]>("/admin/links"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setAvatarUrl(editing?.avatar ?? "/images/blog-hero.png");
  }, [editing]);

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    setNotice("");
    const payload = new FormData();
    payload.append("file", file);
    payload.append("usage_type", "link_avatar");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", payload);
      setAvatarUrl(asset.url);
      setNotice("友链头像已上传。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      url: form.get("url"),
      description: form.get("description") || null,
      avatar: avatarUrl || null,
      status: form.get("status"),
      sort_order: Number(form.get("sort_order") || 0),
    };
    try {
      if (editing) {
        await adminRequest(`/admin/links/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("友链已保存，列表已刷新。");
      } else {
        await adminRequest("/admin/links", { method: "POST", body: JSON.stringify(payload) });
        setNotice("友链已新增，列表已刷新。");
      }
      setEditing(null);
      setAvatarUrl("/images/blog-hero.png");
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: FriendLink) {
    if (!window.confirm(`确认删除友链「${item.name}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/links/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("友链已删除，列表已刷新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Links</p>
        <h1 className="mt-2 text-2xl font-black text-ink">友链管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">{notice}</p> : null}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-ink">{editing ? "编辑友链" : "新增友链"}</h2>
          <AdminField label="名称">
            <input name="name" required defaultValue={editing?.name ?? ""} className={inputClass} />
          </AdminField>
          <AdminField label="链接">
            <input name="url" type="url" required defaultValue={editing?.url ?? ""} className={inputClass} />
          </AdminField>
          <AdminField label="头像 URL">
            <div className="grid gap-2">
              <input name="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className={inputClass} />
              <label className="interactive inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {uploadingAvatar ? "上传中..." : "上传友链头像"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)}
                  disabled={uploadingAvatar}
                />
              </label>
              {avatarUrl ? (
                <img src={getAssetUrl(avatarUrl)} alt="友链头像预览" className="h-16 w-16 rounded-md object-cover ring-1 ring-ink/10" />
              ) : null}
            </div>
          </AdminField>
          <AdminField label="描述">
            <textarea name="description" rows={3} defaultValue={editing?.description ?? ""} className={inputClass} />
          </AdminField>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="状态">
              <select name="status" defaultValue={editing?.status ?? "active"} className={inputClass}>
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </select>
            </AdminField>
            <AdminField label="排序">
              <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputClass} />
            </AdminField>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{editing ? "保存修改" : "新增友链"}</Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
            ) : null}
          </div>
        </form>
        <div className="motion-surface overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
          <table className="admin-table w-full min-w-[720px] text-sm">
            <thead className="bg-paper text-left text-ink/60">
              <tr>
                <th className="p-3">名称</th>
                <th className="p-3">链接</th>
                <th className="p-3">状态</th>
                <th className="p-3">排序</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10">
                  <td className="p-3 font-bold">{item.name}</td>
                  <td className="max-w-64 truncate p-3 text-ink/60">{item.url}</td>
                  <td className="p-3 text-ink/60">{item.status === "active" ? "启用" : "禁用"}</td>
                  <td className="p-3 text-ink/60">{item.sort_order}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setEditing(item)}>
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => remove(item)}>
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
      </div>
    </>
  );
}
