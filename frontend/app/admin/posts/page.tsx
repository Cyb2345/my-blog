"use client";

import {
  BookOpenCheck,
  Edit,
  EyeOff,
  FileText,
  Layers3,
  ListFilter,
  Plus,
  ScrollText,
  RotateCcw,
  Search,
  Send,
  Tags,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  FormEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminSearchForm } from "@/components/admin/AdminSearchForm";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import {
  type TableSettings,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { PostModalEditor } from "@/components/admin/PostModalEditor";
import {
  PostCategorySelect,
  PostTagMultiSelect,
} from "@/components/admin/PostSelectControls";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Tag as UiTag } from "@/components/ui/tag";
import { readAdminPageCache, writeAdminPageCache } from "@/lib/adminPageCache";
import { adminRequest } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { Category, Paginated, Post, Tag } from "@/types/blog";

type PostQuery = {
  title: string;
  category_id: string;
  tag_ids: number[];
};

type ColumnKey =
  | "cover"
  | "title"
  | "status"
  | "author"
  | "category"
  | "tags"
  | "viewCount"
  | "createdAt"
  | "actions";
type ColumnWidths = Record<ColumnKey, number>;
type ColumnConfig = {
  key: ColumnKey;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  locked?: boolean;
  align?: "left" | "center" | "right";
};
type ModalState =
  | { mode: "create"; post?: null }
  | { mode: "edit"; post: Post }
  | null;
type DeleteState = { ids: number[]; title?: string } | null;

const emptyPage: Paginated<Post> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};
const emptyQuery: PostQuery = { title: "", category_id: "", tag_ids: [] };
const pageSizeOptions = [10, 20, 50];
const postColumns: ColumnConfig[] = [
  {
    key: "cover",
    label: "封面",
    defaultWidth: 150,
    minWidth: 140,
    maxWidth: 180,
    align: "center",
  },
  {
    key: "title",
    label: "标题",
    defaultWidth: 320,
    minWidth: 220,
    maxWidth: 520,
    locked: true,
  },
  {
    key: "status",
    label: "状态",
    defaultWidth: 100,
    minWidth: 90,
    maxWidth: 140,
  },
  {
    key: "author",
    label: "作者",
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 200,
  },
  {
    key: "category",
    label: "分类",
    defaultWidth: 140,
    minWidth: 120,
    maxWidth: 240,
  },
  {
    key: "tags",
    label: "标签",
    defaultWidth: 220,
    minWidth: 160,
    maxWidth: 360,
  },
  {
    key: "viewCount",
    label: "阅读量",
    defaultWidth: 110,
    minWidth: 100,
    maxWidth: 160,
  },
  {
    key: "createdAt",
    label: "创建时间",
    defaultWidth: 190,
    minWidth: 160,
    maxWidth: 260,
  },
  {
    key: "actions",
    label: "操作",
    defaultWidth: 150,
    minWidth: 132,
    maxWidth: 180,
    locked: true,
    align: "center",
  },
];
const defaultColumnWidths = Object.fromEntries(
  postColumns.map((column) => [column.key, column.defaultWidth]),
) as ColumnWidths;
const postTableSettingsKey = "admin-table-settings:content-posts";
const postColumnWidthStorageKey = "admin-table-column-widths:content-posts";
const postsPageCacheKey = "admin-page-cache:content-posts";
const tableColumnOptions = postColumns.map(({ key, label, locked }) => ({
  key,
  label,
  locked,
}));
const defaultPostTableSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default",
  visibleColumns: postColumns.map((column) => column.key),
};
const statusMap = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "warning" as const },
  deleted: { label: "已删除", variant: "danger" as const },
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

function readJsonPreference<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeColumnWidths(
  value: Partial<Record<ColumnKey, number>>,
): ColumnWidths {
  return postColumns.reduce<ColumnWidths>(
    (result, column) => {
      const width = Number(value[column.key]);
      const minWidth = column.minWidth ?? 88;
      const maxWidth = column.maxWidth ?? 560;
      result[column.key] = Number.isFinite(width)
        ? Math.min(Math.max(width, minWidth), maxWidth)
        : column.defaultWidth;
      return result;
    },
    { ...defaultColumnWidths },
  );
}

function CoverThumb({ src, title }: { src?: string | null; title: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <div className="mx-auto grid h-[70px] w-[120px] place-items-center overflow-hidden rounded-lg bg-[var(--color-bg-muted)] text-xs font-bold text-[var(--color-text-subtle)] ring-1 ring-[var(--color-border)]">
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

type MetricTone = "primary" | "success" | "warning" | "neutral";

const metricToneClass: Record<MetricTone, string> = {
  primary: "bg-primary text-primary-foreground ring-primary",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_14%,var(--card))] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_28%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_18%,var(--card))] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_32%,transparent)]",
  neutral: "bg-muted text-muted-foreground ring-border",
};

