"use client";

import { Edit, Plus, Trash2, Upload } from "lucide-react";
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
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import {
  UploadProgress,
  type UploadProgressItem,
} from "@/components/admin/UploadProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminRequest, adminUpload } from "@/lib/auth";
import { cn, formatDate, getAssetUrl } from "@/lib/utils";
import type { FriendLink, MediaAsset, Paginated } from "@/types/blog";

type LinkModalState = { mode: "create" | "edit"; item?: FriendLink };
type DeleteState = { ids: number[]; name?: string } | null;

const emptyPage: Paginated<FriendLink> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 1,
};
const pageSizeOptions = [10, 20, 50];
const settingsKey = "admin-table-settings:site-links";
const linkColumnOptions = [
  { key: "avatar", label: "头像" },
  { key: "name", label: "名称", locked: true },
  { key: "url", label: "地址" },
  { key: "description", label: "简介" },
  { key: "email", label: "邮箱" },
  { key: "sortOrder", label: "排序" },
  { key: "status", label: "状态" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultSettings: TableSettings = {
  bordered: true,
  striped: true,
  headerBackground: true,
  density: "default",
  visibleColumns: linkColumnOptions.map((column) => column.key),
};
const linkStatusMap = {
  active: { label: "上架", variant: "success" as const },
  inactive: { label: "下架", variant: "danger" as const },
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
          ? "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]"
          : "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]",
      )}
    >
      {children}
    </p>
  );
}

function AvatarThumb({ item }: { item: FriendLink }) {
  return (
    <div className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[var(--color-bg-muted)] text-sm font-black text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
      {item.avatar ? (
        <img
          src={getAssetUrl(item.avatar)}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        item.name.slice(0, 1)
      )}
    </div>
  );
}

