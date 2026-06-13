"use client";

import { Edit, Plus, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { getAssetUrl } from "@/lib/utils";
import type { FriendLink, MediaAsset } from "@/types/blog";

type LinkModalState = {
  mode: "create" | "edit";
  item?: FriendLink;
};

export default function AdminLinksPage() {
  const [items, setItems] = useState<FriendLink[]>([]);
  const [modal, setModal] = useState<LinkModalState | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
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

  function openModal(next: LinkModalState) {
    setModalError("");
    setAvatarUrl(next.item?.avatar ?? "/images/blog-hero.png");
    setModal(next);
  }

  function closeModal() {
    if (saving || uploadingAvatar) return;
    setModal(null);
    setModalError("");
    setAvatarUrl("/images/blog-hero.png");
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setModalError("");
    setNotice("");
    const payload = new FormData();
    payload.append("file", file);
    payload.append("usage_type", "link_avatar");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", payload);
      setAvatarUrl(asset.url);
      setNotice("友链头像已上传。");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    if (!name || !url) {
      setModalError("名称和链接不能为空");
      return;
    }
    if (!/^https?:\/\//.test(url)) {
      setModalError("链接必须是 http 或 https 地址");
      return;
    }
    const payload = {
      name,
      url,
      description: form.get("description") || null,
      avatar: avatarUrl || null,
      status: form.get("status"),
      sort_order: Number(form.get("sort_order") || 0),
    };
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/links/${modal.item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("友链已保存，列表已刷新。");
      } else {
        await adminRequest("/admin/links", { method: "POST", body: JSON.stringify(payload) });
        setNotice("友链已新增，列表已刷新。");
      }
      setModal(null);
      setAvatarUrl("/images/blog-hero.png");
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
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
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">友链管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" onClick={() => openModal({ mode: "create" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增友链
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[780px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">名称</th>
                <th className="p-3">链接</th>
                <th className="p-3">描述</th>
                <th className="p-3">状态</th>
                <th className="p-3">排序</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-bold text-ink dark:text-slate-100">{item.name}</td>
                  <td className="max-w-64 truncate p-3 text-ink/60 dark:text-slate-400">{item.url}</td>
                  <td className="max-w-64 truncate p-3 text-ink/60 dark:text-slate-400">{item.description || "-"}</td>
                  <td className="p-3 text-ink/60 dark:text-slate-400">{item.status === "active" ? "启用" : "禁用"}</td>
                  <td className="p-3 text-ink/60 dark:text-slate-400">{item.sort_order}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => openModal({ mode: "edit", item })}>
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void remove(item)}>
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
      </section>

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑友链" : "新增友链"} size="md" onClose={closeModal}>
        <form key={modal?.item?.id ?? "new"} onSubmit={handleSubmit} className="grid gap-4">
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="名称 *">
              <input name="name" required defaultValue={modal?.item?.name ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="链接 *">
              <input name="url" type="url" required defaultValue={modal?.item?.url ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="状态">
              <select name="status" defaultValue={modal?.item?.status ?? "active"} className={inputClass}>
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </select>
            </AdminField>
            <AdminField label="排序">
              <input name="sort_order" type="number" defaultValue={modal?.item?.sort_order ?? 0} className={inputClass} />
            </AdminField>
          </div>
          <AdminField label="头像 URL">
            <div className="grid gap-2">
              <input name="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className={inputClass} />
              <label className="interactive inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
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
                <img src={getAssetUrl(avatarUrl)} alt="友链头像预览" className="h-16 w-16 rounded-md object-cover ring-1 ring-ink/10 dark:ring-white/10" />
              ) : null}
            </div>
          </AdminField>
          <AdminField label="描述">
            <textarea name="description" rows={3} defaultValue={modal?.item?.description ?? ""} className={inputClass} />
          </AdminField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving || uploadingAvatar}>取消</Button>
            <Button type="submit" disabled={saving || uploadingAvatar}>{saving ? "提交中..." : "提交"}</Button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
