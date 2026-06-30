"use client";

import {
  Check,
  ChevronDown,
  Edit,
  KeyRound,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import { adminRequest, adminUpload } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { AdminRole, AdminUser, MediaAsset, Paginated } from "@/types/blog";

type UserPage = Paginated<AdminUser>;
type UserFilters = {
  username: string;
  login_method: string;
  status: string;
};

type MfaSetup = {
  qr_code_data_url: string;
};

type UserModalState =
  | { type: "user"; mode: "create" | "edit"; user?: AdminUser }
  | { type: "password"; user: AdminUser }
  | { type: "mfa"; user: AdminUser };

type DeleteState =
  | { type: "single"; ids: number[]; label: string }
  | { type: "batch"; ids: number[] }
  | null;

const emptyPage: UserPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 1,
};
const emptyFilters: UserFilters = {
  username: "",
  login_method: "",
  status: "",
};
const pageSizeOptions = [10, 20, 50];
const userTableSettingsKey = "admin-table-settings:system-users";
const userColumnOptions = [
  { key: "avatar", label: "头像" },
  { key: "username", label: "用户名", locked: true },
  { key: "nickname", label: "昵称" },
  { key: "loginMethod", label: "登录方式" },
  { key: "loginIp", label: "登录 IP" },
  { key: "loginLocation", label: "登录地址" },
  { key: "status", label: "状态" },
  { key: "lastLoginAt", label: "最后登录时间" },
  { key: "createdAt", label: "创建时间" },
  { key: "actions", label: "操作", locked: true },
];
const defaultUserTableSettings: TableSettings = {
  bordered: false,
  striped: true,
  headerBackground: false,
  density: "default",
  visibleColumns: userColumnOptions.map((column) => column.key),
};

const loginMethodOptions = [{ label: "本地账号", value: "local" }];
const statusOptions = [
  { label: "启用", value: "active" },
  { label: "禁用", value: "inactive" },
];

