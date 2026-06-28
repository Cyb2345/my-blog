"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/AdminDataTable";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminSearchForm } from "@/components/admin/AdminSearchForm";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { type TableSettings, useTableSettings } from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Paginated, Tag } from "@/types/blog";

type TagPage = Paginated<Tag>;

type TagFormState = {
  id?: number;
  name: string;
};

type DeleteState =
  | { type: "single"; ids: number[]; name: string }
  | { type: "batch"; ids: number[] }
  | null;

const emptyPage: TagPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};

const pageSizeOptions = [10, 20, 50];
const tagTableSettingsKey = "admin-table-settings:content-tags";
const tagColumnOptions = [
  { key: "name", label: "标签名称", locked: true },
  { key: "articleCount", label: "文章数" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultTagTableSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default",
  visibleColumns: tagColumnOptions.map((column) => column.key),
};

function normalizePage(data: TagPage | Tag[], page: number, pageSize: number): TagPage {
  if (!Array.isArray(data)) return data;
  return {
    items: data,
    total: data.length,
    page,
    page_size: pageSize,
    pages: data.length ? 1 : 0,
  };
}

function getArticleCount(item: Tag) {
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

export default function AdminTagsPage() {
  const [pageData, setPageData] = useState<TagPage>(emptyPage);
  const [tableSettings, setTableSettings] = useTableSettings(tagTableSettingsKey, defaultTagTableSettings, tagColumnOptions);
  const [queryName, setQueryName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<TagFormState | null>(null);
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
      const data = await adminRequest<TagPage | Tag[]>(`/admin/tags?${params.toString()}`);
      const normalized = normalizePage(data, currentPage, currentPageSize);
      setPageData(normalized);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "标签列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(pageNumber, pageSize, appliedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, appliedName]);

  function openCreateModal() {
    setEditing({ name: "" });
    setModalError("");
  }

  function openEditModal(item: Tag) {
    setEditing({ id: item.id, name: item.name });
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
    if (!name) {
      setModalError("标签名称不能为空");
      return;
    }

    setModalError("");
    setNotice("");
    setSaving(true);
    try {
      const payload = { name };
      if (editing.id) {
        await adminRequest(`/admin/tags/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("标签已保存，列表已刷新。");
      } else {
        await adminRequest("/admin/tags", { method: "POST", body: JSON.stringify(payload) });
        setNotice("标签已新增，列表已刷新。");
      }
      setEditing(null);
      await load(pageNumber, pageSize, appliedName);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(item: Tag) {
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
        await adminRequest(`/admin/tags/${id}`, { method: "DELETE" });
      }
      setNotice(deleteState.type === "single" ? "标签已删除，列表已刷新。" : "选中标签已删除，列表已刷新。");
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
    if (!deleteState) return "确定删除该标签吗？";
    if (deleteState.type === "single") return `确定删除标签「${deleteState.name}」吗？`;
    return `确定删除选中的 ${deleteState.ids.length} 个标签吗？`;
  }

  function toggleSelected(item: Tag, checked: boolean) {
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

  const columns = useMemo<Array<AdminDataTableColumn<Tag>>>(
    () => [
      {
        key: "name",
        title: "标签名称",
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
    <AdminPage title="标签管理" description="管理博客文章标签。">
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminSearchForm onSubmit={handleQuery} onReset={handleReset} loading={loading}>
        <Input
          label="标签名称"
          value={queryName}
          onChange={(event) => setQueryName(event.target.value)}
          placeholder="请输入标签名称"
        />
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={pageData.items}
        rowKey="id"
        settings={tableSettings}
        loading={loading}
        emptyText="暂无标签数据"
        minWidth={640}
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
              columns={tagColumnOptions}
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
        title={editing?.id ? "编辑标签" : "新增标签"}
        size="sm"
        onClose={closeEditModal}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeEditModal} disabled={saving}>取消</Button>
            <Button type="submit" form="tag-form" loading={saving}>提交</Button>
          </>
        }
      >
        {editing ? (
          <form id="tag-form" onSubmit={handleSubmit} className="grid gap-5">
            <ModalError message={modalError} />
            <Input
              required
              label="标签名称"
              value={editing.name}
              onChange={(event) => setEditing((current) => (current ? { ...current, name: event.target.value } : current))}
              placeholder="请输入标签名称"
            />
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