function formatInteger(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function PostMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone?: MetricTone;
}) {
  return (
    <Card className="motion-card">
      <CardContent className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black leading-none text-foreground">
              {formatInteger(value)}
            </p>
          </div>
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-md ring-1",
              metricToneClass[tone],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </div>
        <p className="text-xs font-semibold leading-5 text-muted-foreground">
          {helper}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminPostsPage() {
  const [page, setPage] = useState<Paginated<Post>>(
    () => readAdminPageCache<Paginated<Post>>(postsPageCacheKey) ?? emptyPage,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<PostQuery>(emptyQuery);
  const [activeQuery, setActiveQuery] = useState<PostQuery>(emptyQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [tableSettings, setTableSettings] = useTableSettings(
    postTableSettingsKey,
    defaultPostTableSettings,
    tableColumnOptions,
  );
  const [columnWidths, setColumnWidths] =
    useState<ColumnWidths>(defaultColumnWidths);
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [columnWidthsReady, setColumnWidthsReady] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const resizeRef = useRef<{
    key: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(pageNumber),
      page_size: String(pageSize),
    });
    if (activeQuery.title.trim()) params.set("title", activeQuery.title.trim());
    if (activeQuery.category_id)
      params.set("category_id", activeQuery.category_id);
    if (activeQuery.tag_ids.length)
      params.set("tag_ids", activeQuery.tag_ids.join(","));

    try {
      const data = await adminRequest<Paginated<Post>>(
        `/admin/posts?${params.toString()}`,
      );
      setPage(data);
      writeAdminPageCache(postsPageCacheKey, data);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "文章列表加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeQuery, pageNumber, pageSize]);

  useEffect(() => {
    Promise.all([
      adminRequest<Category[]>("/admin/categories"),
      adminRequest<Tag[]>("/admin/tags"),
    ])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setTags(tagData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setColumnWidths(
      normalizeColumnWidths(
        readJsonPreference(postColumnWidthStorageKey, defaultColumnWidths),
      ),
    );
    setColumnWidthsReady(true);
  }, []);

  useEffect(() => {
    if (!columnWidthsReady) return;
    window.localStorage.setItem(
      postColumnWidthStorageKey,
      JSON.stringify(columnWidths),
    );
  }, [columnWidths, columnWidthsReady]);

  useEffect(() => {
    if (!resizingColumn) return;

    function handleMouseMove(event: MouseEvent) {
      const current = resizeRef.current;
      if (!current) return;
      const column = postColumns.find((item) => item.key === current.key);
      const minWidth = column?.minWidth ?? 88;
      const maxWidth = column?.maxWidth ?? 560;
      const nextWidth = Math.min(
        Math.max(current.startWidth + event.clientX - current.startX, minWidth),
        maxWidth,
      );
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

  function startColumnResize(
    event: ReactMouseEvent<HTMLSpanElement>,
    key: ColumnKey,
  ) {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };
    setResizingColumn(key);
  }

  function toggleSelected(post: Post, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(post.id);
      else next.delete(post.id);
      return next;
    });
  }

  function toggleSelectCurrentPage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      page.items.forEach((post) => {
        if (checked) next.add(post.id);
        else next.delete(post.id);
      });
      return next;
    });
  }

  async function refreshAfterMutation(
    message: string,
    removedIds: number[] = [],
  ) {
    setNotice(message);
    const currentPageWillBeEmpty =
      page.items.length > 0 &&
      page.items.every((post) => removedIds.includes(post.id));
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
      await Promise.all(
        ids.map((id) =>
          adminRequest(`/admin/posts/${id}`, { method: "DELETE" }),
        ),
      );
      setSelectedIds(new Set());
      setDeleteState(null);
      await refreshAfterMutation(
        ids.length === 1
          ? "文章已删除，列表已刷新。"
          : "选中文章已删除，列表已刷新。",
        ids,
      );
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function deleteDescription() {
    if (!deleteState) return "确定删除该文章吗？";
    if (deleteState.ids.length === 1) {
      return deleteState.title
        ? `确定删除文章「${deleteState.title}」吗？`
        : "确定删除该文章吗？";
    }
    return `确定删除选中的 ${deleteState.ids.length} 篇文章吗？`;
  }

  async function togglePublish(post: Post) {
    setError("");
    setNotice("");
    const published = post.status === "published";
    try {
      await adminRequest(
        `/admin/posts/${post.id}/${published ? "unpublish" : "publish"}`,
        { method: "POST" },
      );
      await refreshAfterMutation(
        published ? "文章已下架，列表已刷新。" : "文章已上架，列表已刷新。",
      );
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

  const visibleColumns = useMemo(
    () =>
      postColumns.reduce<Record<ColumnKey, boolean>>(
        (result, column) => {
          result[column.key] = tableSettings.visibleColumns.includes(
            column.key,
          );
          return result;
        },
        {} as Record<ColumnKey, boolean>,
      ),
    [tableSettings.visibleColumns],
  );
  const tableWidth =
    56 +
    postColumns.reduce(
      (total, column) =>
        total + (visibleColumns[column.key] ? columnWidths[column.key] : 0),
      0,
    );
  const pagePostStats = useMemo(() => {
    return page.items.reduce(
      (result, post) => {
        if (post.status === "published") result.published += 1;
        if (post.status === "draft") result.draft += 1;
        result.views += post.view_count;
        return result;
      },
      { published: 0, draft: 0, views: 0 },
    );
  }, [page.items]);
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const title = activeQuery.title.trim();
    const activeCategory = categories.find(
      (category) => String(category.id) === activeQuery.category_id,
    );
    const activeTagNames = activeQuery.tag_ids
      .map((id) => tags.find((tag) => tag.id === id)?.name)
      .filter(Boolean);

    if (title) labels.push(`标题：${title}`);
    if (activeCategory) labels.push(`分类：${activeCategory.name}`);
    if (activeQuery.tag_ids.length) {
      labels.push(
        `标签：${
          activeTagNames.length
            ? activeTagNames.join("、")
            : `${activeQuery.tag_ids.length} 个标签`
        }`,
      );
    }
    return labels;
  }, [activeQuery, categories, tags]);

  const dataColumns = useMemo<Array<AdminDataTableColumn<Post>>>(
    () =>
      postColumns.map((column) => {
        const header = (
          <>
            <span className="block truncate pr-3">{column.label}</span>
            <span
              role="separator"
              aria-orientation="vertical"
              aria-label={`调整${column.label}列宽`}
              title="拖拽调整列宽"
              onMouseDown={(event) => startColumnResize(event, column.key)}
              className={cn(
                "absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--admin-primary)_24%,transparent)]",
                resizingColumn === column.key &&
                  "bg-[color-mix(in_srgb,var(--admin-primary)_38%,transparent)]",
              )}
            />
          </>
        );
        return {
          key: column.key,
          title: header,
          width: columnWidths[column.key],
          align: column.align,
          headerClassName: "relative select-none",
          hidden: !visibleColumns[column.key],
          render: (post: Post) => {
            if (column.key === "cover")
              return <CoverThumb src={post.cover_image} title={post.title} />;
            if (column.key === "title")
              return (
                <span className="font-bold text-[var(--admin-primary)]">
                  {post.title}
                </span>
              );
            if (column.key === "status")
              return <StatusTag status={post.status} map={statusMap} />;
            if (column.key === "author")
              return post.author?.nickname || post.author?.username || "管理员";
            if (column.key === "category") return post.category?.name ?? "-";
            if (column.key === "tags") {
              const visibleTags = post.tags?.slice(0, 3) ?? [];
              const extraTags = Math.max(
                (post.tags?.length ?? 0) - visibleTags.length,
                0,
              );
              return (
                <div className="flex max-h-[3.5rem] max-w-full flex-wrap content-start gap-1 overflow-hidden">
                  {visibleTags.length ? (
                    <>
                      {visibleTags.map((tag) => (
                        <UiTag
                          key={tag.id}
                          variant="primary"
                          className="max-w-[6.5rem] shrink-0"
                        >
                          <span className="truncate">{tag.name}</span>
                        </UiTag>
                      ))}
                      {extraTags ? (
                        <UiTag
                          variant="neutral"
                          title={post.tags.map((tag) => tag.name).join("、")}
                        >
                          +{extraTags}
                        </UiTag>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[var(--color-text-subtle)]">-</span>
                  )}
                </div>
              );
            }
            if (column.key === "viewCount")
              return (
                <span className="font-bold text-[var(--color-text-muted)]">
                  {post.view_count}
                </span>
              );
            if (column.key === "createdAt")
              return (
                <span className="text-[var(--color-text-muted)]">
                  {formatDateTime(post.created_at)}
                </span>
              );
            return (
              <RowActions
                actions={[
                  {
                    key: "edit",
                    label: "编辑",
                    icon: (
                      <Edit className={rowActionIconClass} aria-hidden="true" />
                    ),
                    variant: "edit",
                    onClick: () => setModal({ mode: "edit", post }),
                  },
                  {
                    key: "delete",
                    label: "删除",
                    icon: (
                      <Trash2
                        className={rowActionIconClass}
                        aria-hidden="true"
                      />
                    ),
                    variant: "delete",
                    onClick: () => openDeletePosts([post.id], post.title),
                  },
                  {
                    key: "publish",
                    label: post.status === "published" ? "下架" : "上架",
                    icon:
                      post.status === "published" ? (
                        <EyeOff
                          className={rowActionIconClass}
                          aria-hidden="true"
                        />
                      ) : (
                        <Send
                          className={rowActionIconClass}
                          aria-hidden="true"
                        />
                      ),
                    variant:
                      post.status === "published" ? "warning" : "success",
                    onClick: () => void togglePublish(post),
                  },
                ]}
              />
            );
          },
        };
      }),
    [columnWidths, resizingColumn, visibleColumns],
  );

  return (
    <AdminPage
      title="文章管理"
      description="集中维护文章内容、分类标签、发布状态和批量操作。"
      actions={
        <Button type="button" onClick={() => setModal({ mode: "create" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增文章
        </Button>
      }
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <section className="motion-list grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PostMetricCard
          label="文章总量"
          value={page.total}
          helper="当前筛选条件下的全部文章"
          icon={FileText}
          tone="primary"
        />
        <PostMetricCard
          label="本页已发布"
          value={pagePostStats.published}
          helper={`本页共显示 ${page.items.length} 篇文章`}
          icon={BookOpenCheck}
          tone="success"
        />
        <PostMetricCard
          label="本页草稿"
          value={pagePostStats.draft}
          helper="需要继续编辑或准备发布"
          icon={ScrollText}
          tone="warning"
        />
        <PostMetricCard
          label="本页阅读量"
          value={pagePostStats.views}
          helper="当前页文章阅读量合计"
          icon={Layers3}
        />
      </section>

      <Card className="motion-panel">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <ListFilter className="size-4 text-primary" aria-hidden="true" />
              内容筛选
            </CardTitle>
            <CardDescription>
              筛选条件会作用于文章总量、分页和当前表格数据。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">第 {page.page || pageNumber} 页</Badge>
            <Badge variant="outline">{pageSize} 条/页</Badge>
            <Badge variant={selectedIds.size ? "primary" : "neutral"}>
              已选 {selectedIds.size}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {activeFilterLabels.length ? (
              activeFilterLabels.map((label) => (
                <UiTag key={label} variant="primary">
                  {label}
                </UiTag>
              ))
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                当前未启用筛选，展示全部文章。
              </span>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <UiTag variant="neutral">
              <Tags className="size-3.5" aria-hidden="true" />
              标签库 {formatInteger(tags.length)}
            </UiTag>
            <UiTag variant="neutral">
              <Layers3 className="size-3.5" aria-hidden="true" />
              分类 {formatInteger(categories.length)}
            </UiTag>
          </div>
        </CardContent>
      </Card>

      <AdminSearchForm
        onSubmit={handleSearch}
        loading={loading}
        className="motion-panel"
        actions={
          <>
            <Button type="submit" className="min-w-20">
              <Search className="h-4 w-4" aria-hidden="true" />
              查询
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={resetSearch}
              className="min-w-20"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重置
            </Button>
          </>
        }
        contentClassName="xl:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <Input
          label="文章标题"
          value={filters.title}
          onChange={(event) =>
            setFilters((current) => ({ ...current, title: event.target.value }))
          }
          placeholder="请输入文章标题"
        />
        <div className="grid gap-2 text-sm font-bold text-[var(--color-text)]">
          <span>文章分类</span>
          <PostCategorySelect
            value={filters.category_id}
            onChange={(value) =>
              setFilters((current) => ({ ...current, category_id: value }))
            }
            categories={categories}
          />
        </div>
        <div className="grid gap-2 text-sm font-bold text-[var(--color-text)]">
          <span>文章标签</span>
          <PostTagMultiSelect
            value={filters.tag_ids}
            onChange={(value) =>
              setFilters((current) => ({ ...current, tag_ids: value }))
            }
            tags={tags}
          />
        </div>
      </AdminSearchForm>

      <AdminDataTable
        columns={dataColumns}
        data={page.items}
        className="motion-panel"
        rowKey="id"
        settings={tableSettings}
        loading={loading}
        emptyText="暂无文章数据"
        minWidth={tableWidth}
        selectedRowKeys={selectedIds}
        allSelected={
          page.items.length > 0 &&
          page.items.every((post) => selectedIds.has(post.id))
        }
        onSelectRow={toggleSelected}
        onSelectAll={toggleSelectCurrentPage}
        getCheckboxLabel={(post) => `选择 ${post.title}`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="danger"
                disabled={!selectedIds.size}
                onClick={() => openDeletePosts(Array.from(selectedIds))}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                批量删除
              </Button>
            </div>
            <AdminTableToolbar
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
        }
        pagination={
          <Pagination
            page={page.page || pageNumber}
            totalPages={page.pages}
            total={page.total}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
            onPageChange={goToPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPageNumber(1);
            }}
          />
        }
      />

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
    </AdminPage>
  );
}
