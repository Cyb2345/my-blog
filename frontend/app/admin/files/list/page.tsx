"use client";

import {
  Archive,
  Copy,
  Eye,
  FileQuestion,
  FileText,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminSearchForm } from "@/components/admin/AdminSearchForm";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import {
  type TableSettings,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { readAdminPageCache, writeAdminPageCache } from "@/lib/adminPageCache";
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

const emptyFilters: Filters = {
  keyword: "",
  fileType: "",
  storageType: "",
  startTime: "",
  endTime: "",
};
const emptyPage: Paginated<MediaAsset> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 1,
};
const pageSizeOptions = [10, 20, 50];
const fileListPageCacheKey = "admin-page-cache:files-list";
const fileListColumnOptions = [
  { key: "preview", label: "文件预览" },
  { key: "name", label: "文件名", locked: true },
  { key: "type", label: "文件类型" },
  { key: "size", label: "文件大小" },
  { key: "storage", label: "存储器" },
  { key: "createdAt", label: "上传时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: fileListColumnOptions.map((column) => column.key),
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(item: MediaAsset) {
  return item.mime_type.startsWith("image/");
}

function FilePreview({
  item,
  large = false,
}: {
  item: MediaAsset;
  large?: boolean;
}) {
  const boxClass = large ? "max-h-[58vh] max-w-full" : "h-12 w-16";
  if (isImage(item)) {
    return (
      <img
        src={getAssetUrl(item.url)}
        alt={item.original_name}
        className={cn(
          boxClass,
          "rounded-md object-contain ring-1 ring-[var(--color-border)]",
        )}
      />
    );
  }
  const Icon =
    item.mime_type.includes("pdf") || item.mime_type.includes("document")
      ? FileText
      : item.mime_type.includes("zip") || item.mime_type.includes("compressed")
        ? Archive
        : FileQuestion;
  return (
    <span
      className={cn(
        "grid place-items-center rounded-md bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]",
        boxClass,
      )}
    >
      <Icon className={large ? "h-16 w-16" : "h-6 w-6"} aria-hidden="true" />
    </span>
  );
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

export default function AdminFileListPage() {
  const [data, setData] = useState<Paginated<MediaAsset>>(
    () =>
      readAdminPageCache<Paginated<MediaAsset>>(fileListPageCacheKey) ??
      emptyPage,
  );
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useTableSettings(
    "admin-table-settings:files-list",
    defaultSettings,
    fileListColumnOptions,
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (applied.keyword.trim()) query.set("keyword", applied.keyword.trim());
      if (applied.fileType) query.set("file_type", applied.fileType);
      if (applied.storageType) query.set("storage_type", applied.storageType);
      if (applied.startTime) query.set("start_time", applied.startTime);
      if (applied.endTime) query.set("end_time", applied.endTime);
      const result = await adminRequest<Paginated<MediaAsset>>(
        `/admin/files?${query.toString()}`,
      );
      setData(result);
      writeAdminPageCache(fileListPageCacheKey, result);
      if (result.page !== page) setPage(result.page);
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
    const nextPage =
      data.items.length <= deleteState.ids.length && data.page > 1
        ? data.page - 1
        : data.page;
    setDeleting(true);
    setDeleteError("");
    try {
      if (deleteState.ids.length === 1) {
        await adminRequest(`/admin/files/${deleteState.ids[0]}`, {
          method: "DELETE",
        });
      } else {
        await adminRequest("/admin/files/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids: deleteState.ids }),
        });
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

  function toggleSelected(item: MediaAsset, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  }

  function toggleCurrentPage(checked: boolean) {
    setSelected(
      checked ? new Set(data.items.map((item) => item.id)) : new Set(),
    );
  }

  function goToPage(value: number) {
    setPage(Math.min(Math.max(value, 1), Math.max(data.pages, 1)));
  }

  const columns = useMemo<Array<AdminDataTableColumn<MediaAsset>>>(
    () => [
      {
        key: "preview",
        title: "文件预览",
        width: 100,
        align: "center",
        hidden: !settings.visibleColumns.includes("preview"),
        render: (item) => (
          <button
            type="button"
            onClick={() => setPreview(item)}
            className="mx-auto block"
            title={item.url}
          >
            <FilePreview item={item} />
          </button>
        ),
      },
      {
        key: "name",
        title: "文件名",
        minWidth: 240,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("name"),
        render: (item) => (
          <span className="font-black text-[var(--color-text)]">
            {item.original_name}
          </span>
        ),
      },
      {
        key: "type",
        title: "文件类型",
        width: 120,
        hidden: !settings.visibleColumns.includes("type"),
        render: (item) => item.mime_type.split("/").pop()?.toUpperCase(),
      },
      {
        key: "size",
        title: "文件大小",
        width: 120,
        hidden: !settings.visibleColumns.includes("size"),
        render: (item) => formatBytes(item.size),
      },
      {
        key: "storage",
        title: "存储器",
        width: 180,
        hidden: !settings.visibleColumns.includes("storage"),
        render: (item) => (
          <StatusTag
            status={item.storage_type}
            label={
              item.storage_name ||
              (item.storage_type === "local"
                ? "本地磁盘"
                : item.storage_type.toUpperCase())
            }
          />
        ),
      },
      {
        key: "createdAt",
        title: "上传时间",
        width: 180,
        hidden: !settings.visibleColumns.includes("createdAt"),
        render: (item) => (
          <span className="text-[var(--color-text-muted)]">
            {formatDate(item.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: 160,
        align: "center",
        hidden: !settings.visibleColumns.includes("actions"),
        render: (item) => (
          <RowActions
            actions={[
              {
                key: "preview",
                label: "预览",
                icon: <Eye className={rowActionIconClass} aria-hidden="true" />,
                variant: "neutral",
                onClick: () => setPreview(item),
              },
              {
                key: "copy",
                label: "复制 URL",
                icon: (
                  <Copy className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "edit",
                onClick: () => void copyUrl(item.url),
              },
              {
                key: "delete",
                label: "删除",
                icon: (
                  <Trash2 className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "delete",
                onClick: () =>
                  setDeleteState({ ids: [item.id], name: item.original_name }),
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
      title="文件列表"
      description="管理上传资源、复制访问地址和删除无效文件。"
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminSearchForm
        onSubmit={query}
        onReset={reset}
        loading={loading}
        contentClassName="sm:grid-cols-2 xl:grid-cols-4"
      >
        <Input
          label="文件名"
          value={filters.keyword}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              keyword: event.target.value,
            }))
          }
          placeholder="请输入文件名"
        />
        <Select
          label="文件类型"
          value={filters.fileType}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              fileType: event.target.value,
            }))
          }
          options={[
            { label: "全部", value: "" },
            { label: "图片", value: "image" },
            { label: "PDF", value: "pdf" },
            { label: "文档", value: "document" },
            { label: "压缩包", value: "zip" },
          ]}
        />
        <Select
          label="存储器"
          value={filters.storageType}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              storageType: event.target.value,
            }))
          }
          options={[
            { label: "全部", value: "" },
            { label: "本地磁盘", value: "local" },
            { label: "Cloudflare R2", value: "r2" },
            { label: "S3 Compatible", value: "s3" },
          ]}
        />
        <AdminField label="开始时间">
          <DateTimePicker
            value={filters.startTime}
            onChange={(value) =>
              setFilters((current) => ({ ...current, startTime: value }))
            }
          />
        </AdminField>
        <AdminField label="结束时间">
          <DateTimePicker
            value={filters.endTime}
            onChange={(value) =>
              setFilters((current) => ({ ...current, endTime: value }))
            }
          />
        </AdminField>
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={data.items}
        rowKey="id"
        settings={settings}
        loading={loading}
        emptyText="暂无文件资源"
        minWidth={980}
        selectedRowKeys={selected}
        allSelected={
          data.items.length > 0 &&
          data.items.every((item) => selected.has(item.id))
        }
        onSelectRow={toggleSelected}
        onSelectAll={toggleCurrentPage}
        getCheckboxLabel={(item) => `选择 ${item.original_name}`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="danger"
              disabled={!selected.size}
              onClick={() => setDeleteState({ ids: Array.from(selected) })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              批量删除
            </Button>
            <AdminTableToolbar
              settings={settings}
              onSettingsChange={setSettings}
              columns={fileListColumnOptions}
              onRefresh={() => void load()}
              refreshing={loading}
              enableRefresh
              enableDensity
              enableColumns
              enableStyle
            />
          </div>
        }
        pagination={
          <Pagination
            page={data.page || page}
            totalPages={data.pages}
            total={data.total}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
            onPageChange={goToPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        }
      />

      <AdminModal
        open={Boolean(preview)}
        title={preview?.original_name ?? "文件预览"}
        size="lg"
        onClose={() => setPreview(null)}
      >
        {preview ? (
          <div className="grid gap-5">
            <div className="grid min-h-56 place-items-center rounded-lg bg-[var(--color-bg-muted)] p-4">
              {preview.mime_type.includes("pdf") ? (
                <iframe
                  src={getAssetUrl(preview.url)}
                  title={preview.original_name}
                  className="h-[55vh] w-full rounded-md bg-background"
                />
              ) : (
                <FilePreview item={preview} large />
              )}
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {[
                ["文件名", preview.original_name],
                ["文件类型", preview.mime_type],
                ["文件大小", formatBytes(preview.size)],
                ["存储器", preview.storage_name || preview.storage_type],
                ["Object Key", preview.object_key],
                ["上传时间", formatDate(preview.created_at)],
                ["URL", preview.url],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 rounded-md bg-[var(--color-bg-muted)] p-3 md:last:col-span-2"
                >
                  <p className="text-xs font-black text-[var(--color-text-subtle)]">
                    {label}
                  </p>
                  <p className="break-all font-bold text-[var(--color-text-muted)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreview(null)}
              >
                关闭
              </Button>
              <Button type="button" onClick={() => void copyUrl(preview.url)}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                复制 URL
              </Button>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteState)}
        description={
          deleteState?.name
            ? `确定删除文件「${deleteState.name}」吗？`
            : `确定删除选中的 ${deleteState?.ids.length ?? 0} 个文件吗？`
        }
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteState(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPage>
  );
}
