"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Edit, Minus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Category, Paginated } from "@/types/blog";

type CategoryPage = Paginated<Category>;

type CategoryFormState = {
  id?: number;
  name: string;
  sort_order: number;
};

const emptyPage: CategoryPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};

const pageSizeOptions = [10, 20, 50];

function normalizePage(data: CategoryPage | Category[], page: number, pageSize: number): CategoryPage {
  if (!Array.isArray(data)) return data;
  return {
    items: data,
    total: data.length,
    page,
    page_size: pageSize,
    pages: data.length ? 1 : 0,
  };
}

function getArticleCount(item: Category) {
  return item.article_count ?? item.post_count ?? 0;
}

export default function AdminCategoriesPage() {
  const [pageData, setPageData] = useState<CategoryPage>(emptyPage);
  const [queryName, setQueryName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<CategoryFormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pageNumbers = useMemo(() => {
    const totalPages = Math.max(pageData.pages, 1);
    const start = Math.max(1, pageData.page - 2);
    const end = Math.min(totalPages, pageData.page + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [pageData.page, pageData.pages]);

  const allCurrentPageSelected = pageData.items.length > 0 && pageData.items.every((item) => selectedIds.has(item.id));

  async function load(currentPage = pageNumber, currentPageSize = pageSize, currentName = appliedName) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentName.trim()) params.set("name", currentName.trim());
      const data = await adminRequest<CategoryPage | Category[]>(`/admin/categories?${params.toString()}`);
      const normalized = normalizePage(data, currentPage, currentPageSize);
      setPageData(normalized);
      setJumpPage(String(normalized.page || 1));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "分类列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(pageNumber, pageSize, appliedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, appliedName]);

  function openCreateModal() {
    const nextSort = Math.max(1, pageData.total + 1, ...pageData.items.map((item) => Number(item.sort_order || 0) + 1));
    setEditing({ name: "", sort_order: nextSort });
    setModalError("");
  }

  function openEditModal(item: Category) {
    setEditing({ id: item.id, name: item.name, sort_order: item.sort_order ?? 1 });
    setModalError("");
  }

  function closeEditModal() {
    if (saving) return;
    setEditing(null);
    setModalError("");
  }

  function handleQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedName(queryName.trim());
    setPageNumber(1);
  }

  function handleReset() {
    setQueryName("");
    setAppliedName("");
    setPageNumber(1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const name = editing.name.trim();
    const sortOrder = Number(editing.sort_order);
    if (!name) {
      setModalError("分类名称不能为空");
      return;
    }
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      setModalError("排序必须是非负数字");
      return;
    }

    setModalError("");
    setNotice("");
    setSaving(true);
    try {
      const payload = { name, sort_order: Math.floor(sortOrder) };
      if (editing.id) {
        await adminRequest(`/admin/categories/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("分类已保存，列表已刷新。");
        await load(pageNumber, pageSize, appliedName);
      } else {
        await adminRequest("/admin/categories", { method: "POST", body: JSON.stringify(payload) });
        setNotice("分类已新增，列表已刷新。");
        setPageNumber(1);
        await load(1, pageSize, appliedName);
      }
      setEditing(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    setNotice("");
    try {
      await adminRequest(`/admin/categories/${deleteTarget.id}`, { method: "DELETE" });
      setNotice("分类已删除，列表已刷新。");
      setDeleteTarget(null);
      const shouldGoBack = pageData.items.length <= 1 && pageNumber > 1;
      if (shouldGoBack) {
        setPageNumber((value) => Math.max(1, value - 1));
      } else {
        await load(pageNumber, pageSize, appliedName);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCurrentPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allCurrentPageSelected) {
        pageData.items.forEach((item) => next.delete(item.id));
      } else {
        pageData.items.forEach((item) => next.add(item.id));
      }
      return next;
    });
  }

  function goToPage(page: number) {
    const totalPages = Math.max(pageData.pages, 1);
    setPageNumber(Math.min(Math.max(page, 1), totalPages));
  }

  function handleJump() {
    const target = Number(jumpPage);
    if (!Number.isFinite(target)) return;
    goToPage(target);
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form
        onSubmit={handleQuery}
        className="mb-4 grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900 lg:grid-cols-[1fr_auto]"
      >
        <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200 sm:grid-cols-[5.5rem_minmax(0,24rem)] sm:items-center">
          分类名称
          <input
            value={queryName}
            onChange={(event) => setQueryName(event.target.value)}
            placeholder="请输入分类名称"
            className={inputClass}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2 lg:justify-end">
          <Button type="submit" disabled={loading} className="min-h-10 px-4">
            <Search className="h-4 w-4" aria-hidden="true" />
            查询
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset} disabled={loading} className="min-h-10 px-4">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重置
          </Button>
        </div>
      </form>

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" onClick={openCreateModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增分类
          </Button>
          {loading ? <span className="text-sm font-bold text-ink/45 dark:text-slate-500">正在刷新...</span> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[760px] table-fixed text-sm">
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-44" />
            </colgroup>
            <thead className="bg-paper text-left text-ink/60 dark:bg-slate-950/80 dark:text-slate-400">
              <tr>
                <th className="p-3 text-center">
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPage} aria-label="选择当前页分类" />
                </th>
                <th className="p-3">分类名称</th>
                <th className="p-3">文章数</th>
                <th className="p-3">排序</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((item) => (
                <tr key={item.id} className="border-t border-ink/10 transition-colors hover:bg-paper/60 dark:border-white/10 dark:hover:bg-white/5">
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} aria-label={`选择 ${item.name}`} />
                  </td>
                  <td className="p-3">
                    <p className="truncate font-bold text-ink dark:text-slate-100" title={item.name}>{item.name}</p>
                  </td>
                  <td className="p-3 font-bold text-ink/65 dark:text-slate-300">{getArticleCount(item)}</td>
                  <td className="p-3 font-bold text-ink/65 dark:text-slate-300">{item.sort_order}</td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="interactive grid h-9 w-9 place-items-center rounded-md bg-sky-50 text-sky-600 ring-1 ring-sky-100 hover:bg-sky-100 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20"
                        aria-label="编辑"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(item);
                          setDeleteError("");
                        }}
                        className="interactive grid h-9 w-9 place-items-center rounded-md bg-red-50 text-red-600 ring-1 ring-red-100 hover:bg-red-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20"
                        aria-label="删除"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pageData.items.length && !loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-slate-500">
                    暂无分类数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 px-4 py-4 text-sm font-bold text-ink/65 dark:border-white/10 dark:text-slate-300">
          <span>共 {pageData.total} 条</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageNumber(1);
            }}
            className="min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}条/页</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pageData.page <= 1}
            onClick={() => goToPage(pageData.page - 1)}
            className="interactive inline-flex min-h-10 items-center gap-1 rounded-md bg-paper px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
                  number === pageData.page
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
            disabled={pageData.page >= pageData.pages || pageData.pages <= 0}
            onClick={() => goToPage(pageData.page + 1)}
            className="interactive inline-flex min-h-10 items-center gap-1 rounded-md bg-paper px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10"
          >
            下一页
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
          <Button type="button" variant="ghost" onClick={handleJump} className="min-h-10 px-3">跳转</Button>
        </div>
      </section>

      <AdminModal
        open={Boolean(editing)}
        title={editing?.id ? "编辑分类" : "新增分类"}
        size="sm"
        onClose={closeEditModal}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeEditModal} disabled={saving}>取消</Button>
            <Button type="submit" form="category-form" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
          </>
        }
      >
        {editing ? (
          <form id="category-form" onSubmit={handleSubmit} className="grid gap-5">
            <ModalError message={modalError} />
            <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
              <span><span className="text-red-500">*</span> 分类名称</span>
              <input
                required
                value={editing.name}
                onChange={(event) => setEditing((current) => current ? { ...current, name: event.target.value } : current)}
                placeholder="请输入分类名称"
                className={inputClass}
              />
            </label>
            <div className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
              <span>排序</span>
              <div className="grid h-10 max-w-xs grid-cols-[3rem_1fr_3rem] overflow-hidden rounded-md border border-ink/10 bg-white dark:border-white/10 dark:bg-slate-950/70">
                <button
                  type="button"
                  onClick={() => setEditing((current) => current ? { ...current, sort_order: Math.max(0, Number(current.sort_order || 0) - 1) } : current)}
                  className="interactive grid place-items-center border-r border-ink/10 text-ink/60 hover:bg-paper dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                  aria-label="减少排序"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editing.sort_order}
                  onChange={(event) => setEditing((current) => current ? { ...current, sort_order: Math.max(0, Number(event.target.value || 0)) } : current)}
                  className="min-w-0 bg-transparent px-3 text-center text-sm font-bold outline-none dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setEditing((current) => current ? { ...current, sort_order: Number(current.sort_order || 0) + 1 } : current)}
                  className="interactive grid place-items-center border-l border-ink/10 text-ink/60 hover:bg-paper dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                  aria-label="增加排序"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(deleteTarget)}
        title="删除确认"
        size="sm"
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError("");
        }}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button>
            <Button type="button" variant="danger" onClick={() => void confirmDelete()} disabled={deleting}>{deleting ? "删除中..." : "确定"}</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <ModalError message={deleteError} />
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-rose-500/15 dark:text-rose-200">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-base font-black text-ink dark:text-slate-100">
              {deleteTarget ? `确定删除分类「${deleteTarget.name}」吗？` : "确定删除该分类吗？"}
            </p>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
