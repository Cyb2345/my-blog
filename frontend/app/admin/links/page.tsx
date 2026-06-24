"use client";

import { ChevronLeft, ChevronRight, Edit, Plus, RotateCcw, Search, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
import { UploadProgress, type UploadProgressItem } from "@/components/admin/UploadProgress";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { cn, formatDate, getAssetUrl } from "@/lib/utils";
import type { FriendLink, MediaAsset, Paginated } from "@/types/blog";

type LinkModalState = { mode: "create" | "edit"; item?: FriendLink };
type DeleteState = { ids: number[]; name?: string } | null;

const emptyPage: Paginated<FriendLink> = { items: [], total: 0, page: 1, page_size: 10, pages: 1 };
const settingsKey = "admin-table-settings:site-links";
const defaultSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: [],
};

function pageNumbers(current: number, total: number) {
  const count = Math.min(Math.max(total, 1), 7);
  let start = Math.max(1, current - Math.floor(count / 2));
  const end = Math.min(Math.max(total, 1), start + count - 1);
  start = Math.max(1, end - count + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function AdminLinksPage() {
  const [data, setData] = useState(emptyPage);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [modal, setModal] = useState<LinkModalState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [modalStatus, setModalStatus] = useState("active");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem | null>(null);
  const [settings, setSettings] = useTableSettings(settingsKey, defaultSettings);
  const cellClass = tableDensityCellClass[settings.density];
  const numbers = useMemo(() => pageNumbers(data.page, data.pages), [data.page, data.pages]);
  const allSelected = data.items.length > 0 && data.items.every((item) => selected.has(item.id));

  async function load(nextPage = page, nextSize = pageSize, nextName = appliedName, nextStatus = appliedStatus) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(nextPage), page_size: String(nextSize) });
      if (nextName.trim()) query.set("name", nextName.trim());
      if (nextStatus) query.set("status", nextStatus);
      const result = await adminRequest<Paginated<FriendLink>>(`/admin/links?${query.toString()}`);
      setData(result);
      setPage(result.page);
      setJumpPage(String(result.page));
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "友链列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    adminRequest<MediaAsset[]>("/admin/media?usage_type=link_avatar")
      .then((items) => setMedia(items.filter((item) => item.is_active)))
      .catch(() => setMedia([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, appliedName, appliedStatus]);

  function query(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedName(name);
    setAppliedStatus(status);
    setPage(1);
  }

  function reset() {
    setName("");
    setStatus("");
    setAppliedName("");
    setAppliedStatus("");
    setPage(1);
  }

  function openModal(next: LinkModalState) {
    setAvatarUrl(next.item?.avatar ?? "");
    setModalStatus(next.item?.status ?? "active");
    setUploadProgress(null);
    setModalError("");
    setModal(next);
  }

  function closeModal() {
    if (saving || uploadingAvatar) return;
    setModal(null);
    setModalError("");
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    const form = new FormData();
    form.append("file", file);
    form.append("usage_type", "link_avatar");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", form, {
        onProgress: (progress) => setUploadProgress({ fileName: file.name, progress, status: "uploading" }),
      });
      setAvatarUrl(asset.url);
      setMedia((current) => [asset, ...current]);
      setUploadProgress({ fileName: file.name, progress: 100, status: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "头像上传失败";
      setModalError(message);
      setUploadProgress({ fileName: file.name, progress: 100, status: "error", error: message });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const linkName = String(form.get("name") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    if (!linkName || !/^https?:\/\//.test(url)) {
      setModalError("请填写友链名称和有效的 http / https 地址");
      return;
    }
    const payload = {
      name: linkName,
      url,
      avatar: avatarUrl || null,
      description: String(form.get("description") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      status: modalStatus,
    };
    setSaving(true);
    setModalError("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/links/${modal.item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("友链已保存。");
      } else {
        await adminRequest("/admin/links", { method: "POST", body: JSON.stringify(payload) });
        setNotice("友链已新增。");
      }
      setModal(null);
      await load(modal.item ? data.page : 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteState) return;
    const nextPage = data.items.length <= deleteState.ids.length && data.page > 1 ? data.page - 1 : data.page;
    setDeleting(true);
    setDeleteError("");
    try {
      if (deleteState.ids.length === 1) {
        await adminRequest(`/admin/links/${deleteState.ids[0]}`, { method: "DELETE" });
      } else {
        await adminRequest("/admin/links/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids: deleteState.ids }),
        });
      }
      setDeleteState(null);
      setNotice("友链已删除，列表已刷新。");
      await load(nextPage);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(data.items.map((item) => item.id)));
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToPage(value: number) {
    setPage(Math.min(Math.max(value, 1), Math.max(data.pages, 1)));
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={query} className="mb-4 grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)] xl:grid-cols-[1fr_1fr_auto]">
        <AdminField label="友链名称"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入友链名称" className={inputClass} /></AdminField>
        <AdminField label="状态">
          <CustomSelect value={status} onChange={setStatus} options={[{ label: "全部", value: "" }, { label: "上架", value: "active" }, { label: "下架", value: "inactive" }]} />
        </AdminField>
        <div className="flex items-end gap-2">
          <Button type="submit"><Search className="h-4 w-4" />查询</Button>
          <Button type="button" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" />重置</Button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-[var(--border-soft)]">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => openModal({ mode: "create" })}><Plus className="h-4 w-4" />新增</Button>
            <Button type="button" variant="danger" disabled={!selected.size} onClick={() => setDeleteState({ ids: Array.from(selected) })}><Trash2 className="h-4 w-4" />批量删除</Button>
          </div>
          <DataTableToolbar settings={settings} onSettingsChange={setSettings} onRefresh={() => void load()} refreshing={loading} enableColumns={false} />
        </div>
        <div className="overflow-x-auto">
          <table className={cn("admin-table w-full min-w-[1280px] table-fixed border-collapse", settings.bordered && "[&_td]:border-r [&_th]:border-r [&_td]:border-ink/10 [&_th]:border-ink/10 dark:[&_td]:border-[var(--border-soft)] dark:[&_th]:border-[var(--border-soft)]")}>
            <colgroup>
              <col className="w-14" /><col className="w-[96px]" /><col className="w-[160px]" /><col className="w-[220px]" /><col /><col className="w-[190px]" /><col className="w-[90px]" /><col className="w-[100px]" /><col className="w-[180px]" /><col className="w-[130px]" />
            </colgroup>
            <thead className={cn(settings.headerBackground && "bg-paper dark:bg-[var(--bg-soft)]")}>
              <tr>
                <th className={cn("text-center", cellClass)}><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="选择当前页友链" /></th>
                {["头像", "名称", "地址", "简介", "邮箱", "排序", "状态", "创建时间", "操作"].map((label) => <th key={label} className={cn(cellClass, label === "操作" && "text-center")}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className={cn("border-t border-ink/10 dark:border-[var(--border-soft)]", settings.striped && index % 2 === 1 && "bg-paper/45 dark:bg-white/[0.03]")}>
                  <td className={cn("text-center", cellClass)}><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`选择 ${item.name}`} /></td>
                  <td className={cellClass}><div className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-paper ring-1 ring-ink/10 dark:bg-[var(--surface-soft)] dark:ring-[var(--border-soft)]">{item.avatar ? <img src={getAssetUrl(item.avatar)} alt="" className="h-full w-full object-cover" /> : <span className="font-black">{item.name.slice(0, 1)}</span>}</div></td>
                  <td className={cn("font-black text-ink dark:text-[var(--text)]", cellClass)}><span className="block truncate" title={item.name}>{item.name}</span></td>
                  <td className={cellClass}><span className="block truncate" title={item.url}>{item.url}</span></td>
                  <td className={cellClass}><span className="block truncate" title={item.description ?? ""}>{item.description || "-"}</span></td>
                  <td className={cellClass}><span className="block truncate" title={item.email ?? ""}>{item.email || "-"}</span></td>
                  <td className={cellClass}>{item.sort_order}</td>
                  <td className={cellClass}><span className={cn("rounded-md px-2 py-1 text-xs font-black ring-1", item.status === "active" ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-200" : "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-200")}>{item.status === "active" ? "上架" : "下架"}</span></td>
                  <td className={cellClass}>{formatDate(item.created_at)}</td>
                  <td className={cellClass}>
                    <AdminTableActions>
                      <AdminTableActionButton variant="edit" onClick={() => openModal({ mode: "edit", item })} title="编辑" aria-label="编辑"><Edit className={adminTableActionIconClass} /></AdminTableActionButton>
                      <AdminTableActionButton variant="delete" onClick={() => setDeleteState({ ids: [item.id], name: item.name })} title="删除" aria-label="删除"><Trash2 className={adminTableActionIconClass} /></AdminTableActionButton>
                    </AdminTableActions>
                  </td>
                </tr>
              ))}
              {!data.items.length && !loading ? <tr><td colSpan={10} className="p-10 text-center font-bold text-ink/45 dark:text-[var(--text-muted)]">暂无友链数据</td></tr> : null}
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

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑友链" : "新增友链"} size="md" onClose={closeModal}>
        <form key={modal?.item?.id ?? "new"} onSubmit={save} className="grid gap-4">
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="友链名称 *"><input name="name" required defaultValue={modal?.item?.name ?? ""} placeholder="请输入友链名称" className={inputClass} /></AdminField>
            <AdminField label="友链地址 *"><input name="url" required type="url" defaultValue={modal?.item?.url ?? ""} placeholder="https://" className={inputClass} /></AdminField>
            <AdminField label="友链邮箱"><input name="email" type="email" defaultValue={modal?.item?.email ?? ""} placeholder="name@example.com" className={inputClass} /></AdminField>
            <AdminField label="排序"><input name="sort_order" type="number" defaultValue={modal?.item?.sort_order ?? 0} className={inputClass} /></AdminField>
            <AdminField label="状态"><CustomSelect name="status" value={modalStatus} onChange={setModalStatus} options={[{ label: "上架", value: "active" }, { label: "下架", value: "inactive" }]} /></AdminField>
            <AdminField label="从文件列表选择头像">
              <CustomSelect
                value={avatarUrl}
                onChange={setAvatarUrl}
                searchable
                options={[{ label: "未选择", value: "" }, ...media.map((asset) => ({ label: asset.original_name, value: asset.url, description: `ID ${asset.id}`, thumbnail: getAssetUrl(asset.url) }))]}
              />
            </AdminField>
          </div>
          <AdminField label="头像 URL">
            <div className="grid gap-3">
              <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="可输入 URL、上传或从文件列表选择" className={inputClass} />
              <label className="interactive inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold ring-1 ring-ink/10 dark:bg-[var(--surface-soft)] dark:ring-[var(--border-soft)]">
                <Upload className="h-4 w-4" />{uploadingAvatar ? "上传中..." : "上传头像"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingAvatar} onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)} />
              </label>
              <UploadProgress item={uploadProgress} />
              {avatarUrl ? <img src={getAssetUrl(avatarUrl)} alt="头像预览" className="h-16 w-16 rounded-full object-cover ring-1 ring-ink/10 dark:ring-[var(--border-soft)]" /> : null}
            </div>
          </AdminField>
          <AdminField label="友链简介"><textarea name="description" rows={3} defaultValue={modal?.item?.description ?? ""} className={inputClass} /></AdminField>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeModal}>取消</Button><Button type="submit" disabled={saving || uploadingAvatar}>{saving ? "提交中..." : "确定"}</Button></div>
        </form>
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteState)}
        description={deleteState?.name ? `确定删除友链「${deleteState.name}」吗？` : `确定删除选中的 ${deleteState?.ids.length ?? 0} 条友链吗？`}
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteState(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
