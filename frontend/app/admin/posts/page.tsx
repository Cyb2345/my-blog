"use client";

import { Edit, EyeOff, Plus, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { PostModalEditor } from "@/components/admin/PostModalEditor";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { Category, Paginated, Post, Tag } from "@/types/blog";

type PostQuery = {
  title: string;
  category_id: string;
  tag_id: string;
};

type ModalState =
  | { mode: "create"; post?: null }
  | { mode: "edit"; post: Post }
  | null;

const emptyPage: Paginated<Post> = { items: [], total: 0, page: 1, page_size: 10, pages: 0 };
const emptyQuery: PostQuery = { title: "", category_id: "", tag_id: "" };
const pageSizeOptions = [10, 20, 50];

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

function StatusBadge({ active, activeText = "是", inactiveText = "否" }: { active: boolean; activeText?: string; inactiveText?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 min-w-10 items-center justify-center rounded-md px-2 text-xs font-black",
        active
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
          : "bg-red-50 text-red-600 dark:bg-rose-500/10 dark:text-rose-200",
      )}
    >
      {active ? activeText : inactiveText}
    </span>
  );
}

function CoverThumb({ src, title }: { src?: string | null; title: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <div className="mx-auto grid h-[70px] w-[120px] place-items-center overflow-hidden rounded-lg border border-ink/10 bg-paper text-xs font-bold text-ink/40 dark:border-white/10 dark:bg-slate-950 dark:text-slate-500">
      {showImage ? (
        <img
          src={getAssetUrl(src)}
          alt={`${title} 封面`}
          className="h-full w-full object-cover"
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
  const [page, setPage] = useState<Paginated<Post>>(emptyPage);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<PostQuery>(emptyQuery);
  const [activeQuery, setActiveQuery] = useState<PostQuery>(emptyQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(pageNumber),
      page_size: String(pageSize),
    });
    if (activeQuery.title.trim()) params.set("title", activeQuery.title.trim());
    if (activeQuery.category_id) params.set("category_id", activeQuery.category_id);
    if (activeQuery.tag_id) params.set("tag_id", activeQuery.tag_id);

    try {
      const data = await adminRequest<Paginated<Post>>(`/admin/posts?${params.toString()}`);
      setPage(data);
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
    const currentPageIds = new Set(page.items.map((post) => post.id));
    const currentPageWillBeEmpty =
      page.items.length > 0 && page.items.every((post) => removedIds.includes(post.id) || !currentPageIds.has(post.id));
    if (removedIds.length && currentPageWillBeEmpty && pageNumber > 1) {
      setPageNumber((value) => Math.max(1, value - 1));
      return;
    }
    await load();
  }

  async function deletePosts(ids: number[]) {
    if (!ids.length) return;
    const message = ids.length === 1 ? "确认删除该文章吗？" : `确认删除选中的 ${ids.length} 篇文章吗？`;
    if (!window.confirm(message)) return;
    setError("");
    setNotice("");
    try {
      await Promise.all(ids.map((id) => adminRequest(`/admin/posts/${id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      await refreshAfterMutation(ids.length === 1 ? "文章已删除，列表已刷新。" : "选中文章已删除，列表已刷新。", ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ocean dark:text-sky-300">内容管理 / 文章管理</p>
          <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">文章管理</h1>
        </div>
      </div>

      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form onSubmit={handleSearch} className="motion-surface mb-5 grid gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            文章标题
            <input
              value={filters.title}
              onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value }))}
              placeholder="请输入文章标题"
              className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none ring-ocean/20 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            文章分类
            <select
              value={filters.category_id}
              onChange={(event) => setFilters((current) => ({ ...current, category_id: event.target.value }))}
              className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none ring-ocean/20 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20"
            >
              <option value="">请选择文章分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            文章标签
            <select
              value={filters.tag_id}
              onChange={(event) => setFilters((current) => ({ ...current, tag_id: event.target.value }))}
              className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none ring-ocean/20 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20"
            >
              <option value="">请选择文章标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-4 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal({ mode: "create" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              新增
            </Button>
            <Button type="button" variant="danger" disabled={!selectedIds.size} onClick={() => void deletePosts(Array.from(selectedIds))}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              批量删除
            </Button>
          </div>
          {loading ? <span className="text-sm font-bold text-ink/45 dark:text-slate-500">加载中...</span> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1280px] border-collapse text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-slate-950/80 dark:text-slate-400">
              <tr>
                <th className="w-14 p-3 text-center">
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleSelectCurrentPage} aria-label="选择当前页文章" />
                </th>
                <th className="w-40 p-3 text-center">封面</th>
                <th className="p-3">标题</th>
                <th className="w-28 p-3">作者</th>
                <th className="w-32 p-3">分类</th>
                <th className="w-48 p-3">标签</th>
                <th className="w-20 p-3">推荐</th>
                <th className="w-20 p-3">置顶</th>
                <th className="w-24 p-3">阅读量</th>
                <th className="w-44 p-3">创建时间</th>
                <th className="w-44 p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((post) => {
                const visibleTags = post.tags?.slice(0, 3) ?? [];
                const extraTags = Math.max((post.tags?.length ?? 0) - visibleTags.length, 0);
                return (
                  <tr key={post.id} className="border-t border-ink/10 transition-colors hover:bg-paper/60 dark:border-white/10 dark:hover:bg-white/5">
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={selectedIds.has(post.id)} onChange={() => toggleSelect(post.id)} aria-label={`选择 ${post.title}`} />
                    </td>
                    <td className="p-3 text-center">
                      <CoverThumb src={post.cover_image} title={post.title} />
                    </td>
                    <td className="p-3">
                      <p className="line-clamp-2 max-w-[300px] font-bold text-ocean dark:text-sky-300" title={post.title}>
                        {post.title}
                      </p>
                    </td>
                    <td className="p-3 text-ink/70 dark:text-slate-300">{post.author?.nickname || post.author?.username || "管理员"}</td>
                    <td className="p-3 text-ink/70 dark:text-slate-300">{post.category?.name ?? "-"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {visibleTags.length ? (
                          <>
                            {visibleTags.map((tag) => (
                              <span key={tag.id} className="rounded-md bg-ocean/10 px-2 py-1 text-xs font-black text-ocean dark:bg-sky-400/15 dark:text-sky-200">
                                {tag.name}
                              </span>
                            ))}
                            {extraTags ? <span className="rounded-md bg-paper px-2 py-1 text-xs font-black text-ink/50 dark:bg-white/10 dark:text-slate-400">+{extraTags}</span> : null}
                          </>
                        ) : (
                          <span className="text-ink/40 dark:text-slate-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge active={post.is_recommended} />
                    </td>
                    <td className="p-3">
                      <StatusBadge active={post.is_top} />
                    </td>
                    <td className="p-3 font-bold text-ink/70 dark:text-slate-300">{post.view_count}</td>
                    <td className="p-3 text-ink/65 dark:text-slate-400">{formatDateTime(post.created_at)}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "edit", post })}
                          className="interactive grid h-9 w-9 place-items-center rounded-md bg-sky-50 text-sky-600 ring-1 ring-sky-100 hover:bg-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20"
                          aria-label="编辑"
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePosts([post.id])}
                          className="interactive grid h-9 w-9 place-items-center rounded-md bg-red-50 text-red-600 ring-1 ring-red-100 hover:bg-red-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20"
                          aria-label="删除"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void togglePublish(post)}
                          className="interactive grid h-9 w-9 place-items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20"
                          aria-label={post.status === "published" ? "下架" : "上架"}
                          title={post.status === "published" ? "下架" : "上架"}
                        >
                          {post.status === "published" ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!page.items.length && !loading ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-slate-500">
                    暂无文章数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 px-4 py-4 text-sm font-bold text-ink/65 dark:border-white/10 dark:text-slate-300">
          <span>共 {page.total} 条</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageNumber(1);
            }}
            className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}条/页
              </option>
            ))}
          </select>
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
                    ? "bg-ocean text-white dark:bg-sky-400 dark:text-slate-950"
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
    </>
  );
}
