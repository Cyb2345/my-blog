"use client";

import { ChevronLeft, ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { inputClass } from "@/components/admin/AdminField";
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
import { TableSkeletonRows } from "@/components/admin/TableSkeletonRows";
import { Button } from "@/components/ui/Button";
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

const emptyPage: AccessLogPage = { items: [], total: 0, page: 1, page_size: 10, pages: 0 };
const emptyQuery: AccessLogQuery = { ip: "", location: "", browser: "", os: "", start_time: "", end_time: "" };
const pageSizeOptions = [10, 20, 50];
const accessLogTableSettingsKey = "admin-table-settings:logs-access";
const accessLogPageCacheKey = "admin-page-cache:logs-access";
const defaultAccessLogTableSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: ["ip", "location", "browser", "os", "createdAt", "actions"],
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

function toApiDateTime(value: string) {
  return value ? new Date(value).toISOString() : "";
}

export default function AdminAccessLogsPage() {
  const [pageData, setPageData] = useState<AccessLogPage>(() => readAdminPageCache<AccessLogPage>(accessLogPageCacheKey) ?? emptyPage);
  const [tableSettings, setTableSettings] = useTableSettings(accessLogTableSettingsKey, defaultAccessLogTableSettings);
  const [filters, setFilters] = useState<AccessLogQuery>(emptyQuery);
  const [appliedFilters, setAppliedFilters] = useState<AccessLogQuery>(emptyQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tableCellPadding = tableDensityCellClass[tableSettings.density];
  const pageNumbers = useMemo(() => getPageNumbers(pageData.page, pageData.pages), [pageData.page, pageData.pages]);
  const allCurrentPageSelected = pageData.items.length > 0 && pageData.items.every((item) => selectedIds.has(item.id));

  async function load(currentPage = pageNumber, currentPageSize = pageSize, currentFilters = appliedFilters) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentFilters.ip.trim()) params.set("ip", currentFilters.ip.trim());
      if (currentFilters.location.trim()) params.set("location", currentFilters.location.trim());
      if (currentFilters.browser.trim()) params.set("browser", currentFilters.browser.trim());
      if (currentFilters.os.trim()) params.set("os", currentFilters.os.trim());
      if (currentFilters.start_time) params.set("start_time", toApiDateTime(currentFilters.start_time));
      if (currentFilters.end_time) params.set("end_time", toApiDateTime(currentFilters.end_time));

      const data = await adminRequest<AccessLogPage>(`/admin/logs/access?${params.toString()}`);
      setPageData(data);
      writeAdminPageCache(accessLogPageCacheKey, data);
      setPageNumber(data.page);
      setJumpPage(String(data.page));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
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

  function goToPage(nextPage: number) {
    const totalPages = Math.max(pageData.pages, 1);
    setPageNumber(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleJump() {
    const target = Number(jumpPage || pageData.page);
    if (!Number.isFinite(target)) return;
    goToPage(target);
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

  function openSingleDelete(item: AccessLog) {
    setDeleteError("");
    setDeleteState({ type: "single", ids: [item.id], label: item.ip || `#${item.id}` });
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
    if (deleteState.type === "single") return `确定删除访问日志「${deleteState.label}」吗？`;
    return `确定删除选中的 ${deleteState.ids.length} 条访问日志吗？`;
  }

  async function confirmDelete() {
    if (!deleteState || deleting) return;
    setDeleting(true);
    setDeleteError("");
    setError("");
    setNotice("");
    const ids = deleteState.ids;
    const nextPage = pageData.items.length <= ids.length && pageData.page > 1 ? pageData.page - 1 : pageData.page;
    try {
      if (deleteState.type === "single" && ids.length === 1) {
        await adminRequest(`/admin/logs/access/${ids[0]}`, { method: "DELETE" });
      } else {
        await adminRequest("/admin/logs/access/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
      }
      setDeleteState(null);
      setNotice(deleteState.type === "single" ? "访问日志已删除。" : `已删除 ${ids.length} 条访问日志。`);
      await load(nextPage, pageSize, appliedFilters);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form
        onSubmit={handleQuery}
        className="mb-4 grid gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900 xl:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            IP 地址
            <input
              value={filters.ip}
              onChange={(event) => setFilters((current) => ({ ...current, ip: event.target.value }))}
              placeholder="请输入 IP 地址"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            IP 归属地
            <input
              value={filters.location}
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              placeholder="请输入 IP 归属地"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            浏览器
            <input
              value={filters.browser}
              onChange={(event) => setFilters((current) => ({ ...current, browser: event.target.value }))}
              placeholder="请输入浏览器"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            操作系统
            <input
              value={filters.os}
              onChange={(event) => setFilters((current) => ({ ...current, os: event.target.value }))}
              placeholder="请输入操作系统"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            开始时间
            <DateTimePicker
              value={filters.start_time}
              onChange={(value) => setFilters((current) => ({ ...current, start_time: value }))}
              placeholder="请选择开始时间"
              disabled={loading}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            结束时间
            <DateTimePicker
              value={filters.end_time}
              onChange={(value) => setFilters((current) => ({ ...current, end_time: value }))}
              placeholder="请选择结束时间"
              disabled={loading}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-2 xl:justify-end">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={!selectedIds.size || loading} onClick={openBatchDelete}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              批量删除
            </Button>
          </div>
          <DataTableToolbar
            settings={tableSettings}
            onSettingsChange={setTableSettings}
            onRefresh={() => void load(pageData.page, pageSize, appliedFilters)}
            refreshing={loading}
            enableRefresh
            enableDensity
            enableColumns={false}
            enableStyle
          />
        </div>

        <div className="overflow-x-auto">
          <table
            className={cn(
              "admin-table w-full min-w-[1060px] table-fixed border-collapse text-sm",
              tableSettings.bordered &&
                "[&_td]:border-r [&_td]:border-ink/10 [&_th]:border-r [&_th]:border-ink/10 dark:[&_td]:border-white/10 dark:[&_th]:border-white/10",
            )}
          >
            <colgroup>
              <col className="w-14" />
              <col className="w-[180px]" />
              <col />
              <col className="w-[160px]" />
              <col className="w-[160px]" />
              <col className="w-[210px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead
              className={cn(
                "text-left text-ink/60 dark:text-slate-400",
                tableSettings.headerBackground && "bg-paper dark:bg-slate-950/80",
              )}
            >
              <tr>
                <th className={cn("text-center", tableCellPadding)}>
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPage} aria-label="选择当前页访问日志" />
                </th>
                <th className={tableCellPadding}>访问 IP</th>
                <th className={tableCellPadding}>IP 归属地</th>
                <th className={tableCellPadding}>浏览器</th>
                <th className={tableCellPadding}>操作系统</th>
                <th className={tableCellPadding}>访问时间</th>
                <th
                  className={cn(
                    "sticky right-0 z-10 text-right",
                    tableCellPadding,
                    tableSettings.headerBackground ? "bg-paper dark:bg-slate-950" : "bg-white dark:bg-slate-900",
                  )}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !pageData.items.length ? (
                <TableSkeletonRows columns={7} rows={6} cellClassName={tableCellPadding} />
              ) : null}
              {pageData.items.map((item, rowIndex) => {
                const rowStriped = tableSettings.striped && rowIndex % 2 === 1;
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "transition-colors hover:bg-paper/60 dark:hover:bg-white/5",
                      tableSettings.bordered && "border-t border-ink/10 dark:border-white/10",
                      rowStriped && "bg-paper/40 dark:bg-white/[0.03]",
                    )}
                  >
                    <td className={cn("text-center", tableCellPadding)}>
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} aria-label={`选择访问日志 ${item.ip || item.id}`} />
                    </td>
                    <td className={cn("font-black text-ink dark:text-slate-100", tableCellPadding)}>
                      <span className="block truncate" title={item.ip || "-"}>{item.ip || "-"}</span>
                    </td>
                    <td className={cn("text-ink/65 dark:text-slate-400", tableCellPadding)}>
                      <span className="block truncate" title={item.ip_location || "-"}>{item.ip_location || "-"}</span>
                    </td>
                    <td className={cn("font-bold text-ink/65 dark:text-slate-300", tableCellPadding)}>{item.browser || "Unknown"}</td>
                    <td className={cn("text-ink/65 dark:text-slate-400", tableCellPadding)}>
                      <span className="block truncate" title={item.os || "-"}>{item.os || "Unknown"}</span>
                    </td>
                    <td className={cn("text-ink/65 dark:text-slate-400", tableCellPadding)}>{formatDateTime(item.created_at)}</td>
                    <td
                      className={cn(
                        "sticky right-0",
                        tableCellPadding,
                        rowStriped ? "bg-paper dark:bg-slate-900" : "bg-white dark:bg-slate-900",
                      )}
                    >
                      <AdminTableActions>
                        <AdminTableActionButton
                          variant="delete"
                          onClick={() => openSingleDelete(item)}
                          aria-label="删除"
                          title="删除"
                        >
                          <Trash2 className={adminTableActionIconClass} aria-hidden="true" />
                        </AdminTableActionButton>
                      </AdminTableActions>
                    </td>
                  </tr>
                );
              })}
              {!pageData.items.length && !loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-slate-500">
                    暂无访问日志
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 px-4 py-4 text-sm font-bold text-ink/65 dark:border-white/10 dark:text-slate-300">
          <span>共 {pageData.total} 条</span>
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

      <DeleteConfirmDialog
        open={Boolean(deleteState)}
        description={deleteDescription()}
        error={deleteError}
        loading={deleting}
        onClose={closeDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
