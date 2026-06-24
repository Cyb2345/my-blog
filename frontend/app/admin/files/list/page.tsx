"use client";

import { Archive, ChevronLeft, ChevronRight, Copy, Eye, FileQuestion, FileText, Image as ImageIcon, RotateCcw, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal } from "@/components/admin/AdminModal";
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
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate, getAssetUrl } from "@/lib/utils";
import type { MediaAsset, Paginated } from "@/types/blog";

type Filters = {
  keyword: string;
  fileType: string;
  storageType: string;
  startTime: string;
  endTime: string;
};

type DeleteState = { ids: number[]; name?: string } | null;

const emptyFilters: Filters = { keyword: "", fileType: "", storageType: "", startTime: "", endTime: "" };
const emptyPage: Paginated<MediaAsset> = { items: [], total: 0, page: 1, page_size: 10, pages: 1 };
const defaultSettings: TableSettings = { bordered: true, striped: true, headerBackground: true, density: "default", visibleColumns: [] };

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function pageNumbers(current: number, total: number) {
  const count = Math.min(Math.max(total, 1), 7);
  let start = Math.max(1, current - Math.floor(count / 2));
  const end = Math.min(Math.max(total, 1), start + count - 1);
  start = Math.max(1, end - count + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isImage(item: MediaAsset) {
  return item.mime_type.startsWith("image/");
}

function FilePreview({ item, large = false }: { item: MediaAsset; large?: boolean }) {
  const boxClass = large ? "max-h-[58vh] max-w-full" : "h-12 w-16";
  if (isImage(item)) {
    return <img src={getAssetUrl(item.url)} alt={item.original_name} className={cn(boxClass, "rounded-md object-contain ring-1 ring-ink/10 dark:ring-[var(--border-soft)]")} />;
  }
  const Icon = item.mime_type.includes("pdf") || item.mime_type.includes("document")
    ? FileText
    : item.mime_type.includes("zip") || item.mime_type.includes("compressed")
      ? Archive
      : FileQuestion;
  return (
    <span className={cn("grid place-items-center rounded-md bg-paper text-ink/45 ring-1 ring-ink/10 dark:bg-[var(--surface-soft)] dark:text-[var(--text-muted)] dark:ring-[var(--border-soft)]", boxClass)}>
      <Icon className={large ? "h-16 w-16" : "h-6 w-6"} />
    </span>
  );
}

export default function AdminFileListPage() {
  const [data, setData] = useState(emptyPage);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useTableSettings("admin-table-settings:files-list", defaultSettings);
  const cellClass = tableDensityCellClass[settings.density];
  const numbers = useMemo(() => pageNumbers(data.page, data.pages), [data.page, data.pages]);
  const allSelected = data.items.length > 0 && data.items.every((item) => selected.has(item.id));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (applied.keyword.trim()) query.set("keyword", applied.keyword.trim());
      if (applied.fileType) query.set("file_type", applied.fileType);
      if (applied.storageType) query.set("storage_type", applied.storageType);
      if (applied.startTime) query.set("start_time", applied.startTime);
      if (applied.endTime) query.set("end_time", applied.endTime);
      const result = await adminRequest<Paginated<MediaAsset>>(`/admin/files?${query.toString()}`);
      setData(result);
      if (result.page !== page) setPage(result.page);
      setJumpPage(String(result.page));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, applied]);

  function query(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ ...filters });
    setPage(1);
  }

  function reset() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("文件 URL 已复制。");
    } catch {
      setError("复制失败，请在预览中手动复制。");
    }
  }

  async function confirmDelete() {
    if (!deleteState) return;
    const nextPage = data.items.length <= deleteState.ids.length && data.page > 1 ? data.page - 1 : data.page;
    setDeleting(true);
    setDeleteError("");
    try {
      if (deleteState.ids.length === 1) {
        await adminRequest(`/admin/files/${deleteState.ids[0]}`, { method: "DELETE" });
      } else {
        await adminRequest("/admin/files/batch-delete", { method: "POST", body: JSON.stringify({ ids: deleteState.ids }) });
      }
      setDeleteState(null);
      setNotice("文件已删除，列表已刷新。");
      if (nextPage !== page) setPage(nextPage);
      else await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(data.items.map((item) => item.id)));
  }

  function goToPage(value: number) {
    setPage(Math.min(Math.max(value, 1), Math.max(data.pages, 1)));
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={query} className="mb-4 grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)] sm:grid-cols-2 xl:grid-cols-4">
        <AdminField label="文件名"><input value={filters.keyword} onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))} placeholder="请输入文件名" className={inputClass} /></AdminField>
        <AdminField label="文件类型"><CustomSelect value={filters.fileType} onChange={(value) => setFilters((current) => ({ ...current, fileType: value }))} options={[{ label: "全部", value: "" }, { label: "图片", value: "image" }, { label: "PDF", value: "pdf" }, { label: "文档", value: "document" }, { label: "压缩包", value: "zip" }]} /></AdminField>
        <AdminField label="存储器"><CustomSelect value={filters.storageType} onChange={(value) => setFilters((current) => ({ ...current, storageType: value }))} options={[{ label: "全部", value: "" }, { label: "本地磁盘", value: "local" }, { label: "Cloudflare R2", value: "r2" }, { label: "S3 Compatible", value: "s3" }]} /></AdminField>
        <AdminField label="开始时间"><DateTimePicker value={filters.startTime} onChange={(value) => setFilters((current) => ({ ...current, startTime: value }))} /></AdminField>
        <AdminField label="结束时间"><DateTimePicker value={filters.endTime} onChange={(value) => setFilters((current) => ({ ...current, endTime: value }))} /></AdminField>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-3 xl:justify-end">
          <Button type="submit"><Search className="h-4 w-4" />查询</Button>
          <Button type="button" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" />重置</Button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-[var(--border-soft)]">
          <Button type="button" variant="danger" disabled={!selected.size} onClick={() => setDeleteState({ ids: Array.from(selected) })}><Trash2 className="h-4 w-4" />批量删除</Button>
          <DataTableToolbar settings={settings} onSettingsChange={setSettings} onRefresh={() => void load()} refreshing={loading} enableColumns={false} />
        </div>
        <div className="overflow-x-auto">
          <table className={cn("admin-table w-full min-w-[980px] table-fixed border-collapse", settings.bordered && "[&_td]:border-r [&_th]:border-r [&_td]:border-ink/10 [&_th]:border-ink/10 dark:[&_td]:border-[var(--border-soft)] dark:[&_th]:border-[var(--border-soft)]")}>
            <colgroup><col className="w-14" /><col className="w-[100px]" /><col /><col className="w-[120px]" /><col className="w-[120px]" /><col className="w-[180px]" /><col className="w-[180px]" /><col className="w-[160px]" /></colgroup>
            <thead className={cn(settings.headerBackground && "bg-paper dark:bg-[var(--bg-soft)]")}>
              <tr>
                <th className={cn("text-center", cellClass)}><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="选择当前页文件" /></th>
                {["文件预览", "文件名", "文件类型", "文件大小", "存储器", "上传时间", "操作"].map((label) => <th key={label} className={cn(cellClass, label === "操作" && "text-center")}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className={cn("border-t border-ink/10 dark:border-[var(--border-soft)]", settings.striped && index % 2 === 1 && "bg-paper/45 dark:bg-white/[0.03]")}>
                  <td className={cn("text-center", cellClass)}><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`选择 ${item.original_name}`} /></td>
                  <td className={cellClass}><button type="button" onClick={() => setPreview(item)} className="mx-auto block" title={item.url}><FilePreview item={item} /></button></td>
                  <td className={cn("font-black text-ink dark:text-[var(--text)]", cellClass)}><span className="block truncate" title={`${item.original_name}\n${item.url}`}>{item.original_name}</span></td>
                  <td className={cellClass}>{item.mime_type.split("/").pop()?.toUpperCase()}</td>
                  <td className={cellClass}>{formatBytes(item.size)}</td>
                  <td className={cellClass}><span className="inline-flex max-w-full truncate rounded-md bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-2 py-1 text-xs font-black text-blue-700 ring-1 ring-[color-mix(in_srgb,var(--primary)_28%,transparent)] dark:text-blue-100" title={item.storage_name || item.storage_type}>{item.storage_name || (item.storage_type === "local" ? "本地磁盘" : item.storage_type.toUpperCase())}</span></td>
                  <td className={cellClass}>{formatDate(item.created_at)}</td>
                  <td className={cellClass}>
                    <AdminTableActions>
                      <AdminTableActionButton variant="neutral" onClick={() => setPreview(item)} title="预览" aria-label="预览"><Eye className={adminTableActionIconClass} /></AdminTableActionButton>
                      <AdminTableActionButton variant="edit" onClick={() => void copyUrl(item.url)} title="复制 URL" aria-label="复制 URL"><Copy className={adminTableActionIconClass} /></AdminTableActionButton>
                      <AdminTableActionButton variant="delete" onClick={() => setDeleteState({ ids: [item.id], name: item.original_name })} title="删除" aria-label="删除"><Trash2 className={adminTableActionIconClass} /></AdminTableActionButton>
                    </AdminTableActions>
                  </td>
                </tr>
              ))}
              {!data.items.length && !loading ? <tr><td colSpan={8} className="p-10 text-center font-bold text-ink/45 dark:text-[var(--text-muted)]">暂无文件资源</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 p-4 text-sm font-bold dark:border-[var(--border-soft)]">
          <span>共 {data.total} 条</span>
          <CustomSelect value={String(pageSize)} onChange={(value) => { setPageSize(Number(value)); setPage(1); }} options={[10, 20, 50].map((value) => ({ label: `${value}条/页`, value: String(value) }))} className="w-32" />
          <button type="button" disabled={data.page <= 1} onClick={() => goToPage(data.page - 1)} className="interactive inline-flex h-10 items-center gap-1 rounded-md bg-paper px-3 disabled:opacity-50 dark:bg-[var(--surface-soft)]"><ChevronLeft className="h-4 w-4" />上一页</button>
          {numbers.map((number) => <button key={number} type="button" onClick={() => goToPage(number)} className={cn("h-10 min-w-10 rounded-md px-3", number === data.page ? "bg-[var(--primary)] text-white" : "bg-paper dark:bg-[var(--surface-soft)]")}>{number}</button>)}
          <button type="button" disabled={data.page >= data.pages} onClick={() => goToPage(data.page + 1)} className="interactive inline-flex h-10 items-center gap-1 rounded-md bg-paper px-3 disabled:opacity-50 dark:bg-[var(--surface-soft)]">下一页<ChevronRight className="h-4 w-4" /></button>
          <span>前往</span><input value={jumpPage} onChange={(event) => setJumpPage(event.target.value.replace(/\D/g, ""))} className={cn(inputClass, "w-20 text-center")} /><span>页</span>
          <Button type="button" variant="ghost" onClick={() => goToPage(Number(jumpPage))}>跳转</Button>
        </div>
      </section>

      <AdminModal open={Boolean(preview)} title={preview?.original_name ?? "文件预览"} size="lg" onClose={() => setPreview(null)}>
        {preview ? (
          <div className="grid gap-5">
            <div className="grid min-h-56 place-items-center rounded-lg bg-paper p-4 dark:bg-[var(--bg-soft)]">
              {preview.mime_type.includes("pdf") ? <iframe src={getAssetUrl(preview.url)} title={preview.original_name} className="h-[55vh] w-full rounded-md bg-white" /> : <FilePreview item={preview} large />}
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {[["文件名", preview.original_name], ["文件类型", preview.mime_type], ["文件大小", formatBytes(preview.size)], ["存储器", preview.storage_name || preview.storage_type], ["Object Key", preview.object_key], ["上传时间", formatDate(preview.created_at)], ["URL", preview.url]].map(([label, value]) => (
                <div key={label} className="grid gap-1 rounded-md bg-paper p-3 dark:bg-[var(--bg-soft)] md:last:col-span-2"><p className="text-xs font-black text-ink/45 dark:text-[var(--text-muted)]">{label}</p><p className="break-all font-bold text-ink/75 dark:text-[var(--text-secondary)]">{value}</p></div>
              ))}
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPreview(null)}>关闭</Button><Button type="button" onClick={() => void copyUrl(preview.url)}><Copy className="h-4 w-4" />复制 URL</Button></div>
          </div>
        ) : null}
      </AdminModal>

      <DeleteConfirmDialog open={Boolean(deleteState)} description={deleteState?.name ? `确定删除文件「${deleteState.name}」吗？` : `确定删除选中的 ${deleteState?.ids.length ?? 0} 个文件吗？`} error={deleteError} loading={deleting} onClose={() => !deleting && setDeleteState(null)} onConfirm={() => void confirmDelete()} />
    </>
  );
}
