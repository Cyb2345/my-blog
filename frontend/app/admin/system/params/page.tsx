"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminSearchForm } from "@/components/admin/AdminSearchForm";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  type TableSettings,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { ParamValueField } from "@/components/admin/ParamValueField";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { readAdminPageCache, writeAdminPageCache } from "@/lib/adminPageCache";
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

const emptyPage: ParamPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 1,
};
const emptyFilters: ParamFilters = { name: "", key: "", is_system: "" };
const pageSizeOptions = [10, 20, 50];
const systemFilterOptions = [
  { label: "全部", value: "" },
  { label: "是", value: "true" },
  { label: "否", value: "false" },
];
const paramTableSettingsKey = "admin-table-settings:system-params";
const paramPageCacheKey = "admin-page-cache:system-params";
const paramColumnOptions = [
  { key: "name", label: "参数名称", locked: true },
  { key: "key", label: "参数键名" },
  { key: "value", label: "参数键值" },
  { key: "effect", label: "生效状态" },
  { key: "isSystem", label: "系统内置" },
  { key: "createdAt", label: "创建时间" },
  { key: "updatedAt", label: "更新时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultParamTableSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: paramColumnOptions.map((column) => column.key),
};

const hotUpdateKeys = new Set([
  "sys_captcha_type",
  "sys_mfa_enabled",
  "password_error_count",
  "password_lock_minutes",
  "login_rate_limit_per_minute",
  "captcha_rate_limit_per_minute",
  "mfa_rate_limit_per_minute",
  "max_upload_image_size_mb",
  "default_theme",
  "open_message",
]);
const restartKeys = new Set<string>();
const frontendReservedKeys = new Set<string>();
const featureReservedKeys = new Set(["open_comment"]);

function normalizePage(
  data: ParamPage | SystemParam[],
  page: number,
  pageSize: number,
): ParamPage {
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
  return [
    "mfa_secret",
    "password_hash",
    "access_token",
    "refresh_token",
    "api_token",
    "jwt_token",
  ].some((part) => normalized.includes(part));
}

function getEffectHint(key: string) {
  if (hotUpdateKeys.has(key))
    return {
      status: "hot",
      label: "立即生效",
      className:
        "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_24%,transparent)] dark:bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] dark:text-[var(--color-success)] dark:ring-[color-mix(in_srgb,var(--color-success)_24%,transparent)]",
    };
  if (restartKeys.has(key))
    return {
      status: "restart",
      label: "重启后生效",
      className:
        "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20",
    };
  if (frontendReservedKeys.has(key))
    return {
      status: "frontend",
      label: "需前端接入",
      className:
        "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/20",
    };
  if (featureReservedKeys.has(key))
    return {
      status: "feature",
      label: "预留配置",
      className:
        "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-[color-mix(in_srgb,var(--primary)_34%,transparent)] dark:text-white dark:ring-[color-mix(in_srgb,var(--primary)_58%,transparent)]",
    };
  return {
    status: "default",
    label: "保存后生效",
    className: "bg-muted text-muted-foreground ring-border",
  };
}

const effectStatusMap = {
  hot: { label: "立即生效", variant: "success" },
  restart: { label: "重启后生效", variant: "warning" },
  frontend: { label: "需前端接入", variant: "primary" },
  feature: { label: "预留配置", variant: "info" },
  default: { label: "保存后生效", variant: "neutral" },
} as const;

function displayParamValue(param: SystemParam) {
  if (param.key === "sys_captcha_type") {
    return (
      {
        none: "关闭验证码",
        image: "图片验证码",
        slider: "滑块验证码",
        turnstile: "Cloudflare Turnstile",
      }[param.value] ?? param.value
    );
  }
  if (["sys_mfa_enabled", "open_comment", "open_message"].includes(param.key)) {
    return ["1", "true", "yes", "y", "on"].includes(param.value.toLowerCase())
      ? "开启"
      : "关闭";
  }
  if (param.key === "default_theme") {
    return (
      { light: "浅色模式", dark: "深色模式", system: "跟随系统" }[
        param.value
      ] ?? param.value
    );
  }
  return param.value || "-";
}

export default function AdminParamsPage() {
  const [pageData, setPageData] = useState<ParamPage>(
    () => readAdminPageCache<ParamPage>(paramPageCacheKey) ?? emptyPage,
  );
  const [tableSettings, setTableSettings] = useTableSettings(
    paramTableSettingsKey,
    defaultParamTableSettings,
    paramColumnOptions,
  );
  const [filters, setFilters] = useState<ParamFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<ParamFilters>(emptyFilters);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
      const query = new URLSearchParams({
        page: String(currentPage),
        page_size: String(currentPageSize),
      });
      if (currentFilters.name.trim())
        query.set("name", currentFilters.name.trim());
      if (currentFilters.key.trim())
        query.set("key", currentFilters.key.trim());
      if (currentFilters.is_system)
        query.set("is_system", currentFilters.is_system);
      const data = await adminRequest<ParamPage | SystemParam[]>(
        `/admin/system/params?${query.toString()}`,
      );
      const normalized = normalizePage(data, currentPage, currentPageSize);
      setPageData(normalized);
      writeAdminPageCache(paramPageCacheKey, normalized);
      setPageNumber(normalized.page);
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
        setNotice(
          `${getEffectHint(target.key).label === "立即生效" ? "修改成功，已生效。" : `修改成功，${getEffectHint(target.key).label}。`}`,
        );
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
    const selectedParams = pageData.items.filter((item) =>
      selectedIds.has(item.id),
    );
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
    if (deleteState.type === "single")
      return `确定删除参数「${deleteState.label}」吗？`;
    return "确定删除选中的参数吗？";
  }

  async function confirmDelete() {
    if (!deleteState || deleting) return;
    const ids = deleteState.ids;
    const nextPage =
      pageData.items.length <= ids.length && pageData.page > 1
        ? pageData.page - 1
        : pageData.page;
    setDeleting(true);
    setDeleteError("");
    setError("");
    setNotice("");
    try {
      if (deleteState.type === "single" && ids.length === 1) {
        await adminRequest(`/admin/system/params/${ids[0]}`, {
          method: "DELETE",
        });
      } else {
        await adminRequest("/admin/system/params/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
      }
      setDeleteState(null);
      setNotice(
        deleteState.type === "single"
          ? "参数已删除，列表已刷新。"
          : "选中参数已删除，列表已刷新。",
      );
      await load(nextPage, pageSize, appliedFilters);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const modalItem = modal?.item;
  const modalSensitive = modalItem ? isSensitiveParamKey(modalItem.key) : false;
  const modalHint = getEffectHint(modalItem?.key ?? "");
  const columns = useMemo<Array<AdminDataTableColumn<SystemParam>>>(
    () => [
      {
        key: "name",
        title: "参数名称",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("name"),
        ellipsis: true,
        render: (param) => (
          <span className="font-black text-foreground">{param.name}</span>
        ),
      },
      {
        key: "key",
        title: "参数键名",
        width: 220,
        hidden: !tableSettings.visibleColumns.includes("key"),
        ellipsis: true,
        render: (param) => (
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {param.key}
          </span>
        ),
      },
      {
        key: "value",
        title: "参数键值",
        width: 240,
        hidden: !tableSettings.visibleColumns.includes("value"),
        ellipsis: true,
        render: (param) => displayParamValue(param),
      },
      {
        key: "effect",
        title: "生效状态",
        width: 140,
        hidden: !tableSettings.visibleColumns.includes("effect"),
        render: (param) => {
          const hint = getEffectHint(param.key);
          return (
            <StatusTag
              status={hint.status}
              label={hint.label}
              map={effectStatusMap}
            />
          );
        },
      },
      {
        key: "isSystem",
        title: "系统内置",
        width: 110,
        hidden: !tableSettings.visibleColumns.includes("isSystem"),
        render: (param) => (
          <StatusTag
            status={param.is_system}
            label={param.is_system ? "是" : "否"}
          />
        ),
      },
      {
        key: "createdAt",
        title: "创建时间",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("createdAt"),
        render: (param) => formatDateTime(param.created_at),
      },
      {
        key: "updatedAt",
        title: "更新时间",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("updatedAt"),
        render: (param) => formatDateTime(param.updated_at),
      },
      {
        key: "actions",
        title: "操作",
        width: 140,
        align: "center",
        sticky: "right",
        hidden: !tableSettings.visibleColumns.includes("actions"),
        render: (param) => (
          <RowActions
            actions={[
              {
                key: "edit",
                label: "编辑",
                icon: (
                  <Edit className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "edit",
                onClick: () => openModal({ mode: "edit", item: param }),
              },
              {
                key: "delete",
                label: param.is_system ? "系统内置参数不允许删除" : "删除",
                icon: (
                  <Trash2 className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "delete",
                disabled: param.is_system,
                onClick: () => openSingleDelete(param),
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
      title="参数管理"
      description="维护后台运行参数、功能开关和前端可读配置。"
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => openModal({ mode: "create" })}
          >
            <Plus className="size-4" aria-hidden="true" />
            新增
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!selectedIds.size || loading}
            onClick={openBatchDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            批量删除
          </Button>
        </>
      }
    >
      {error ? (
        <p className="notice-pop mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="notice-pop mb-4 rounded-md bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] px-3 py-2 text-sm font-bold text-[var(--color-success)] dark:text-[var(--color-success)]">
          {notice}
        </p>
      ) : null}

      <AdminSearchForm
        onSubmit={handleQuery}
        onReset={handleReset}
        loading={loading}
      >
        <Input
          label="参数名称"
          value={filters.name}
          onChange={(event) =>
            setFilters((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="请输入参数名称"
        />
        <Input
          label="参数键名"
          value={filters.key}
          onChange={(event) =>
            setFilters((current) => ({ ...current, key: event.target.value }))
          }
          placeholder="请输入参数键名"
        />
        <AdminField label="系统内置">
          <CustomSelect
            value={filters.is_system}
            onChange={(value) =>
              setFilters((current) => ({ ...current, is_system: value }))
            }
            options={systemFilterOptions}
          />
        </AdminField>
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={pageData.items}
        rowKey="id"
        settings={tableSettings}
        loading={loading}
        emptyText="暂无参数"
        minWidth={1320}
        selectedRowKeys={selectedIds}
        allSelected={allCurrentPageSelected}
        onSelectRow={(param) => toggleSelect(param.id)}
        onSelectAll={toggleCurrentPage}
        getCheckboxLabel={(param) => `选择参数 ${param.name}`}
        toolbar={
          <AdminTableToolbar
            settings={tableSettings}
            onSettingsChange={setTableSettings}
            columns={paramColumnOptions}
            onRefresh={() => void load(pageData.page, pageSize, appliedFilters)}
            refreshing={loading}
          />
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

      <AdminModal
        open={Boolean(modal)}
        title={modal?.mode === "edit" ? "编辑参数" : "新增参数"}
        size="md"
        onClose={closeModal}
      >
        <form
          key={modalItem?.id ?? "new"}
          onSubmit={saveParam}
          className="grid gap-4"
        >
          <ModalError message={modalError} />
          {modal?.mode === "edit" ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">
              当前参数：
              <span
                className={cn(
                  "ml-1 rounded-md px-2 py-1 ring-1",
                  modalHint.className,
                )}
              >
                {modalHint.label}
              </span>
              {modalSensitive ? (
                <span className="ml-2 text-destructive ">
                  敏感参数不会回显原始值，留空表示不修改。
                </span>
              ) : null}
            </p>
          ) : null}
          <AdminField label="参数名称 *">
            <Input
              name="name"
              required
              defaultValue={modalItem?.name ?? ""}
              placeholder="请输入参数名称"
            />
          </AdminField>
          <AdminField label="参数键名 *">
            <Input
              name="key"
              required
              readOnly={Boolean(modalItem)}
              defaultValue={modalItem?.key ?? ""}
              placeholder="请输入参数键名"
              className={cn(modalItem && "cursor-not-allowed opacity-75")}
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
            <Checkbox
              name="is_system"
              disabled={Boolean(modalItem)}
              defaultChecked={modalItem?.is_system ?? false}
              label={modalItem ? "编辑时不可修改" : "设为系统内置"}
              className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-foreground"
            />
          </AdminField>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "提交中..." : "提交"}
            </Button>
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
    </AdminPage>
  );
}
