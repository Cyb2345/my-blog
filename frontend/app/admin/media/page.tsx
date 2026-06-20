"use client";

import { Image as ImageIcon, Upload, XCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { UploadProgress, type UploadProgressItem } from "@/components/admin/UploadProgress";
import { Button } from "@/components/ui/Button";
import { API_BASE_URL, adminRequest, adminUpload } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { MediaAsset } from "@/types/blog";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

function resolveAssetUrl(url: string) {
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

const usageLabels: Record<MediaAsset["usage_type"], string> = {
  general: "通用图片",
  post_cover: "文章封面",
  article_image: "正文图片",
  login_background: "登录背景",
  site_hero: "首页 Hero",
  avatar: "头像",
  link_avatar: "友链头像",
};

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem | null>(null);
  const [usageType, setUsageType] = useState<MediaAsset["usage_type"]>("general");

  async function load() {
    try {
      setItems(await adminRequest<MediaAsset[]>("/admin/media"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("请选择图片文件");
      return;
    }
    setUploading(true);
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    setError("");
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("usage_type", usageType);
      await adminUpload<MediaAsset>("/admin/uploads/image", payload, {
        onProgress: (progress) => setUploadProgress({ fileName: file.name, progress, status: "uploading" }),
      });
      setUploadProgress({ fileName: file.name, progress: 100, status: "success" });
      formElement.reset();
      await load();
      setNotice("图片已上传，媒体库已刷新。");
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
      setUploadProgress({ fileName: file.name, progress: 100, status: "error", error: message });
    } finally {
      setUploading(false);
    }
  }

  async function disableMedia(item: MediaAsset) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/media/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("媒体已停用。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "停用失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Media</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">媒体库</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form onSubmit={handleUpload} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h2 className="text-lg font-black text-ink dark:text-slate-100">上传图片</h2>
          <AdminField label="图片文件">
            <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className={inputClass} />
          </AdminField>
          <AdminField label="用途">
            <CustomSelect
              value={usageType}
              onChange={(value) => setUsageType(value as MediaAsset["usage_type"])}
              options={Object.entries(usageLabels).map(([value, label]) => ({ value, label }))}
            />
          </AdminField>
          <UploadProgress item={uploadProgress} />
          <Button type="submit" disabled={uploading}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {uploading ? "上传中..." : "上传图片"}
          </Button>
        </form>

        <div className="motion-list grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="interactive-card overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="relative bg-paper dark:bg-slate-950">
                {item.is_active ? null : (
                  <span className="absolute left-3 top-3 z-10 rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white">
                    已停用
                  </span>
                )}
                <img src={resolveAssetUrl(item.url)} alt={item.original_name} className="aspect-[16/10] w-full object-cover" />
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <h2 className="truncate text-sm font-black text-ink dark:text-slate-100">{item.original_name}</h2>
                  <p className="mt-1 text-xs font-bold text-ink/45 dark:text-slate-500">{usageLabels[item.usage_type]} / {(item.size / 1024).toFixed(1)} KB</p>
                  <p className="mt-1 text-xs font-bold text-ink/45 dark:text-slate-500">{formatDate(item.created_at)}</p>
                </div>
                <div className="rounded-md bg-paper p-2 text-xs font-bold text-ink/55 dark:bg-slate-950 dark:text-slate-400">
                  <p className="break-all">{item.url}</p>
                </div>
                {item.is_active ? (
                  <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => disableMedia(item)}>
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    停用
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
          {!items.length ? (
            <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-ink/15 bg-white text-ink/45 dark:border-white/10 dark:bg-slate-900 dark:text-slate-500">
              <div className="text-center">
                <ImageIcon className="mx-auto h-8 w-8" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold">暂无媒体资源</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
