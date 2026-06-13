"use client";

import { Copy, Eye, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate, getAssetUrl } from "@/lib/utils";
import type { MediaAsset, Paginated } from "@/types/blog";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminFileListPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [keyword, setKeyword] = useState("");
  const [fileType, setFileType] = useState("");
  const [storageType, setStorageType] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(nextPage = page, nextKeyword = keyword) {
    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        page_size: "10",
      });
      if (nextKeyword.trim()) query.set("keyword", nextKeyword.trim());
      if (fileType) query.set("file_type", fileType);
      if (storageType) query.set("storage_type", storageType);
      const data = await adminRequest<Paginated<MediaAsset>>(`/admin/files?${query.toString()}`);
      setItems(data.items);
      setSelected([]);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    await load(1);
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setNotice("文件 URL 已复制。");
  }

  async function deleteFile(item: MediaAsset) {
    if (!window.confirm(`确认删除文件「${item.original_name}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/files/${item.id}`, { method: "DELETE" });
      await load(page);
      setNotice("文件已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function batchDelete() {
    if (!selected.length) return;
    if (!window.confirm(`确认删除选中的 ${selected.length} 个文件吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest("/admin/files/batch-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      await load(page);
      setNotice("已批量删除选中文件。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量删除失败");
    }
  }

  function toggleSelected(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Files / List</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">文件列表</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={search} className="motion-surface mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <AdminField label="文件名">
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入文件名 / object key" className={inputClass} />
        </AdminField>
        <AdminField label="文件类型">
          <select value={fileType} onChange={(event) => setFileType(event.target.value)} className={inputClass}>
            <option value="">全部</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG/JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </AdminField>
        <AdminField label="存储器">
          <select value={storageType} onChange={(event) => setStorageType(event.target.value)} className={inputClass}>
            <option value="">全部</option>
            <option value="r2">R2服务器</option>
            <option value="local">本地磁盘</option>
          </select>
        </AdminField>
        <Button type="submit">
          <Search className="h-4 w-4" aria-hidden="true" />
          查询
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setKeyword(""); setFileType(""); setStorageType(""); void load(1, ""); }}>
          重置
        </Button>
      </form>

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" variant="danger" disabled={!selected.length} onClick={() => void batchDelete()}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            批量删除
          </Button>
          <span className="text-sm font-bold text-ink/50 dark:text-slate-500">共 {total} 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1100px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={Boolean(items.length) && selected.length === items.length}
                    onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])}
                    aria-label="选择全部文件"
                  />
                </th>
                <th className="p-3">文件内容</th>
                <th className="p-3">文件名</th>
                <th className="p-3">文件类型</th>
                <th className="p-3">文件大小</th>
                <th className="p-3">URL</th>
                <th className="p-3">文件地址</th>
                <th className="p-3">存储器</th>
                <th className="p-3">上传时间</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelected(item.id)} aria-label={`选择 ${item.original_name}`} />
                  </td>
                  <td className="p-3">
                    <img src={getAssetUrl(item.url)} alt={item.original_name} className="h-12 w-16 rounded-md object-cover ring-1 ring-ink/10 dark:ring-white/10" />
                  </td>
                  <td className="max-w-[170px] truncate p-3 font-black text-ink dark:text-slate-100">{item.original_name}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{item.mime_type.split("/").pop()}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatBytes(item.size)}</td>
                  <td className="max-w-[180px] truncate p-3 text-ink/65 dark:text-slate-400">{item.url}</td>
                  <td className="max-w-[220px] truncate p-3 text-ink/65 dark:text-slate-400">{item.object_key}</td>
                  <td className="p-3">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-600 dark:bg-sky-400/10 dark:text-sky-200">
                      {item.storage_type === "r2" ? "R2服务器" : item.storage_type}
                    </span>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatDate(item.created_at)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setPreview(item)}>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        预览
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void copyUrl(item.url)}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        复制
                      </Button>
                      <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => void deleteFile(item)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-sm font-bold text-ink/45 dark:text-slate-500">暂无文件资源</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-4 py-3 text-sm font-bold text-ink/55 dark:border-white/10 dark:text-slate-400">
          <span>已选择 {selected.length} 个</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" disabled={page <= 1} onClick={() => void load(page - 1)}>
              上一页
            </Button>
            <span>{page} / {pages}</span>
            <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" disabled={page >= pages} onClick={() => void load(page + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </section>

      <AdminModal open={Boolean(preview)} title={preview?.original_name ?? "文件详情"} size="lg" onClose={() => setPreview(null)}>
        {preview ? (
          <div className="grid gap-4">
            <img src={getAssetUrl(preview.url)} alt={preview.original_name} className="mx-auto max-h-[50vh] rounded-md object-contain" />
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {[
                ["文件名", preview.original_name],
                ["文件类型", preview.mime_type],
                ["文件大小", formatBytes(preview.size)],
                ["存储器", preview.storage_type === "r2" ? "R2服务器" : preview.storage_type],
                ["Object Key", preview.object_key],
                ["上传时间", formatDate(preview.created_at)],
                ["URL", preview.url],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 rounded-md bg-paper p-3 dark:bg-slate-950 md:last:col-span-2">
                  <p className="text-xs font-black text-ink/45 dark:text-slate-500">{label}</p>
                  <p className="break-all font-bold text-ink/75 dark:text-slate-300">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>关闭</Button>
              <Button type="button" onClick={() => void copyUrl(preview.url)}>复制 URL</Button>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </>
  );
}
