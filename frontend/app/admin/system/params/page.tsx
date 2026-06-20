"use client";

import { ChevronLeft, ChevronRight, Edit, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
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
import { ParamValueField } from "@/components/admin/ParamValueField";
import { Button } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { MediaAsset, Paginated, SystemParam } from "@/types/blog";

type ParamPage = Paginated<SystemParam>;
type ParamFilters = {
  name: string;
  key: string;
  is_system: string;
};
type ParamModalState = {
  mode: "create" | "edit";
  item?: SystemParam;
};
type DeleteState =
  | { type: "single"; ids: number[]; label: string }
  | { type: "batch"; ids: number[] }
  | null;

const emptyPage: ParamPage = { items: [], total: 0, page: 1, page_size: 10, pages: 1 };
const emptyFilters: ParamFilters = { name: "", key: "", is_system: "" };
const pageSizeOptions = [10, 20, 50];
const systemFilterOptions = [
  { label: "全部", value: "" },
  { label: "是", value: "true" },
  { label: "否", value: "false" },
];
const paramTableSettingsKey = "admin-table-settings:system-params";
const defaultParamTableSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: ["name", "key", "value", "isSystem", "createdAt", "updatedAt", "remark", "actions"],
};

const hotUpdateKeys = new Set([
  "sys_mfa_enabled",
  "password_error_count",
  "password_lock_minutes",
  "login_rate_limit_per_minute",
  "captcha_rate_limit_per_minute",
  "mfa_rate_limit_per_minute",
]);
const restartKeys = new Set(["max_upload_image_size_mb"]);
const frontendReservedKeys = new Set(["default_theme"]);
const featureReservedKeys = new Set(["sys_captcha_type", "open_comment", "open_message"]);