export default function AdminLinksPage() {
  const [data, setData] = useState(emptyPage);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<LinkModalState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [modalStatus, setModalStatus] = useState("active");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressItem | null>(null);
  const [settings, setSettings] = useTableSettings(
    settingsKey,
    defaultSettings,
    linkColumnOptions,
  );

  async function load(
    nextPage = page,
    nextSize = pageSize,
    nextName = appliedName,
    nextStatus = appliedStatus,
  ) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        page_size: String(nextSize),
      });
      if (nextName.trim()) query.set("name", nextName.trim());
      if (nextStatus) query.set("status", nextStatus);
      const result = await adminRequest<Paginated<FriendLink>>(
        `/admin/links?${query.toString()}`,
      );
      setData(result);
      setPage(result.page);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "友链列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    adminRequest<MediaAsset[]>("/admin/media?usage_type=link_avatar")
      .then((items) => setMedia(items.filter((item) => item.is_active)))
      .catch(() => setMedia([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, appliedName, appliedStatus]);

  function query(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedName(name.trim());
    setAppliedStatus(status);
    setPage(1);
  }

  function reset() {
    setName("");
    setStatus("");
    setAppliedName("");
    setAppliedStatus("");
    setPage(1);
  }

  function openModal(next: LinkModalState) {
    setAvatarUrl(next.item?.avatar ?? "");
    setModalStatus(next.item?.status ?? "active");
    setUploadProgress(null);
    setModalError("");
    setModal(next);
  }

  function closeModal() {
    if (saving || uploadingAvatar) return;
    setModal(null);
    setModalError("");
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setUploadProgress({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });
    const form = new FormData();
    form.append("file", file);
    form.append("usage_type", "link_avatar");
    try {
      const asset = await adminUpload<MediaAsset>(
        "/admin/uploads/image",
        form,
        {
          onProgress: (progress) =>
            setUploadProgress({
              fileName: file.name,
              progress,
              status: "uploading",
            }),
        },
      );
      setAvatarUrl(asset.url);
      setMedia((current) => [asset, ...current]);
      setUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "头像上传失败";
      setModalError(message);
      setUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "error",
        error: message,
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const linkName = String(form.get("name") ?? "").trim();
    const url = String(form.get("url") ?? "").trim();
    if (!linkName || !/^https?:\/\//.test(url)) {
      setModalError("请填写友链名称和有效的 http / https 地址");
      return;
    }
    const payload = {
      name: linkName,
      url,
      avatar: avatarUrl || null,
      description: String(form.get("description") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      status: modalStatus,
    };
    setSaving(true);
    setModalError("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/links/${modal.item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("友链已保存。");
      } else {
        await adminRequest("/admin/links", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("友链已新增。");
      }
      setModal(null);
      await load(modal.item ? data.page : 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteState) return;
    const nextPage =
      data.items.length <= deleteState.ids.length && data.page > 1
        ? data.page - 1
        : data.page;
    setDeleting(true);
    setDeleteError("");
    try {
      if (deleteState.ids.length === 1) {
        await adminRequest(`/admin/links/${deleteState.ids[0]}`, {
          method: "DELETE",
        });
      } else {
        await adminRequest("/admin/links/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids: deleteState.ids }),
        });
      }
      setDeleteState(null);
      setNotice("友链已删除，列表已刷新。");
      await load(nextPage);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelected(item: FriendLink, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  }

  function toggleCurrentPage(checked: boolean) {
    setSelected(
      checked ? new Set(data.items.map((item) => item.id)) : new Set(),
    );
  }

  function goToPage(value: number) {
    setPage(Math.min(Math.max(value, 1), Math.max(data.pages, 1)));
  }

  const columns = useMemo<Array<AdminDataTableColumn<FriendLink>>>(
    () => [
      {
        key: "avatar",
        title: "头像",
        width: 96,
        align: "center",
        hidden: !settings.visibleColumns.includes("avatar"),
        render: (item) => <AvatarThumb item={item} />,
      },
      {
        key: "name",
        title: "名称",
        width: 160,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("name"),
        render: (item) => (
          <span className="font-black text-[var(--color-text)]">
            {item.name}
          </span>
        ),
      },
      {
        key: "url",
        title: "地址",
        width: 220,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("url"),
        render: (item) => item.url,
      },
      {
        key: "description",
        title: "简介",
        minWidth: 220,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("description"),
        render: (item) => item.description || "-",
      },
      {
        key: "email",
        title: "邮箱",
        width: 190,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("email"),
        render: (item) => item.email || "-",
      },
      {
        key: "sortOrder",
        title: "排序",
        width: 90,
        hidden: !settings.visibleColumns.includes("sortOrder"),
        render: (item) => (
          <span className="font-bold text-[var(--color-text-muted)]">
            {item.sort_order}
          </span>
        ),
      },
      {
        key: "status",
        title: "状态",
        width: 100,
        hidden: !settings.visibleColumns.includes("status"),
        render: (item) => (
          <StatusTag status={item.status} map={linkStatusMap} />
        ),
      },
      {
        key: "createdAt",
        title: "创建时间",
        width: 180,
        hidden: !settings.visibleColumns.includes("createdAt"),
        render: (item) => (
          <span className="text-[var(--color-text-muted)]">
            {formatDate(item.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: 130,
        align: "center",
        hidden: !settings.visibleColumns.includes("actions"),
        render: (item) => (
          <RowActions
            actions={[
              {
                key: "edit",
                label: "编辑",
                icon: (
                  <Edit className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "edit",
                onClick: () => openModal({ mode: "edit", item }),
              },
              {
                key: "delete",
                label: "删除",
                icon: (
                  <Trash2 className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "delete",
                onClick: () =>
                  setDeleteState({ ids: [item.id], name: item.name }),
              },
            ]}
          />
        ),
      },
    ],
    [settings.visibleColumns],
  );

  return (
    <AdminPage
      title="友链管理"
      description="管理前台友链展示、头像和上架状态。"
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminSearchForm onSubmit={query} onReset={reset} loading={loading}>
        <Input
          label="友链名称"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="请输入友链名称"
        />
        <Select
          label="状态"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { label: "全部", value: "" },
            { label: "上架", value: "active" },
            { label: "下架", value: "inactive" },
          ]}
        />
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={data.items}
        rowKey="id"
        settings={settings}
        loading={loading}
        emptyText="暂无友链数据"
        minWidth={1280}
        selectedRowKeys={selected}
        allSelected={
          data.items.length > 0 &&
          data.items.every((item) => selected.has(item.id))
        }
        onSelectRow={toggleSelected}
        onSelectAll={toggleCurrentPage}
        getCheckboxLabel={(item) => `选择 ${item.name}`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => openModal({ mode: "create" })}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                新增
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!selected.size}
                onClick={() => setDeleteState({ ids: Array.from(selected) })}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                批量删除
              </Button>
            </div>
            <AdminTableToolbar
              settings={settings}
              onSettingsChange={setSettings}
              columns={linkColumnOptions}
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
            page={data.page || page}
            totalPages={data.pages}
            total={data.total}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            loading={loading}
            onPageChange={goToPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        }
      />

      <AdminModal
        open={Boolean(modal)}
        title={modal?.mode === "edit" ? "编辑友链" : "新增友链"}
        size="md"
        onClose={closeModal}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={saving || uploadingAvatar}
            >
              取消
            </Button>
            <Button
              type="submit"
              form="link-form"
              loading={saving}
              disabled={uploadingAvatar}
            >
              确定
            </Button>
          </>
        }
      >
        <form
          id="link-form"
          key={modal?.item?.id ?? "new"}
          onSubmit={save}
          className="grid gap-4"
        >
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="name"
              label="友链名称"
              required
              defaultValue={modal?.item?.name ?? ""}
              placeholder="请输入友链名称"
            />
            <Input
              name="url"
              label="友链地址"
              required
              type="url"
              defaultValue={modal?.item?.url ?? ""}
              placeholder="https://"
            />
            <Input
              name="email"
              label="友链邮箱"
              type="email"
              defaultValue={modal?.item?.email ?? ""}
              placeholder="name@example.com"
            />
            <Input
              name="sort_order"
              label="排序"
              type="number"
              defaultValue={modal?.item?.sort_order ?? 0}
            />
            <Select
              label="状态"
              value={modalStatus}
              onChange={(event) => setModalStatus(event.target.value)}
              options={[
                { label: "上架", value: "active" },
                { label: "下架", value: "inactive" },
              ]}
            />
            <AdminField label="从文件列表选择头像">
              <CustomSelect
                value={avatarUrl}
                onChange={setAvatarUrl}
                searchable
                options={[
                  { label: "未选择", value: "" },
                  ...media.map((asset) => ({
                    label: asset.original_name,
                    value: asset.url,
                    description: `ID ${asset.id}`,
                    thumbnail: getAssetUrl(asset.url),
                  })),
                ]}
              />
            </AdminField>
          </div>
          <AdminField label="头像 URL">
            <div className="grid gap-3">
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="可输入 URL、上传或从文件列表选择"
              />
              <label className="interactive inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md bg-[var(--color-bg-muted)] px-3 py-2 text-sm font-bold text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {uploadingAvatar ? "上传中..." : "上传头像"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingAvatar}
                  onChange={(event) =>
                    void uploadAvatar(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <UploadProgress item={uploadProgress} />
              {avatarUrl ? (
                <img
                  src={getAssetUrl(avatarUrl)}
                  alt="头像预览"
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                />
              ) : null}
            </div>
          </AdminField>
          <Textarea
            name="description"
            label="友链简介"
            rows={3}
            defaultValue={modal?.item?.description ?? ""}
          />
        </form>
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteState)}
        description={
          deleteState?.name
            ? `确定删除友链「${deleteState.name}」吗？`
            : `确定删除选中的 ${deleteState?.ids.length ?? 0} 条友链吗？`
        }
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteState(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPage>
  );
}
