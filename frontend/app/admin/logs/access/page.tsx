"use client";

import { RotateCcw, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { readAdminPageCache, writeAdminPageCache } from "@/lib/adminPageCache";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AccessLog, Paginated } from "@/types/blog";

type AccessLogPage = Paginated<AccessLog>;
type AccessLogQuery = {
  ip: string;
  location: string;
  browser: string;
  os: string;
  start_time: string;
  end_time: string;
};
type DeleteState =
  | { type: "single"; ids: number[]; label: string }
  | { type: "batch"; ids: number[] }
  | null;

const emptyPage: AccessLogPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};
const emptyQuery: AccessLogQuery = {
  ip: "",
  location: "",
  browser: "",
  os: "",
  start_time: "",
  end_time: "",
};
const pageSizeOptions = [10, 20, 50];
const accessLogTableSettingsKey = "admin-table-settings:logs-access";
const accessLogPageCacheKey = "admin-page-cache:logs-access";
const accessLogColumnOptions = [
  { key: "ip", label: "访问 IP", locked: true },
  { key: "location", label: "IP 归属地" },
  { key: "browser", label: "浏览器" },
  { key: "os", label: "操作系统" },
  { key: "createdAt", label: "访问时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultAccessLogTableSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: accessLogColumnOptions.map((column) => column.key),
};

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
          ? "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive"
          : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]",
      )}
    >
      {children}
    </p>
  );
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

function toApiDateTime(value: string) {
  return value ? new Date(value).toISOString() : "";
}