function normalizePage(data: ParamPage | SystemParam[], page: number, pageSize: number): ParamPage {
  if (!Array.isArray(data)) return data;
  return {
    items: data,
    total: data.length,
    page,
    page_size: pageSize,
    pages: data.length ? 1 : 1,
  };
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

function getPageNumbers(current: number, total: number) {
  const totalPages = Math.max(total, 1);
  const count = Math.min(totalPages, 7);
  let start = Math.max(1, current - Math.floor(count / 2));
  const end = Math.min(totalPages, start + count - 1);
  start = Math.max(1, end - count + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isSensitiveParamKey(key: string) {
  const normalized = key.trim().toLowerCase();
  if (
    [
      "database_url",
      "secret_key",
      "r2_access_key_id",
      "r2_secret_access_key",
      "next_server_actions_encryption_key",
    ].includes(normalized)
  ) {
    return true;
  }
  if (normalized.endsWith("_password")) return true;
  return ["mfa_secret", "password_hash", "access_token", "refresh_token", "api_token", "jwt_token"].some((part) => normalized.includes(part));
}

function getEffectHint(key: string) {
  if (hotUpdateKeys.has(key)) return { label: "立即生效", className: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20" };
  if (restartKeys.has(key)) return { label: "重启后生效", className: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20" };
  if (frontendReservedKeys.has(key)) return { label: "需前端接入", className: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/20" };
  if (featureReservedKeys.has(key)) return { label: "预留配置", className: "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-[color-mix(in_srgb,var(--primary)_34%,transparent)] dark:text-white dark:ring-[color-mix(in_srgb,var(--primary)_58%,transparent)]" };
  return { label: "保存后生效", className: "bg-paper text-ink/60 ring-ink/10 dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)] dark:ring-[var(--border-soft)]" };
}

export default function AdminParamsPage() {
  const [pageData, setPageData] = useState<ParamPage>(emptyPage);
  const [tableSettings, setTableSettings] = useTableSettings(paramTableSettingsKey, defaultParamTableSettings);
  const [filters, setFilters] = useState<ParamFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<ParamFilters>(emptyFilters);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ParamModalState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tableCellPadding = tableDensityCellClass[tableSettings.density];
  const pageNumbers = useMemo(() => getPageNumbers(pageData.page, pageData.pages), [pageData.page, pageData.pages]);
  const allCurrentPageSelected = pageData.items.length > 0 && pageData.items.every((item) => selectedIds.has(item.id));

  async function load(currentPage = pageNumber, currentPageSize = pageSize, currentFilters = appliedFilters) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentFilters.name.trim()) query.set("name", currentFilters.name.trim());
      if (currentFilters.key.trim()) query.set("key", currentFilters.key.trim());
      if (currentFilters.is_system) query.set("is_system", currentFilters.is_system);
      const data = await adminRequest<ParamPage | SystemParam[]>(`/admin/system/params?${query.toString()}`);
      const normalized = normalizePage(data, currentPage, currentPageSize);
      setPageData(normalized);
      setPageNumber(normalized.page);
      setJumpPage(String(normalized.page || 1));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "参数列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(pageNumber, pageSize, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, appliedFilters]);

  useEffect(() => {
    adminRequest<MediaAsset[]>("/admin/media")
      .then((items) => setMediaAssets(items.filter((item) => item.is_active)))
      .catch(() => setMediaAssets([]));
  }, []);

  function handleQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    setPageNumber(1);
  }

  function handleReset() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPageNumber(1);
  }

  function openModal(next: ParamModalState) {
    setModalError("");
    setNotice("");
    setModal(next);
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setModalError("");
  }

  async function saveParam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const target = modal.item;
    const payload = {
      name: String(form.get("name") ?? target?.name ?? "").trim(),
      key: String(form.get("key") ?? target?.key ?? "").trim(),
      value: String(form.get("value") ?? ""),
      is_system: target ? target.is_system : form.get("is_system") === "on",
      remark: target?.remark ?? "",
    };

    if (!payload.name || !payload.key) {
      setModalError("参数名称和参数键名不能为空");
      return;
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(payload.key)) {
      setModalError("参数键名只能包含字母、数字、下划线、点和短横线");
      return;
    }

    setSaving(true);
    setModalError("");
    setError("");
    setNotice("");
    try {
      if (target) {
        await adminRequest(`/admin/system/params/${target.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: payload.name,
            value: payload.value,
            remark: payload.remark,
          }),
        });
        setNotice(`${getEffectHint(target.key).label === "立即生效" ? "修改成功，已生效。" : `修改成功，${getEffectHint(target.key).label}。`}`);
        setModal(null);
        await load(pageNumber, pageSize, appliedFilters);
      } else {
        await adminRequest("/admin/system/params", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("新增成功，列表已刷新。");
        setModal(null);
        await load(1, pageSize, appliedFilters);
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
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

  function openSingleDelete(item: SystemParam) {
    if (item.is_system) {
      setError("系统内置参数不允许删除");
      return;
    }
    setDeleteError("");
    setDeleteState({ type: "single", ids: [item.id], label: item.name });
  }

  function openBatchDelete() {
    if (!selectedIds.size) return;
    const selectedParams = pageData.items.filter((item) => selectedIds.has(item.id));
    if (selectedParams.some((item) => item.is_system)) {
      setError("系统内置参数不允许删除");
      return;
    }
    setDeleteError("");
    setDeleteState({ type: "batch", ids: Array.from(selectedIds) });
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteState(null);
    setDeleteError("");
  }

  function deleteDescription() {
    if (!deleteState) return "确定删除该参数吗？";
    if (deleteState.type === "single") return `确定删除参数「${deleteState.label}」吗？`;
    return "确定删除选中的参数吗？";
  }

  async function confirmDelete() {
    if (!deleteState || deleting) return;
    const ids = deleteState.ids;
    const nextPage = pageData.items.length <= ids.length && pageData.page > 1 ? pageData.page - 1 : pageData.page;
    setDeleting(true);
    setDeleteError("");
    setError("");
    setNotice("");
    try {
      if (deleteState.type === "single" && ids.length === 1) {
        await adminRequest(`/admin/system/params/${ids[0]}`, { method: "DELETE" });
      } else {
        await adminRequest("/admin/system/params/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
      }
      setDeleteState(null);
      setNotice(deleteState.type === "single" ? "参数已删除，列表已刷新。" : "选中参数已删除，列表已刷新。");
      await load(nextPage, pageSize, appliedFilters);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
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

  const modalItem = modal?.item;
  const modalSensitive = modalItem ? isSensitiveParamKey(modalItem.key) : false;
  const modalHint = getEffectHint(modalItem?.key ?? "");

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <form
        onSubmit={handleQuery}
        className="mb-4 grid gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)] xl:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-[var(--text)]">
            参数名称
            <input
              value={filters.name}
              onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))}
              placeholder="请输入参数名称"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-[var(--text)]">
            参数键名
            <input
              value={filters.key}
              onChange={(event) => setFilters((current) => ({ ...current, key: event.target.value }))}
              placeholder="请输入参数键名"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-[var(--text)]">
            系统内置
            <CustomSelect
              value={filters.is_system}
              onChange={(value) => setFilters((current) => ({ ...current, is_system: value }))}
              options={systemFilterOptions}
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

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-[var(--border-soft)]">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => openModal({ mode: "create" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              新增
            </Button>
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
              "admin-table w-full min-w-[1520px] table-fixed border-collapse text-sm",
              tableSettings.bordered &&
                "[&_td]:border-r [&_td]:border-ink/10 [&_th]:border-r [&_th]:border-ink/10 dark:[&_td]:border-[var(--border-soft)] dark:[&_th]:border-[var(--border-soft)]",
            )}
          >
            <colgroup>
              <col className="w-14" />
              <col className="w-[180px]" />
              <col className="w-[220px]" />
              <col className="w-[240px]" />
              <col className="w-[110px]" />
              <col className="w-[180px]" />
              <col className="w-[180px]" />
              <col />
              <col className="w-[140px]" />
            </colgroup>
            <thead
              className={cn(
                "text-left text-ink/60 dark:text-[var(--text-muted)]",
                tableSettings.headerBackground && "bg-paper dark:bg-[var(--bg-soft)]",
              )}
            >
              <tr>
                <th className={cn("text-center", tableCellPadding)}>
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPage} aria-label="选择当前页参数" />
                </th>
                <th className={tableCellPadding}>参数名称</th>
                <th className={tableCellPadding}>参数键名</th>
                <th className={tableCellPadding}>参数键值</th>
                <th className={tableCellPadding}>系统内置</th>
                <th className={tableCellPadding}>创建时间</th>
                <th className={tableCellPadding}>更新时间</th>
                <th className={tableCellPadding}>备注</th>
                <th
                  className={cn(
                    "sticky right-0 z-10 text-center",
                    tableCellPadding,
                    tableSettings.headerBackground ? "bg-paper dark:bg-[var(--bg-soft)]" : "bg-white dark:bg-[var(--surface)]",
                  )}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((param, rowIndex) => {
                const rowStriped = tableSettings.striped && rowIndex % 2 === 1;
                const hint = getEffectHint(param.key);
                return (
                  <tr
                    key={param.id}
                    className={cn(
                      "transition-colors hover:bg-paper/60 dark:hover:bg-[var(--hover)]",
                      tableSettings.bordered && "border-t border-ink/10 dark:border-[var(--border-soft)]",
                      rowStriped && "bg-paper/40 dark:bg-white/[0.03]",
                    )}
                  >
                    <td className={cn("text-center", tableCellPadding)}>
                      <input type="checkbox" checked={selectedIds.has(param.id)} onChange={() => toggleSelect(param.id)} aria-label={`选择参数 ${param.name}`} />
                    </td>
                    <td className={cn("font-black text-ink dark:text-[var(--text)]", tableCellPadding)}>
                      <span className="block truncate" title={param.name}>{param.name}</span>
                    </td>
                    <td className={cn("font-mono text-xs font-bold text-ink/65 dark:text-[var(--text-secondary)]", tableCellPadding)}>
                      <span className="block truncate" title={param.key}>{param.key}</span>
                    </td>
                    <td className={cn("font-bold text-ink/70 dark:text-[var(--text-secondary)]", tableCellPadding)}>
                      <span className="block truncate" title={param.value || "-"}>{param.value || "-"}</span>
                    </td>
                    <td className={tableCellPadding}>
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-1 text-xs font-black ring-1",
                          param.is_system
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20"
                            : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-[var(--text-secondary)] dark:ring-[var(--border-soft)]",
                        )}
                      >
                        {param.is_system ? "是" : "否"}
                      </span>
                    </td>
                    <td className={cn("text-ink/65 dark:text-[var(--text-secondary)]", tableCellPadding)}>{formatDateTime(param.created_at)}</td>
                    <td className={cn("text-ink/65 dark:text-[var(--text-secondary)]", tableCellPadding)}>{formatDateTime(param.updated_at)}</td>
                    <td className={cn("text-ink/65 dark:text-[var(--text-secondary)]", tableCellPadding)}>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("shrink-0 rounded-md px-2 py-1 text-xs font-black ring-1", hint.className)}>{hint.label}</span>
                        <span className="block truncate" title={param.remark || ""}>{param.remark || "-"}</span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "sticky right-0",
                        tableCellPadding,
                        rowStriped ? "bg-paper dark:bg-[var(--surface)]" : "bg-white dark:bg-[var(--surface)]",
                      )}
                    >
                      <AdminTableActions>
                        <AdminTableActionButton
                          variant="edit"
                          onClick={() => openModal({ mode: "edit", item: param })}
                          aria-label="编辑"
                          title="编辑"
                        >
                          <Edit className={adminTableActionIconClass} aria-hidden="true" />
                        </AdminTableActionButton>
                        <AdminTableActionButton
                          variant="delete"
                          onClick={() => openSingleDelete(param)}
                          disabled={param.is_system}
                          className={param.is_system ? "bg-slate-100 text-slate-400 ring-slate-200 dark:bg-white/5 dark:text-[var(--text-muted)] dark:ring-[var(--border-soft)]" : undefined}
                          aria-label={param.is_system ? "系统内置参数不允许删除" : "删除"}
                          title={param.is_system ? "系统内置参数不允许删除" : "删除"}
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
                  <td colSpan={9} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-[var(--text-muted)]">
                    暂无参数
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 px-4 py-4 text-sm font-bold text-ink/65 dark:border-[var(--border-soft)] dark:text-[var(--text-secondary)]">
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
            className="interactive inline-flex min-h-10 items-center gap-1 rounded-md bg-paper px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--surface-soft)]"
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
                    ? "bg-ocean text-white dark:bg-[var(--primary)] dark:text-[var(--bg)]"
                    : "bg-paper text-ink/70 dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)]",
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
            className="interactive inline-flex min-h-10 items-center gap-1 rounded-md bg-paper px-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--surface-soft)]"
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
            className="h-10 w-20 rounded-md border border-ink/10 bg-white px-3 text-center outline-none dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)]"
            aria-label="跳转页码"
          />
          <span>页</span>
          <Button type="button" variant="ghost" onClick={handleJump} className="min-h-10 px-3">跳转</Button>
        </div>
      </section>

      <AdminModal open={Boolean(modal)} title={modal?.mode === "edit" ? "编辑参数" : "新增参数"} size="md" onClose={closeModal}>
        <form key={modalItem?.id ?? "new"} onSubmit={saveParam} className="grid gap-4">
          <ModalError message={modalError} />
          {modal?.mode === "edit" ? (
            <p className="rounded-md bg-paper px-3 py-2 text-xs font-bold text-ink/60 dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)]">
              当前参数：<span className={cn("ml-1 rounded-md px-2 py-1 ring-1", modalHint.className)}>{modalHint.label}</span>
              {modalSensitive ? <span className="ml-2 text-red-600 dark:text-rose-200">敏感参数不会回显原始值，留空表示不修改。</span> : null}
            </p>
          ) : null}
          <AdminField label="参数名称 *">
            <input name="name" required defaultValue={modalItem?.name ?? ""} placeholder="请输入参数名称" className={inputClass} />
          </AdminField>
          <AdminField label="参数键名 *">
            <input
              name="key"
              required
              readOnly={Boolean(modalItem)}
              defaultValue={modalItem?.key ?? ""}
              placeholder="请输入参数键名"
              className={cn(inputClass, modalItem && "cursor-not-allowed opacity-75")}
            />
          </AdminField>
          <AdminField label="参数键值">
            <ParamValueField
              key={`${modalItem?.id ?? "new"}-${modalItem?.key ?? ""}`}
              paramKey={modalItem?.key}
              paramName={modalItem?.name}
              initialValue={modalItem?.value ?? ""}
              sensitive={modalSensitive}
              assets={mediaAssets}
            />
          </AdminField>
          <AdminField label="系统内置">
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)]">
              <input name="is_system" type="checkbox" disabled={Boolean(modalItem)} defaultChecked={modalItem?.is_system ?? false} className="h-4 w-4 accent-blue-500" />
              {modalItem ? "编辑时不可修改" : "设为系统内置"}
            </label>
          </AdminField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
          </div>
        </form>
      </AdminModal>

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