function normalizePage(
  data: UserPage | AdminUser[],
  page: number,
  pageSize: number,
): UserPage {
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

function validatePassword(password: string) {
  if (password.length < 8) return "密码长度至少 8 位";
  if (/^\d+$/.test(password)) return "密码不能全部为数字";
  if (/^[A-Za-z]+$/.test(password)) return "密码不能全部为字母";
  return "";
}

function roleFallbackLabel(code?: string | null) {
  if (!code) return "-";
  if (code === "admin") return "管理员";
  if (code === "editor") return "编辑者";
  return code;
}

function getLoginMethod(user: AdminUser) {
  return user.login_method || "local";
}

function getLoginIp(user: AdminUser) {
  return user.last_login_ip || user.login_ip || "-";
}

function getLoginLocation(user: AdminUser) {
  return user.last_login_location || user.login_location || "-";
}

function UserAvatar({ user }: { user: AdminUser }) {
  const [failed, setFailed] = useState(false);
  const label = (user.nickname || user.username || "U")
    .slice(0, 1)
    .toUpperCase();
  if (!user.avatar || failed) {
    return (
      <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-black text-muted-foreground ring-1 ring-border">
        {label}
      </span>
    );
  }
  return (
    <img
      src={getAssetUrl(user.avatar)}
      alt={`${user.username} 头像`}
      className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
      onError={() => setFailed(true)}
    />
  );
}

function RoleSelector({
  roles,
  value,
  error,
  loading,
  onChange,
}: {
  roles: AdminRole[];
  value: string;
  error?: string;
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selectedRole = roles.find((role) => role.code === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-semibold text-foreground outline-none focus:border-primary focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)]",
          open && "ring-4 ring-[var(--admin-focus-ring)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {selectedRole || value ? (
            <span className="max-w-full truncate rounded-md bg-accent px-2 py-1 text-xs font-black text-primary dark:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]">
              {selectedRole?.name ?? roleFallbackLabel(value)}
            </span>
          ) : (
            <span className="text-muted-foreground">请选择角色</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[60] max-h-60 origin-top overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-xl transition-all duration-200",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
        role="listbox"
      >
        {loading ? (
          <p className="px-3 py-2 text-sm font-bold text-muted-foreground">
            角色加载中...
          </p>
        ) : null}
        {!loading && error ? (
          <p className="px-3 py-2 text-sm font-bold text-destructive ">
            {error}
          </p>
        ) : null}
        {!loading && !error && !roles.length ? (
          <p className="px-3 py-2 text-sm font-bold text-muted-foreground">
            暂无角色
          </p>
        ) : null}
        {roles.map((role) => {
          const active = role.code === value;
          return (
            <button
              key={role.code}
              type="button"
              onClick={() => {
                onChange(role.code);
                setOpen(false);
              }}
              className={cn(
                "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-muted dark:hover:bg-[var(--hover)]",
                active
                  ? "bg-accent text-primary dark:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]"
                  : "text-muted-foreground",
              )}
              role="option"
              aria-selected={active}
            >
              <span className="truncate">{role.name}</span>
              {active ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwitchField({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground">
      <span>{children}</span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-blue-500"
      />
    </label>
  );
}

export default function AdminUsersPage() {
  const [pageData, setPageData] = useState<UserPage>(emptyPage);
  const [tableSettings, setTableSettings] = useTableSettings(
    userTableSettingsKey,
    defaultUserTableSettings,
    userColumnOptions,
  );
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<UserFilters>(emptyFilters);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [roleError, setRoleError] = useState("");
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [modal, setModal] = useState<UserModalState | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] =
    useState<UploadProgressItem | null>(null);
  const [modalStatus, setModalStatus] = useState("active");

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
      if (currentFilters.username.trim())
        params.set("username", currentFilters.username.trim());
      if (currentFilters.login_method)
        params.set("login_method", currentFilters.login_method);
      if (currentFilters.status) params.set("status", currentFilters.status);
      const data = await adminRequest<UserPage | AdminUser[]>(
        `/admin/users?${params.toString()}`,
      );
      const normalized = normalizePage(data, currentPage, currentPageSize);
      setPageData(normalized);
      setPageNumber(normalized.page);
      setJumpPage(String(normalized.page || 1));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "用户列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    setRolesLoading(true);
    setRoleError("");
    try {
      const data = await adminRequest<AdminRole[]>("/admin/system/roles");
      setRoles(data);
      setSelectedRole((current) => current || data[0]?.code || "");
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "角色加载失败");
    } finally {
      setRolesLoading(false);
    }
  }

  useEffect(() => {
    void load(pageNumber, pageSize, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, appliedFilters]);

  useEffect(() => {
    void loadRoles();
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

  function goToPage(nextPage: number) {
    const totalPages = Math.max(pageData.pages, 1);
    setPageNumber(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleJump() {
    const target = Number(jumpPage || pageData.page);
    if (!Number.isFinite(target)) return;
    goToPage(target);
  }

  function openUserModal(mode: "create" | "edit", user?: AdminUser) {
    setModalError("");
    setNotice("");
    setAvatarUrl(user?.avatar ?? "");
    setAvatarUploadProgress(null);
    setSelectedRole(user?.role ?? roles[0]?.code ?? "");
    setModalStatus(user?.is_active === false ? "inactive" : "active");
    setModal({ type: "user", mode, user });
  }

  function openPasswordModal(user: AdminUser) {
    setModalError("");
    setNotice("");
    setModal({ type: "password", user });
  }

  function closeModal() {
    if (saving || uploadingAvatar) return;
    setModal(null);
    setModalError("");
    setMfaSetup(null);
    setAvatarUrl("");
    setAvatarUploadProgress(null);
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarUploadProgress({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });
    setModalError("");
    setNotice("");
    const payload = new FormData();
    payload.append("file", file);
    payload.append("usage_type", "avatar");
    try {
      const asset = await adminUpload<MediaAsset>(
        "/admin/uploads/image",
        payload,
        {
          onProgress: (progress) =>
            setAvatarUploadProgress({
              fileName: file.name,
              progress,
              status: "uploading",
            }),
        },
      );
      setAvatarUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "success",
      });
      setAvatarUrl(asset.url);
      setNotice("用户头像已上传。");
    } catch (err) {
      const message = err instanceof Error ? err.message : "头像上传失败";
      setModalError(message);
      setAvatarUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "error",
        error: message,
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function setupMfaForUser(user: AdminUser, message: string) {
    const setup = await adminRequest<MfaSetup>(
      `/admin/users/${user.id}/mfa/setup`,
      { method: "POST" },
    );
    setMfaSetup(setup);
    setModal({ type: "mfa", user });
    setNotice(message);
  }

  async function handleMfaRebind(user: AdminUser) {
    if (saving) return;
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      await setupMfaForUser(
        user,
        "MFA 绑定二维码已生成，请扫码后输入动态码验证。",
      );
      await load(pageNumber, pageSize, appliedFilters);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "MFA 设置失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "user") return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const username = String(form.get("username") ?? "").trim();
    const nickname = String(form.get("nickname") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const status = String(form.get("status") ?? "active");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    const mfaEnabled = form.get("mfa_enabled") === "on";

    if (!username) {
      setModalError("用户名不能为空");
      return;
    }
    if (!nickname) {
      setModalError("昵称不能为空");
      return;
    }
    if (!selectedRole) {
      setModalError("请选择角色");
      return;
    }
    if (!status) {
      setModalError("请选择状态");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setModalError("邮箱格式不正确");
      return;
    }
    if (modal.mode === "create") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setModalError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setModalError("两次输入的密码不一致");
        return;
      }
    }

    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      const payload = {
        username,
        password,
        nickname,
        email: email || null,
        avatar: avatarUrl || null,
        role: selectedRole,
        is_active: status === "active",
      };

      if (modal.mode === "edit" && modal.user) {
        const updated = await adminRequest<AdminUser>(
          `/admin/users/${modal.user.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              nickname: payload.nickname,
              email: payload.email,
              avatar: payload.avatar,
              role: payload.role,
              is_active: payload.is_active,
            }),
          },
        );
        if (!mfaEnabled && modal.user.mfa_enabled) {
          await adminRequest(`/admin/users/${modal.user.id}/mfa/disable`, {
            method: "POST",
          });
          setNotice("用户已保存，MFA 已关闭。");
          setModal(null);
        } else if (mfaEnabled && !modal.user.mfa_enabled) {
          await setupMfaForUser(updated, "用户已保存，请扫码绑定后启用 MFA。");
        } else {
          setNotice("用户已保存，列表已刷新。");
          setModal(null);
        }
        await load(pageNumber, pageSize, appliedFilters);
      } else {
        const created = await adminRequest<AdminUser>("/admin/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (mfaEnabled) {
          await setupMfaForUser(created, "用户已新增，请扫码绑定后启用 MFA。");
        } else {
          setNotice("用户已新增，列表已刷新。");
          setModal(null);
        }
        await load(pageNumber, pageSize, appliedFilters);
      }
      setModalError("");
      setAvatarUrl("");
      formElement.reset();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "password") return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    const passwordError = validatePassword(password);
    if (passwordError) {
      setModalError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setModalError("两次输入的密码不一致");
      return;
    }
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${modal.user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setModal(null);
      setModalError("");
      setNotice("密码已重置。");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setSaving(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "mfa") return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${modal.user.id}/mfa/verify`, {
        method: "POST",
        body: JSON.stringify({ code: form.get("code") }),
      });
      setModal(null);
      setModalError("");
      setMfaSetup(null);
      await load(pageNumber, pageSize, appliedFilters);
      setNotice("MFA 已启用。");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "验证失败");
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

  function openSingleDelete(user: AdminUser) {
    setDeleteError("");
    setDeleteState({
      type: "single",
      ids: [user.id],
      label: user.nickname || user.username || "",
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
    if (!deleteState) return "确定删除该用户吗？";
    if (deleteState.type === "single") {
      return deleteState.label
        ? `确定删除用户「${deleteState.label}」吗？`
        : "确定删除该用户吗？";
    }
    return "确定删除选中的用户吗？";
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
        await adminRequest(`/admin/users/${ids[0]}`, { method: "DELETE" });
      } else {
        await adminRequest("/admin/users/batch-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
      }
      setDeleteState(null);
      setNotice(
        deleteState.type === "single"
          ? "用户已删除，列表已刷新。"
          : "选中用户已删除，列表已刷新。",
      );
      await load(nextPage, pageSize, appliedFilters);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function getRoleName(code: string) {
    return (
      roles.find((role) => role.code === code)?.name ?? roleFallbackLabel(code)
    );
  }

  const columns = useMemo<Array<AdminDataTableColumn<AdminUser>>>(
    () => [
      {
        key: "avatar",
        title: "头像",
        width: 80,
        hidden: !tableSettings.visibleColumns.includes("avatar"),
        align: "center",
        render: (user) => <UserAvatar user={user} />,
      },
      {
        key: "username",
        title: "用户名",
        width: 150,
        hidden: !tableSettings.visibleColumns.includes("username"),
        ellipsis: true,
        render: (user) => (
          <span className="font-black text-foreground">{user.username}</span>
        ),
      },
      {
        key: "nickname",
        title: "昵称",
        width: 150,
        hidden: !tableSettings.visibleColumns.includes("nickname"),
        ellipsis: true,
        render: (user) => user.nickname || "-",
      },
      {
        key: "loginMethod",
        title: "登录方式",
        width: 120,
        hidden: !tableSettings.visibleColumns.includes("loginMethod"),
        render: (user) => {
          const loginMethod = getLoginMethod(user);
          const loginMethodLabel =
            loginMethodOptions.find((option) => option.value === loginMethod)
              ?.label ?? loginMethod;
          return (
            <StatusTag
              status="login"
              label={loginMethodLabel}
              map={{ login: { label: loginMethodLabel, variant: "info" } }}
            />
          );
        },
      },
      {
        key: "loginIp",
        title: "登录 IP",
        width: 150,
        hidden: !tableSettings.visibleColumns.includes("loginIp"),
        ellipsis: true,
        render: (user) => getLoginIp(user),
      },
      {
        key: "loginLocation",
        title: "登录地址",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("loginLocation"),
        ellipsis: true,
        render: (user) => getLoginLocation(user),
      },
      {
        key: "status",
        title: "状态",
        width: 110,
        hidden: !tableSettings.visibleColumns.includes("status"),
        render: (user) => (
          <StatusTag
            status={user.is_active}
            label={user.is_active ? "启用" : "禁用"}
          />
        ),
      },
      {
        key: "lastLoginAt",
        title: "最后登录时间",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("lastLoginAt"),
        render: (user) => formatDateTime(user.last_login_at),
      },
      {
        key: "createdAt",
        title: "创建时间",
        width: 180,
        hidden: !tableSettings.visibleColumns.includes("createdAt"),
        render: (user) => formatDateTime(user.created_at),
      },
      {
        key: "actions",
        title: "操作",
        width: 160,
        align: "center",
        sticky: "right",
        hidden: !tableSettings.visibleColumns.includes("actions"),
        render: (user) => (
          <RowActions
            actions={[
              {
                key: "password",
                label: "密码重置",
                icon: <KeyRound className={rowActionIconClass} />,
                variant: "warning",
                onClick: () => openPasswordModal(user),
              },
              {
                key: "edit",
                label: "编辑",
                icon: <Edit className={rowActionIconClass} />,
                variant: "edit",
                onClick: () => openUserModal("edit", user),
              },
              {
                key: "delete",
                label: "删除",
                icon: <Trash2 className={rowActionIconClass} />,
                variant: "delete",
                onClick: () => openSingleDelete(user),
              },
            ]}
          />
        ),
      },
    ],
    [tableSettings.visibleColumns, roles],
  );

  return (
    <AdminPage
      title="用户管理"
      description="管理后台账号、角色、登录方式和 MFA 状态。"
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => openUserModal("create")}
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
        <p className="motion-notice mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="motion-notice mb-4 rounded-md bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] px-3 py-2 text-sm font-bold text-[var(--color-success)] dark:text-[var(--color-success)]">
          {notice}
        </p>
      ) : null}

      <AdminSearchForm
        onSubmit={handleQuery}
        onReset={handleReset}
        loading={loading}
      >
        <Input
          label="用户名"
          value={filters.username}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          placeholder="请输入用户名"
        />
        <AdminField label="登录方式">
          <CustomSelect
            value={filters.login_method}
            onChange={(value) =>
              setFilters((current) => ({ ...current, login_method: value }))
            }
            options={[
              { label: "请选择登录方式", value: "" },
              ...loginMethodOptions,
            ]}
          />
        </AdminField>
        <AdminField label="状态">
          <CustomSelect
            value={filters.status}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value }))
            }
            options={[{ label: "请选择状态", value: "" }, ...statusOptions]}
          />
        </AdminField>
      </AdminSearchForm>

      <AdminDataTable
        columns={columns}
        data={pageData.items}
        rowKey="id"
        settings={tableSettings}
        loading={loading}
        emptyText="暂无用户"
        minWidth={1500}
        selectedRowKeys={selectedIds}
        allSelected={allCurrentPageSelected}
        onSelectRow={(user) => toggleSelect(user.id)}
        onSelectAll={toggleCurrentPage}
        getCheckboxLabel={(user) => `选择用户 ${user.username}`}
        toolbar={
          <AdminTableToolbar
            settings={tableSettings}
            onSettingsChange={setTableSettings}
            columns={userColumnOptions}
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
        open={modal?.type === "user"}
        title={
          modal?.type === "user" && modal.mode === "edit"
            ? "编辑用户"
            : "新增用户"
        }
        size="lg"
        onClose={closeModal}
      >
        {modal?.type === "user" ? (
          <form
            key={modal.user?.id ?? "new"}
            onSubmit={handleUserSubmit}
            className="grid gap-4"
          >
            <ModalError message={modalError} />
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="用户名 *">
                <Input
                  name="username"
                  required
                  disabled={modal.mode === "edit"}
                  defaultValue={modal.user?.username ?? ""}
                  placeholder="请输入用户名"
                  className="disabled:cursor-not-allowed disabled:opacity-70"
                />
              </AdminField>
              <AdminField label="昵称 *">
                <Input
                  name="nickname"
                  required
                  defaultValue={modal.user?.nickname ?? ""}
                  placeholder="请输入昵称"
                />
              </AdminField>
              <AdminField label="手机号">
                <Input
                  disabled
                  placeholder="当前接口未启用手机号字段"
                  className="disabled:cursor-not-allowed disabled:opacity-70"
                />
              </AdminField>
              <AdminField label="邮箱">
                <Input
                  name="email"
                  type="email"
                  defaultValue={modal.user?.email ?? ""}
                  placeholder="请输入邮箱"
                />
              </AdminField>
              <AdminField label="性别">
                <CustomSelect
                  value="secret"
                  onChange={() => undefined}
                  disabled
                  options={[
                    { label: "男", value: "male" },
                    { label: "女", value: "female" },
                    { label: "保密", value: "secret" },
                  ]}
                />
              </AdminField>
              <AdminField label="角色 *">
                <RoleSelector
                  roles={roles}
                  value={selectedRole}
                  error={roleError}
                  loading={rolesLoading}
                  onChange={setSelectedRole}
                />
              </AdminField>
              <AdminField label="状态 *">
                <CustomSelect
                  name="status"
                  value={modalStatus}
                  onChange={setModalStatus}
                  options={statusOptions}
                />
              </AdminField>
              <AdminField label="是否启用 MFA">
                <div className="grid gap-2">
                  <SwitchField
                    name="mfa_enabled"
                    defaultChecked={modal.user?.mfa_enabled ?? false}
                  >
                    {modal.user?.mfa_enabled ? "启用" : "关闭"}
                  </SwitchField>
                  {modal.mode === "edit" && modal.user?.mfa_enabled ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-9 w-fit px-3"
                      disabled={saving}
                      onClick={() => void handleMfaRebind(modal.user!)}
                    >
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                      重新绑定 MFA
                    </Button>
                  ) : null}
                </div>
              </AdminField>
              {modal.mode === "create" ? (
                <>
                  <AdminField label="初始密码 *">
                    <Input
                      name="password"
                      type="password"
                      required
                      placeholder="请输入初始密码"
                    />
                  </AdminField>
                  <AdminField label="确认密码 *">
                    <Input
                      name="confirm_password"
                      type="password"
                      required
                      placeholder="请再次输入初始密码"
                    />
                  </AdminField>
                </>
              ) : null}
            </div>
            <AdminField label="头像">
              <div className="grid gap-2 rounded-md border border-border bg-muted/50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    name="avatar"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="请输入头像 URL"
                    className="flex-1"
                  />
                  <label className="interactive inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground ring-1 ring-border hover:bg-accent hover:text-accent-foreground">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {uploadingAvatar ? "上传中..." : "上传头像"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) =>
                        void uploadAvatar(event.target.files?.[0] ?? null)
                      }
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <UploadProgress item={avatarUploadProgress} />
                {avatarUrl ? (
                  <img
                    src={getAssetUrl(avatarUrl)}
                    alt="用户头像预览"
                    className="h-16 w-16 rounded-full object-cover ring-1 ring-border"
                  />
                ) : null}
              </div>
            </AdminField>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                disabled={saving || uploadingAvatar}
              >
                取消
              </Button>
              <Button type="submit" disabled={saving || uploadingAvatar}>
                {saving ? "提交中..." : "提交"}
              </Button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modal?.type === "password"}
        title="重置密码"
        size="sm"
        onClose={closeModal}
      >
        {modal?.type === "password" ? (
          <form onSubmit={resetPassword} className="grid gap-4">
            <ModalError message={modalError} />
            <AdminField label="新密码 *">
              <Input
                name="password"
                type="password"
                required
                placeholder="请输入新密码"
              />
            </AdminField>
            <AdminField label="确认密码 *">
              <Input
                name="confirm_password"
                type="password"
                required
                placeholder="请再次输入新密码"
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
                {saving ? "提交中..." : "确定"}
              </Button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modal?.type === "mfa"}
        title={
          modal?.type === "mfa"
            ? `启用 MFA：${modal.user.username}`
            : "启用 MFA"
        }
        size="sm"
        onClose={closeModal}
      >
        {modal?.type === "mfa" && mfaSetup ? (
          <form onSubmit={verifyMfa} className="grid gap-4">
            <ModalError message={modalError} />
            <div className="grid place-items-center rounded-md bg-background p-3">
              <img
                src={mfaSetup.qr_code_data_url}
                alt="MFA 绑定二维码"
                className="h-44 w-44"
              />
            </div>
            <p className="text-xs font-bold leading-6 text-muted-foreground">
              请使用 Google Authenticator、Microsoft Authenticator、1Password 或
              Authy 扫码绑定后输入动态码。后台不会展示 MFA Secret 明文。
            </p>
            <AdminField label="动态验证码 *">
              <Input
                name="code"
                inputMode="numeric"
                required
                placeholder="请输入动态验证码"
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