export default function AdminAccessLogsPage() {
  const [pageData, setPageData] = useState<AccessLogPage>(
    () => readAdminPageCache<AccessLogPage>(accessLogPageCacheKey) ?? emptyPage,
  );
  const [tableSettings, setTableSettings] = useTableSettings(
    accessLogTableSettingsKey,
    defaultAccessLogTableSettings,
    accessLogColumnOptions,
  );
  const [filters, setFilters] = useState<AccessLogQuery>(emptyQuery);
  const [appliedFilters, setAppliedFilters] =
    useState<AccessLogQuery>(emptyQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allCurrentPageSelected =
    pageData.items.length > 0 &&
    pageData.items.every((item) => selectedIds.has(item.id));

  async function load(
    currentPage = pageNumber,
    currentPageSize = pageSize,
    currentFilters = appliedFilters,
  ) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentFilters.ip.trim()) params.set("ip", currentFilters.ip.trim());
      if (currentFilters.location.trim())
        params.set("location", currentFilters.location.trim());
      if (currentFilters.browser.trim())
        params.set("browser", currentFilters.browser.trim());
      if (currentFilters.os.trim()) params.set("os", currentFilters.os.trim());
      if (currentFilters.start_time)
        params.set("start_time", toApiDateTime(currentFilters.start_time));
      if (currentFilters.end_time)
        params.set("end_time", toApiDateTime(currentFilters.end_time));
      const data = await adminRequest<AccessLogPage>(
        `/admin/logs/access?${params.toString()}`,
      );
      setPageData(data);
      writeAdminPageCache(accessLogPageCacheKey, data);
      setPageNumber(data.page);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "访问日志加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(pageNumber, pageSize, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, appliedFilters]);

  function handleQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    setPageNumber(1);
  }

  function handleReset() {
    setFilters(emptyQuery);
    setAppliedFilters(emptyQuery);
    setPageNumber(1);
  }

  function toggleSelect(item: AccessLog, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  }

  function toggleCurrentPage(checked: boolean) {
    setSelectedIds(
      checked ? new Set(pageData.items.map((item) => item.id)) : new Set(),
    );
  }

  function openSingleDelete(item: AccessLog) {
    setDeleteError("");
    setDeleteState({
      type: "single",
      ids: [item.id],
      label: item.ip || `#${item.id}`,
    });
  }

  function openBatchDelete() {
    if (!selectedIds.size) return;
    setDeleteError("");
    setDeleteState({ type: "batch", ids: Array.from(selectedIds) });
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteState(null);
    setDeleteError("");
  }

  function deleteDescription() {
    if (!deleteState) return "";
    if (deleteState.type === "single")
      return `确定删除访问日志「${deleteState.label}」吗？`;
    return `确定删除选中的 ${deleteState.ids.length} 条访问日志吗？`;
  }

  async function confirmDelete() {
    if (!deleteState || deleting) return;
    setDeleting(true);
    setDeleteError("");
    setError("");
    setNotice("");
    const ids = deleteState.ids;
    const nextPage =
      pageData.items.length <= ids.length && pageData.page > 1
        ? pageData.page - 1
        : pageData.page;
    try {
      if (deleteState.type === "single" && ids.length === 1) {
        await adminRequest(`/admin/logs/access/${ids[0]}`, {
          method: "DELETE",
        });
      } else {
        await adminRequest("/admin/logs/access/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
      }
      setDeleteState(null);
      setNotice(
        deleteState.type === "single"
          ? "访问日志已删除。"
          : `已删除 ${ids.length} 条访问日志。`,
      );
      await load(nextPage, pageSize, appliedFilters);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<AdminDataTableColumn<AccessLog>>>(
    () => [
      {
        key: "ip",
        title: "访问 IP",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("ip"),
        render: (item) => (
          <span className="font-black text-foreground">{item.ip || "-"}</span>
        ),
      },
      {
        key: "location",
        title: "IP 归属地",
        minWidth: 240,
        ellipsis: true,
        hidden: !tableSettings.visibleColumns.includes("location"),
        render: (item) => item.ip_location || "-",
      },
      {
        key: "browser",
        title: "浏览器",
        width: 160,
        hidden: !tableSettings.visibleColumns.includes("browser"),
        render: (item) => item.browser || "Unknown",
      },
      {
        key: "os",
        title: "操作系统",
        width: 160,
        ellipsis: true,
        hidden: !tableSettings.visibleColumns.includes("os"),
        render: (item) => item.os || "Unknown",
      },
      {
        key: "createdAt",
        title: "访问时间",
        width: 210,
        hidden: !tableSettings.visibleColumns.includes("createdAt"),
        render: (item) => formatDateTime(item.created_at),
      },
      {
        key: "actions",
        title: "操作",
        width: 120,
        align: "center",
        sticky: "right",
        hidden: !tableSettings.visibleColumns.includes("actions"),
        render: (item) => (
          <RowActions
            actions={[
              {
                key: "delete",
                label: "删除",
                icon: <Trash2 className={rowActionIconClass} />,
                variant: "delete",
                onClick: () => openSingleDelete(item),
              },
            ]}
          />
        ),
      },
    ],
    [tableSettings.visibleColumns],
  );

  return (
    <AdminPage
      title="访问日志"
      description="查看前台访问来源、客户端信息并支持批量清理。"
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminSearchForm
        onSubmit={handleQuery}
        loading={loading}
        actions={
          <>
            <Button type="submit" disabled={loading}>
              <Search className="size-4" aria-hidden="true" />
              查询
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={loading}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              重置
            </Button>
          </>
        }
      >
        <Input
          label="IP 地址"
          value={filters.ip}
          onChange={(event) =>
            setFilters((current) => ({ ...current, ip: event.target.value }))
          }
          placeholder="请输入 IP 地址"
        />
        <Input
          label="IP 归属地"
          value={filters.location}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              location: event.target.value,
            }))
          }
          placeholder="请输入 IP 归属地"
        />
        <Input
          label="浏览器"
          value={filters.browser}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              browser: event.target.value,
            }))
          }
          placeholder="请输入浏览器"
        />
        <Input
          label="操作系统"
          value={filters.os}
          onChange={(event) =>
            setFilters((current) => ({ ...current, os: event.target.value }))
          }
          placeholder="请输入操作系统"
        />
        <AdminField label="开始时间">
          <DateTimePicker
            value={filters.start_time}
            onChange={(value) =>
              setFilters((current) => ({ ...current, start_time: value }))
            }
            placeholder="请选择开始时间"
            disabled={loading}
          />
        </AdminField>
        <AdminField label="结束时间">
          <DateTimePicker
            value={filters.end_time}
            onChange={(value) =>
              setFilters((current) => ({ ...current, end_time: value }))
            }
            placeholder="请选择结束时间"
            disabled={loading}
          />
        </AdminField>
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={pageData.items}
        rowKey="id"
        settings={tableSettings}
        loading={loading}
        emptyText="暂无访问日志"
        minWidth={1060}
        selectedRowKeys={selectedIds}
        allSelected={allCurrentPageSelected}
        onSelectRow={toggleSelect}
        onSelectAll={toggleCurrentPage}
        getCheckboxLabel={(item) => `选择访问日志 ${item.ip || item.id}`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="danger"
              disabled={!selectedIds.size || loading}
              onClick={openBatchDelete}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              批量删除
            </Button>
            <AdminTableToolbar
              settings={tableSettings}
              onSettingsChange={setTableSettings}
              columns={accessLogColumnOptions}
              onRefresh={() =>
                void load(pageData.page, pageSize, appliedFilters)
              }
              refreshing={loading}
              enableRefresh
              enableDensity
              enableStyle
            />
          </div>
        }
        pagination={
          <Pagination
            page={pageData.page}
            totalPages={pageData.pages}
            total={pageData.total}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
            onPageChange={setPageNumber}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPageNumber(1);
            }}
          />
        }
      />

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
