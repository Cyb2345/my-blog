"use client";

import { Edit, EyeOff, Plus, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { FormEvent, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DataTableToolbar,
  type TableSettings,
  tableDensityCellClass,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { PostModalEditor } from "@/components/admin/PostModalEditor";
import { PostCategorySelect, PostTagMultiSelect } from "@/components/admin/PostSelectControls";
import { TableSkeletonRows } from "@/components/admin/TableSkeletonRows";
import { Button } from "@/components/ui/Button";
import { readAdminPageCache, writeAdminPageCache } from "@/lib/adminPageCache";
import { adminRequest } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { Category, Paginated, Post, Tag } from "@/types/blog";

type PostQuery = {
  title: string;
  category_id: string;
  tag_ids: number[];
};

type ColumnKey = "cover" | "title" | "author" | "category" | "tags" | "viewCount" | "createdAt" | "actions";
type VisibleColumns = Record<ColumnKey, boolean>;
type ColumnWidths = Record<ColumnKey, number>;
type ColumnConfig = {
  key: ColumnKey;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  locked?: boolean;
  align?: "left" | "center";
};
type ModalState =
  | { mode: "create"; post?: null }
  | { mode: "edit"; post: Post }
  | null;
type DeleteState = { ids: number[]; title?: string } | null;

const emptyPage: Paginated<Post> = { items: [], total: 0, page: 1, page_size: 10, pages: 0 };
const emptyQuery: PostQuery = { title: "", category_id: "", tag_ids: [] };
const pageSizeOptions = [10, 20, 50];
const columns: ColumnConfig[] = [
  { key: "cover", label: "封面", defaultWidth: 150, minWidth: 140, maxWidth: 180, align: "center" },
  { key: "title", label: "标题", defaultWidth: 320, minWidth: 220, maxWidth: 520, locked: true },
  { key: "author", label: "作者", defaultWidth: 120, minWidth: 100, maxWidth: 200 },
  { key: "category", label: "分类", defaultWidth: 140, minWidth: 120, maxWidth: 240 },
  { key: "tags", label: "标签", defaultWidth: 220, minWidth: 160, maxWidth: 360 },
  { key: "viewCount", label: "阅读量", defaultWidth: 110, minWidth: 100, maxWidth: 160 },
  { key: "createdAt", label: "创建时间", defaultWidth: 190, minWidth: 160, maxWidth: 260 },
  { key: "actions", label: "操作", defaultWidth: 150, minWidth: 132, maxWidth: 180, locked: true, align: "center" },
];
const defaultColumnWidths = Object.fromEntries(columns.map((column) => [column.key, column.defaultWidth])) as ColumnWidths;
const postTableSettingsKey = "admin-table-settings:content-posts";
const postColumnWidthStorageKey = "admin-table-column-widths:content-posts";
const postsPageCacheKey = "admin-page-cache:content-posts";
const tableColumnOptions = columns.map(({ key, label, locked }) => ({ key, label, locked }));
const defaultPostTableSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default",
  visibleColumns: columns.map((column) => column.key),
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(/\//g, "-");
}

function getPageNumbers(current: number, total: number) {
  if (total <= 0) return [];
  const count = Math.min(total, 7);
  let start = Math.max(1, current - Math.floor(count / 2));
  const end = Math.min(total, start + count - 1);
  start = Math.max(1, end - count + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function readJsonPreference<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeColumnWidths(value: Partial<Record<ColumnKey, number>>): ColumnWidths {
  return columns.reduce<ColumnWidths>((result, column) => {
    const width = Number(value[column.key]);
    const minWidth = column.minWidth ?? 88;
    const maxWidth = column.maxWidth ?? 560;
    result[column.key] = Number.isFinite(width) ? Math.min(Math.max(width, minWidth), maxWidth) : column.defaultWidth;
    return result;
  }, { ...defaultColumnWidths });
}

function CoverThumb({ src, title }: { src?: string | null; title: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <div className="mx-auto grid h-[70px] w-[120px] place-items-center overflow-hidden rounded-lg bg-paper text-xs font-bold text-ink/40 ring-1 ring-ink/10 dark:bg-slate-950 dark:text-slate-500 dark:ring-white/10">
      {showImage ? (
        <img
          src={getAssetUrl(src)}
          alt={`${title} 封面`}
          className="block h-[70px] w-[120px] object-cover"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{src ? "加载失败" : "暂无封面"}</span>
      )}
    </div>
  );
}

export default function AdminPostsPage() {
  const [page, setPage] = useState<Paginated<Post>>(() => readAdminPageCache<Paginated<Post>>(postsPageCacheKey) ?? emptyPage);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<PostQuery>(emptyQuery);
  const [activeQuery, setActiveQuery] = useState<PostQuery>(emptyQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [tableSettings, setTableSettings] = useTableSettings(postTableSettingsKey, defaultPostTableSettings, tableColumnOptions);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(defaultColumnWidths);
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [columnWidthsReady, setColumnWidthsReady] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const resizeRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(pageNumber),
      page_size: String(pageSize),
    });
    if (activeQuery.title.trim()) params.set("title", activeQuery.title.trim());
    if (activeQuery.category_id) params.set("category_id", activeQuery.category_id);
    if (activeQuery.tag_ids.length) params.set("tag_ids", activeQuery.tag_ids.join(","));

    try {
      const data = await adminRequest<Paginated<Post>>(`/admin/posts?${params.toString()}`);
      setPage(data);
      writeAdminPageCache(postsPageCacheKey, data);
      setJumpPage(String(data.page || 1));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "文章列表加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeQuery, pageNumber, pageSize]);

  useEffect(() => {
    Promise.all([adminRequest<Category[]>("/admin/categories"), adminRequest<Tag[]>("/admin/tags")])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setTags(tagData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allCurrentPageSelected = page.items.length > 0 && page.items.every((post) => selectedIds.has(post.id));
  const pageNumbers = useMemo(() => getPageNumbers(page.page, page.pages), [page.page, page.pages]);
  const visibleColumns = useMemo(
    () =>
      columns.reduce<VisibleColumns>((result, column) => {
        result[column.key] = tableSettings.visibleColumns.includes(column.key);
        return result;
      }, {} as VisibleColumns),
    [tableSettings.visibleColumns],
  );
  const visibleColumnCount = columns.filter((column) => visibleColumns[column.key]).length;
  const tableCellPadding = tableDensityCellClass[tableSettings.density];
  const tableWidth = 56 + columns.reduce((total, column) => total + (visibleColumns[column.key] ? columnWidths[column.key] : 0), 0);

  useEffect(() => {
    setColumnWidths(normalizeColumnWidths(readJsonPreference(postColumnWidthStorageKey, defaultColumnWidths)));
    setColumnWidthsReady(true);
  }, []);

  useEffect(() => {
    if (!columnWidthsReady) return;
    window.localStorage.setItem(postColumnWidthStorageKey, JSON.stringify(columnWidths));
  }, [columnWidths, columnWidthsReady]);

  useEffect(() => {
    if (!resizingColumn) return;

    function handleMouseMove(event: MouseEvent) {
      const current = resizeRef.current;
      if (!current) return;
      const column = columns.find((item) => item.key === current.key);
      const minWidth = column?.minWidth ?? 88;
      const maxWidth = column?.maxWidth ?? 560;
      const nextWidth = Math.min(Math.max(current.startWidth + event.clientX - current.startX, minWidth), maxWidth);
      setColumnWidths((value) => ({ ...value, [current.key]: nextWidth }));
    }

    function handleMouseUp() {
      resizeRef.current = null;
      setResizingColumn(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingColumn]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setActiveQuery({ ...filters });
    setPageNumber(1);
  }

  function resetSearch() {
    setFilters(emptyQuery);
    setActiveQuery(emptyQuery);
    setPageNumber(1);
    setNotice("");
  }

  function startColumnResize(event: ReactMouseEvent<HTMLSpanElement>, key: ColumnKey) {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };
    setResizingColumn(key);
  }

  function toggleSelect(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectCurrentPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allCurrentPageSelected) {
        page.items.forEach((post) => next.delete(post.id));
      } else {
        page.items.forEach((post) => next.add(post.id));
      }
      return next;
    });
  }

  async function refreshAfterMutation(message: string, removedIds: number[] = []) {
    setNotice(message);
    const currentPageWillBeEmpty = page.items.length > 0 && page.items.every((post) => removedIds.includes(post.id));
    if (removedIds.length && currentPageWillBeEmpty && pageNumber > 1) {
      setPageNumber((value) => Math.max(1, value - 1));
      return;
    }
    await load();
  }

  function openDeletePosts(ids: number[], title?: string) {
    if (!ids.length) return;
    setDeleteState({ ids, title });
    setDeleteError("");
    setError("");
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteState(null);
    setDeleteError("");
  }

  async function confirmDeletePosts() {
    if (!deleteState) return;
    const ids = deleteState.ids;
    setDeleting(true);
    setDeleteError("");
    setError("");
    setNotice("");
    try {
      await Promise.all(ids.map((id) => adminRequest(`/admin/posts/${id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      setDeleteState(null);
      await refreshAfterMutation(ids.length === 1 ? "文章已删除，列表已刷新。" : "选中文章已删除，列表已刷新。", ids);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function deleteDescription() {
    if (!deleteState) return "确定删除该文章吗？";
    if (deleteState.ids.length === 1) {
      return deleteState.title ? `确定删除文章「${deleteState.title}」吗？` : "确定删除该文章吗？";
    }
    return `确定删除选中的 ${deleteState.ids.length} 篇文章吗？`;
  }

  async function togglePublish(post: Post) {
    setError("");
    setNotice("");
    const published = post.status === "published";
    try {
      await adminRequest(`/admin/posts/${post.id}/${published ? "unpublish" : "publish"}`, { method: "POST" });
      await refreshAfterMutation(published ? "文章已下架，列表已刷新。" : "文章已上架，列表已刷新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleSaved(message: string) {
    const shouldBackToFirstPage = modal?.mode === "create" && pageNumber !== 1;
    setModal(null);
    setNotice(message);
    if (shouldBackToFirstPage) {
      setPageNumber(1);
    } else {
      await load();
    }
  }

  function goToPage(nextPage: number) {
    if (!Number.isFinite(nextPage)) return;
    setPageNumber(Math.min(Math.max(nextPage, 1), Math.max(page.pages, 1)));
  }

  function handleJump() {
    goToPage(Number(jumpPage));
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={handleSearch} className="motion-surface mb-4 grid gap-3 rounded-lg border border-ink/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            文章标题
            <input
              value={filters.title}
              onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value }))}
              placeholder="请输入文章标题"
              className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none ring-ocean/20 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20"
            />
          </label>
          <div className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            <span>文章分类</span>
            <PostCategorySelect
              value={filters.category_id}
              onChange={(value) => setFilters((current) => ({ ...current, category_id: value }))}
              categories={categories}
            />
          </div>
          <div className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            <span>文章标签</span>
            <PostTagMultiSelect
              value={filters.tag_ids}
              onChange={(value) => setFilters((current) => ({ ...current, tag_ids: value }))}
              tags={tags}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="min-w-20">
              <Search className="h-4 w-4" aria-hidden="true" />
              查询
            </Button>
            <Button type="button" variant="ghost" onClick={resetSearch} className="min-w-20">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重置
            </Button>
          </div>
        </div>
      </form>

      <div className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal({ mode: "create" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              新增
            </Button>
            <Button type="button" variant="danger" disabled={!selectedIds.size} onClick={() => openDeletePosts(Array.from(selectedIds))}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              批量删除
            </Button>
          </div>
          <DataTableToolbar
            settings={tableSettings}
            onSettingsChange={setTableSettings}
            columns={tableColumnOptions}
            onRefresh={() => void load()}
            refreshing={loading}
            enableRefresh
            enableDensity
            enableColumns
            enableStyle
          />
        </div>

        <div className="overflow-x-auto">
          <table
            className={cn(
              "admin-table table-fixed border-collapse text-sm",
              tableSettings.bordered &&
                "[&_td]:border-r [&_td]:border-ink/10 [&_th]:border-r [&_th]:border-ink/10 dark:[&_td]:border-white/10 dark:[&_th]:border-white/10",
            )}
            style={{ width: tableWidth }}
          >
            <colgroup>
              <col style={{ width: 56 }} />
              {columns.map((column) => (visibleColumns[column.key] ? <col key={column.key} style={{ width: columnWidths[column.key] }} /> : null))}
            </colgroup>
            <thead
              className={cn(
                "text-left text-ink/60 dark:text-slate-400",
                tableSettings.headerBackground && "bg-paper dark:bg-slate-950/80",
              )}
            >
              <tr>
                <th className={cn("w-14 text-center", tableCellPadding)}>
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleSelectCurrentPage} aria-label="选择当前页文章" />
                </th>
                {columns.map((column) =>
                  visibleColumns[column.key] ? (
                    <th key={column.key} className={cn("relative select-none", tableCellPadding, column.align === "center" && "text-center")}>
                      <span className="block truncate pr-3">{column.label}</span>
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`调整${column.label}列宽`}
                        title="拖拽调整列宽"
                        onMouseDown={(event) => startColumnResize(event, column.key)}
                        className={cn(
                          "absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none transition-colors duration-150 hover:bg-ocean/25 dark:hover:bg-sky-300/25",
                          resizingColumn === column.key && "bg-ocean/40 dark:bg-sky-300/40",
                        )}
                      />
                    </th>
                  ) : null,
                )}
              </tr>
            </thead>
            <tbody>
              {loading && !page.items.length ? (
                <TableSkeletonRows columns={visibleColumnCount + 1} rows={6} cellClassName={tableCellPadding} />
              ) : null}
              {page.items.map((post, rowIndex) => {
                const visibleTags = post.tags?.slice(0, 3) ?? [];
                const extraTags = Math.max((post.tags?.length ?? 0) - visibleTags.length, 0);
                return (
                  <tr
                    key={post.id}
                    className={cn(
                      "transition-colors hover:bg-paper/60 dark:hover:bg-white/5",
                      tableSettings.bordered && "border-t border-ink/10 dark:border-white/10",
                      tableSettings.striped && rowIndex % 2 === 1 && "bg-paper/40 dark:bg-white/[0.03]",
                    )}
                  >
                    <td className={cn("text-center", tableCellPadding)}>
                      <input type="checkbox" checked={selectedIds.has(post.id)} onChange={() => toggleSelect(post.id)} aria-label={`选择 ${post.title}`} />
                    </td>
                    {visibleColumns.cover ? (
                      <td className={cn("text-center", tableCellPadding)}>
                        <CoverThumb src={post.cover_image} title={post.title} />
                      </td>
                    ) : null}
                    {visibleColumns.title ? (
                      <td className={tableCellPadding}>
                        <p className="truncate font-bold text-ocean dark:text-sky-300" title={post.title}>
                          {post.title}
                        </p>
                      </td>
                    ) : null}
                    {visibleColumns.author ? <td className={cn("text-ink/70 dark:text-slate-300", tableCellPadding)}>{post.author?.nickname || post.author?.username || "管理员"}</td> : null}
                    {visibleColumns.category ? <td className={cn("text-ink/70 dark:text-slate-300", tableCellPadding)}>{post.category?.name ?? "-"}</td> : null}
                    {visibleColumns.tags ? (
                      <td className={tableCellPadding}>
                        <div className="flex max-h-[3.5rem] max-w-full flex-wrap content-start gap-1 overflow-hidden">
                          {visibleTags.length ? (
                            <>
                              {visibleTags.map((tag) => (
                                <span key={tag.id} className="inline-flex max-w-[6.5rem] shrink-0 rounded-md bg-ocean/10 px-2 py-1 text-xs font-black text-ocean dark:bg-sky-400/15 dark:text-sky-200">
                                  <span className="truncate">{tag.name}</span>
                                </span>
                              ))}
                              {extraTags ? (
                                <span
                                  className="rounded-md bg-paper px-2 py-1 text-xs font-black text-ink/50 dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)]"
                                  title={post.tags.map((tag) => tag.name).join("、")}
                                >
                                  +{extraTags}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-ink/40 dark:text-slate-500">-</span>
                          )}
                        </div>
                      </td>
                    ) : null}
                    {visibleColumns.viewCount ? <td className={cn("font-bold text-ink/70 dark:text-slate-300", tableCellPadding)}>{post.view_count}</td> : null}
                    {visibleColumns.createdAt ? <td className={cn("text-ink/65 dark:text-slate-400", tableCellPadding)}>{formatDateTime(post.created_at)}</td> : null}
                    {visibleColumns.actions ? (
                      <td className={tableCellPadding}>
                        <AdminTableActions>
                          <AdminTableActionButton
                            variant="edit"
                            onClick={() => setModal({ mode: "edit", post })}
                            aria-label="编辑"
                            title="编辑"
                          >
                            <Edit className={adminTableActionIconClass} aria-hidden="true" />
                          </AdminTableActionButton>
                          <AdminTableActionButton
                            variant="delete"
                            onClick={() => openDeletePosts([post.id], post.title)}
                            aria-label="删除"
                            title="删除"
                          >
                            <Trash2 className={adminTableActionIconClass} aria-hidden="true" />
                          </AdminTableActionButton>
                          <AdminTableActionButton
                            variant="success"
                            onClick={() => void togglePublish(post)}
                            aria-label={post.status === "published" ? "下架" : "上架"}
                            title={post.status === "published" ? "下架" : "上架"}
                          >
                            {post.status === "published" ? <EyeOff className={adminTableActionIconClass} aria-hidden="true" /> : <Send className={adminTableActionIconClass} aria-hidden="true" />}
                          </AdminTableActionButton>
                        </AdminTableActions>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {!page.items.length && !loading ? (
                <tr>
                  <td colSpan={visibleColumnCount + 1} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-slate-500">
                    暂无文章数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 px-4 py-4 text-sm font-bold text-ink/65 dark:border-white/10 dark:text-slate-300">
          <span>共 {page.total} 条</span>
          <CustomSelect
            value={String(pageSize)}
            onChange={(value) => {
              setPageSize(Number(value));
              setPageNumber(1);
            }}
            options={pageSizeOptions.map((size) => ({ label: `${size}条/页`, value: String(size) }))}
            className="w-32"
          />
          <button
            type="button"
            disabled={page.page <= 1}
            onClick={() => goToPage(page.page - 1)}
            className="interactive min-h-10 rounded-md bg-paper px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10"
          >
            上一页
          </button>
          <div className="flex flex-wrap gap-1">
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => goToPage(number)}
                className={cn(
                  "interactive h-10 min-w-10 rounded-md px-3",
                  number === page.page
                    ? "bg-ocean text-white dark:bg-[var(--primary)] dark:text-white"
                    : "bg-paper text-ink/70 dark:bg-white/10 dark:text-slate-300",
                )}
              >
                {number}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={page.page >= page.pages || page.pages <= 0}
            onClick={() => goToPage(page.page + 1)}
            className="interactive min-h-10 rounded-md bg-paper px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10"
          >
            下一页
          </button>
          <span>前往</span>
          <input
            value={jumpPage}
            onChange={(event) => setJumpPage(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleJump();
            }}
            className="h-10 w-20 rounded-md border border-ink/10 bg-white px-3 text-center outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
            aria-label="跳转页码"
          />
          <span>页</span>
          <Button type="button" variant="ghost" onClick={handleJump} className="min-h-10 px-3">
            跳转
          </Button>
        </div>
      </div>

      <PostModalEditor
        open={Boolean(modal)}
        mode={modal?.mode ?? "create"}
        post={modal?.mode === "edit" ? modal.post : null}
        categories={categories}
        tags={tags}
        onClose={() => setModal(null)}
        onSaved={(message) => void handleSaved(message)}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteState)}
        description={deleteDescription()}
        error={deleteError}
        loading={deleting}
        onClose={closeDeleteDialog}
        onConfirm={() => void confirmDeletePosts()}
      />
    </>
  );
}
