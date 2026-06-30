"use client";

import { Edit, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminField } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  type TableSettings,
  useTableSettings,
} from "@/components/admin/DataTableToolbar";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { adminRequest } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import type { NavigationItem } from "@/types/blog";

type NavModalState = { mode: "create" | "edit"; item?: NavigationItem };

const settingsKey = "admin-table-settings:site-navigation";
const columnOptions = [
  { key: "label", label: "名称", locked: true },
  { key: "href", label: "链接" },
  { key: "target", label: "打开方式" },
  { key: "sort", label: "排序" },
  { key: "status", label: "状态" },
  { key: "updatedAt", label: "更新时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultSettings: TableSettings = {
  bordered: false,
  striped: true,
  headerBackground: false,
  density: "default",
  visibleColumns: columnOptions.map((column) => column.key),
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

export default function AdminNavigationPage() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [modal, setModal] = useState<NavModalState | null>(null);
  const [deleteItem, setDeleteItem] = useState<NavigationItem | null>(null);
  const [target, setTarget] = useState("self");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useTableSettings(
    settingsKey,
    defaultSettings,
    columnOptions,
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await adminRequest<NavigationItem[]>("/admin/navigation"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "导航配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(next: NavModalState) {
    setTarget(next.item?.target ?? "self");
    setModalError("");
    setModal(next);
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setModalError("");
  }

  async function saveNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const form = new FormData(event.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const href = String(form.get("href") ?? "").trim();
    if (!label || !href) {
      setModalError("名称和链接不能为空");
      return;
    }
    const payload = {
      label,
      href,
      icon: String(form.get("icon") ?? "").trim() || null,
      sort_order: Number(form.get("sort_order") || 0),
      target,
      is_visible: form.get("is_visible") === "on",
    };
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      if (modal.item) {
        await adminRequest(`/admin/navigation/${modal.item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("导航项已保存。");
      } else {
        await adminRequest("/admin/navigation", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("导航项已新增。");
      }
      setModal(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(item: NavigationItem) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/navigation/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_visible: !item.is_visible }),
      });
      setNotice(item.is_visible ? "导航项已隐藏。" : "导航项已显示。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminRequest(`/admin/navigation/${deleteItem.id}`, {
        method: "DELETE",
      });
      setDeleteItem(null);
      setNotice("导航项已删除。");
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<Array<AdminDataTableColumn<NavigationItem>>>(
    () => [
      {
        key: "label",
        title: "名称",
        width: 150,
        hidden: !settings.visibleColumns.includes("label"),
        render: (item) => (
          <span className="font-black text-foreground">{item.label}</span>
        ),
      },
      {
        key: "href",
        title: "链接",
        minWidth: 260,
        ellipsis: true,
        hidden: !settings.visibleColumns.includes("href"),
        render: (item) => item.href,
      },
      {
        key: "target",
        title: "打开方式",
        width: 120,
        hidden: !settings.visibleColumns.includes("target"),
        render: (item) => (item.target === "blank" ? "新窗口" : "当前页"),
      },
      {
        key: "sort",
        title: "排序",
        width: 90,
        hidden: !settings.visibleColumns.includes("sort"),
        render: (item) => item.sort_order,
      },
      {
        key: "status",
        title: "状态",
        width: 100,
        hidden: !settings.visibleColumns.includes("status"),
        render: (item) => (
          <StatusTag
            status={item.is_visible}
            label={item.is_visible ? "显示" : "隐藏"}
          />
        ),
      },
      {
        key: "updatedAt",
        title: "更新时间",
        width: 150,
        hidden: !settings.visibleColumns.includes("updatedAt"),
        render: (item) => formatDate(item.updated_at),
      },
      {
        key: "actions",
        title: "操作",
        width: 150,
        align: "center",
        hidden: !settings.visibleColumns.includes("actions"),
        render: (item) => (
          <RowActions
            actions={[
              {
                key: "visible",
                label: item.is_visible ? "隐藏" : "显示",
                icon: item.is_visible ? (
                  <EyeOff className={rowActionIconClass} />
                ) : (
                  <Eye className={rowActionIconClass} />
                ),
                variant: "success",
                onClick: () => void toggleVisible(item),
              },
              {
                key: "edit",
                label: "编辑",
                icon: <Edit className={rowActionIconClass} />,
                variant: "edit",
                onClick: () => openModal({ mode: "edit", item }),
              },
              {
                key: "delete",
                label: "删除",
                icon: <Trash2 className={rowActionIconClass} />,
                variant: "delete",
                onClick: () => setDeleteItem(item),
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
      title="导航配置"
      description="管理前台导航入口、打开方式和显示状态。"
      actions={
        <Button type="button" onClick={() => openModal({ mode: "create" })}>
          <Plus className="size-4" aria-hidden="true" />
          新增
        </Button>
      }
    >
      {error ? <Notice variant="error">{error}</Notice> : null}
      {notice ? <Notice variant="success">{notice}</Notice> : null}

      <AdminDataTable
        columns={columns}
        data={items}
        rowKey="id"
        settings={settings}
        loading={loading}
        emptyText="暂无导航数据"
        minWidth={860}
        toolbar={
          <AdminTableToolbar
            settings={settings}
            onSettingsChange={setSettings}
            columns={columnOptions}
            onRefresh={() => void load()}
            refreshing={loading}
          />
        }
      />

      <AdminModal
        open={Boolean(modal)}
        title={modal?.mode === "edit" ? "编辑导航" : "新增导航"}
        size="md"
        onClose={closeModal}
      >
        <form
          key={modal?.item?.id ?? "new"}
          onSubmit={saveNavigation}
          className="grid gap-4"
        >
          <ModalError message={modalError} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="名称 *">
              <Input
                name="label"
                required
                defaultValue={modal?.item?.label ?? ""}
              />
            </AdminField>
            <AdminField label="链接 *">
              <Input
                name="href"
                required
                defaultValue={modal?.item?.href ?? ""}
              />
            </AdminField>
            <AdminField label="排序">
              <Input
                name="sort_order"
                type="number"
                defaultValue={modal?.item?.sort_order ?? 0}
              />
            </AdminField>
            <AdminField label="打开方式">
              <CustomSelect
                name="target"
                value={target}
                onChange={setTarget}
                options={[
                  { label: "当前页", value: "self" },
                  { label: "新窗口", value: "blank" },
                ]}
              />
            </AdminField>
            <AdminField label="图标标识">
              <Input name="icon" defaultValue={modal?.item?.icon ?? ""} />
            </AdminField>
            <Checkbox
              name="is_visible"
              label="前台显示"
              defaultChecked={modal?.item?.is_visible ?? true}
              className="self-end"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? "提交中..." : "确定"}
            </Button>
          </div>
        </form>
      </AdminModal>

      <DeleteConfirmDialog
        open={Boolean(deleteItem)}
        description={
          deleteItem
            ? `确定删除导航「${deleteItem.label}」吗？`
            : "确定删除该导航吗？"
        }
        error={deleteError}
        loading={deleting}
        onClose={() => !deleting && setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPage>
  );
}
