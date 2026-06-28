"use client";

import { Edit, Minus, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminSearchForm } from "@/components/admin/AdminSearchForm";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { type TableSettings, useTableSettings } from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { Button } from "@/components/ui/button";
import { Input, inputBaseClass } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Category, Paginated } from "@/types/blog";

type CategoryPage = Paginated<Category>;

type CategoryFormState = {
  id?: number;
  name: string;
  sort_order: number;
};

type DeleteState =
  | { type: "single"; ids: number[]; name: string }
  | { type: "batch"; ids: number[] }
  | null;

const emptyPage: CategoryPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};

const pageSizeOptions = [10, 20, 50];
const categoryTableSettingsKey = "admin-table-settings:content-categories";
const categoryColumnOptions = [
  { key: "name", label: "分类名称", locked: true },
  { key: "articleCount", label: "文章数" },
  { key: "sortOrder", label: "排序" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultCategoryTableSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default" as const,
  visibleColumns: categoryColumnOptions.map((column) => column.key),
};

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

function Notice({ variant, children }: { variant: "error" | "success"; children: string }) {
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

export default function AdminCategoriesPage() {
  const [pageData, setPageData] = useState<CategoryPage>(emptyPage);
  const [tableSettings, setTableSettings] = useTableSettings(categoryTableSettingsKey, defaultCategoryTableSettings, categoryColumnOptions);
  const [queryName, setQueryName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<CategoryFormState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      } else {
        await adminRequest("/admin/categories", { method: "POST", body: JSON.stringify(payload) });
        setNotice("分类已新增，列表已刷新。");
      }
      await load(pageNumber, pageSize, appliedName);
      setEditing(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(item: Category) {
    setDeleteState({ type: "single", ids: [item.id], name: item.name });
    setDeleteError("");
  }

  function openBatchDeleteDialog() {
    if (!selectedIds.size) return;
    setDeleteState({ type: "batch", ids: Array.from(selectedIds) });
    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteState(null);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteState) return;
    const ids = deleteState.ids;
    setDeleting(true);
    setDeleteError("");
    setNotice("");
    try {
      for (const id of ids) {
        await adminRequest(`/admin/categories/${id}`, { method: "DELETE" });
      }
      setNotice(deleteState.type === "single" ? "分类已删除，列表已刷新。" : "选中分类已删除，列表已刷新。");
      setDeleteState(null);
      setSelectedIds(new Set());
      const remainingCurrentPageCount = pageData.items.filter((item) => !ids.includes(item.id)).length;
      const shouldGoBack = remainingCurrentPageCount === 0 && pageNumber > 1;
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

  function deleteDescription() {
    if (!deleteState) return "确定删除该分类吗？";
    if (deleteState.type === "single") return `确定删除分类「${deleteState.name}」吗？`;
    return `确定删除选中的 ${deleteState.ids.length} 个分类吗？`;
  }

  function toggleSelected(item: Category, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  }

  function toggleCurrentPage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageData.items.forEach((item) => {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  }

  function goToPage(page: number) {
    const totalPages = Math.max(pageData.pages, 1);
    setPageNumber(Math.min(Math.max(page, 1), totalPages));
  }

  const columns = useMemo<Array<AdminDataTableColumn<Category>>>(
    () => [
      {
        key: "name",
        title: "分类名称",
        minWidth: 180,
        ellipsis: true,
        hidden: !tableSettings.visibleColumns.includes("name"),
        render: (item) => <span className="font-bold text-[var(--color-text)]">{item.name}</span>,
      },
      {
        key: "articleCount",
        title: "文章数",
        width: 120,
        hidden: !tableSettings.visibleColumns.includes("articleCount"),
        render: (item) => <span className="font-bold text-[var(--color-text-muted)]">{getArticleCount(item)}</span>,
      },
      {
        key: "sortOrder",
        title: "排序",
        width: 100,
        hidden: !tableSettings.visibleColumns.includes("sortOrder"),
        render: (item) => <span className="font-bold text-[var(--color-text-muted)]">{item.sort_order}</span>,
      },
      {
        key: "createdAt",
        title: "创建时间",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("createdAt"),
        render: (item) => <span className="text-[var(--color-text-muted)]">{formatDateTime(item.created_at)}</span>,
      },
      {
        key: "actions",
        title: "操作",
        width: 150,
        align: "right",
        hidden: !tableSettings.visibleColumns.includes("actions"),
        render: (item) => (
          <RowActions
            actions={[
              { key: "edit", label: "编辑", icon: <Edit className={rowActionIconClass} aria-hidden="true" />, variant: "edit", onClick: () => openEditModal(item) },
              { key: "delete", label: "删除", icon: <Trash2 className={rowActionIconClass} aria-hidden="true" />, variant: "delete", onClick: () => openDeleteDialog(item) },
            ]}
            className="justify-end"
          />
        ),
      },
    ],
    [tableSettings.visibleColumns],
  );

  return (
    <AdminPage title="分类管理" description="管理博客文章分类和排序。">
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminSearchForm onSubmit={handleQuery} onReset={handleReset} loading={loading}>
        <Input
          label="分类名称"
          value={queryName}
          onChange={(event) => setQueryName(event.target.value)}
          placeholder="请输入分类名称"
        />
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={pageData.items}
        rowKey="id"
        settings={tableSettings}
        loading={loading}
        emptyText="暂无分类数据"
        minWidth={760}
        selectedRowKeys={selectedIds}
        allSelected={pageData.items.length > 0 && pageData.items.every((item) => selectedIds.has(item.id))}
        onSelectRow={toggleSelected}
        onSelectAll={toggleCurrentPage}
        getCheckboxLabel={(item) => `选择 ${item.name}`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={openCreateModal}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                新增
              </Button>
              <Button type="button" variant="danger" disabled={!selectedIds.size} onClick={openBatchDeleteDialog}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                批量删除
              </Button>
            </div>
            <AdminTableToolbar
              settings={tableSettings}
              onSettingsChange={setTableSettings}
              columns={categoryColumnOptions}
              onRefresh={() => void load(pageNumber, pageSize, appliedName)}
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
            page={pageData.page || pageNumber}
            totalPages={pageData.pages}
            total={pageData.total}
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

      <AdminModal
        open={Boolean(editing)}
        title={editing?.id ? "编辑分类" : "新增分类"}
        size="sm"
        onClose={closeEditModal}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeEditModal} disabled={saving}>取消</Button>
            <Button type="submit" form="category-form" loading={saving}>提交</Button>
          </>
        }
      >
        {editing ? (
          <form id="category-form" onSubmit={handleSubmit} className="grid gap-5">
            <ModalError message={modalError} />
            <Input
              required
              label="分类名称"
              value={editing.name}
              onChange={(event) => setEditing((current) => (current ? { ...current, name: event.target.value } : current))}
              placeholder="请输入分类名称"
            />
            <AdminField label="排序">
              <div className="grid h-10 max-w-xs grid-cols-[3rem_1fr_3rem] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
                <button
                  type="button"
                  onClick={() => setEditing((current) => (current ? { ...current, sort_order: Math.max(0, Number(current.sort_order || 0) - 1) } : current))}
                  className="interactive grid place-items-center border-r border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                  aria-label="减少排序"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editing.sort_order}
                  onChange={(event) => setEditing((current) => (current ? { ...current, sort_order: Math.max(0, Number(event.target.value || 0)) } : current))}
                  className={cn(inputBaseClass, "min-w-0 border-0 bg-transparent text-center shadow-none focus:ring-0")}
                />
                <button
                  type="button"
                  onClick={() => setEditing((current) => (current ? { ...current, sort_order: Number(current.sort_order || 0) + 1 } : current))}
                  className="interactive grid place-items-center border-l border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                  aria-label="增加排序"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </AdminField>
          </form>
        ) : null}
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteState)}
        description={deleteDescription()}
        error={deleteError}
        loading={deleting}
        onClose={closeDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPage>
  );
}
