"use client";

import {
  Bell,
  BookOpen,
  CheckCheck,
  Expand,
  FileText,
  Files,
  Gauge,
  Globe2,
  Grid2X2,
  Home,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { type AdminLocale, useAdminLayout } from "@/components/admin/AdminLayoutContext";
import { adminRequest, clearToken } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { AdminUser, CommentItem } from "@/types/blog";

type OpenPanel = "quick" | "notifications" | "language" | "user" | null;

const quickGroups = [
  {
    label: "常用功能",
    items: [
      { label: "仪表盘", href: "/admin/dashboard", icon: Gauge },
      { label: "文章管理", href: "/admin/content/posts", icon: FileText },
      { label: "站点配置", href: "/admin/site/config", icon: Settings },
      { label: "文件列表", href: "/admin/files/list", icon: Files },
    ],
  },
  {
    label: "技术支持",
    items: [
      { label: "博客首页", href: "/", icon: Home, external: true },
      { label: "服务监控", href: "/admin/monitor/service", icon: Gauge },
      { label: "留言管理", href: "/admin/site/messages", icon: MessageSquare },
      { label: "操作日志", href: "/admin/logs/operation", icon: BookOpen },
    ],
  },
];

function IconButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "interactive relative grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink/55 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-55 dark:text-[var(--text-muted)] dark:hover:bg-[var(--hover)] dark:hover:text-[var(--text)]",
        active && "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function Popover({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute top-[calc(100%+0.55rem)] z-[75] origin-top rounded-lg border border-ink/10 bg-white shadow-2xl transition-all duration-200 dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]",
        open ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100" : "invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        className,
      )}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

function formatNotificationTime(value: string, locale: AdminLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function UserAvatar({ user }: { user: Pick<AdminUser, "username" | "nickname" | "avatar"> | null }) {
  const label = (user?.nickname || user?.username || "A").slice(0, 1).toUpperCase();
  return user?.avatar ? (
    <img src={getAssetUrl(user.avatar)} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="text-sm font-black">{label}</span>
  );
}

export function AdminTopBar({
  breadcrumb,
  sidebarCollapsed,
  mobileSidebarOpen,
  refreshing,
  onToggleSidebar,
  onToggleMobileSidebar,
  onRefresh,
  onNavigate,
  onOpenSettings,
}: {
  breadcrumb: string[];
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  refreshing: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
  onRefresh: () => void;
  onNavigate: (href: string) => void;
  onOpenSettings: () => void;
}) {
  const { locale, setLocale, settings, t } = useAdminLayout();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenTransition, setFullscreenTransition] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [readIds, setReadIds] = useState<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadItems = useMemo(
    () => comments.filter((item) => item.status === "pending" && !readIds.includes(item.id)),
    [comments, readIds],
  );

  function loadNotifications() {
    adminRequest<CommentItem[]>("/admin/comments")
      .then((items) => setComments(items.slice(0, 20)))
      .catch(() => setComments([]));
  }

  useEffect(() => {
    adminRequest<AdminUser>("/auth/me").then(setUser).catch(() => setUser(null));
    loadNotifications();
    const storedReadIds = window.localStorage.getItem("admin_notification_read_comment_ids");
    if (storedReadIds) {
      try {
        const values = JSON.parse(storedReadIds);
        if (Array.isArray(values)) setReadIds(values.filter((value) => Number.isInteger(value)));
      } catch {
        window.localStorage.removeItem("admin_notification_read_comment_ids");
      }
    }
    const timer = window.setInterval(loadNotifications, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPanel(null);
    }
    function handleFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  function persistReadIds(nextIds: number[]) {
    const unique = Array.from(new Set(nextIds)).slice(-300);
    setReadIds(unique);
    window.localStorage.setItem("admin_notification_read_comment_ids", JSON.stringify(unique));
  }

  function markAllRead() {
    persistReadIds([...readIds, ...comments.map((item) => item.id)]);
  }

  async function toggleFullscreen() {
    if (fullscreenTransition) return;
    setFullscreenTransition(true);
    document.documentElement.classList.add("admin-fullscreen-transitioning");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // The browser may block fullscreen outside a trusted user gesture.
    } finally {
      window.setTimeout(() => {
        document.documentElement.classList.remove("admin-fullscreen-transitioning");
        setFullscreenTransition(false);
      }, 320);
    }
  }

  function navigate(href: string) {
    setOpenPanel(null);
    onNavigate(href);
  }

  function logout() {
    clearToken();
    window.location.assign("/admin/login");
  }

  const notificationItems = comments.slice(0, 8);

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <div className="md:hidden">
          <IconButton label={mobileSidebarOpen ? t("关闭") : t("展开侧边栏")} active={mobileSidebarOpen} onClick={onToggleMobileSidebar}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
        {settings.showCollapse ? (
          <div className="hidden md:block">
            <IconButton label={sidebarCollapsed ? t("展开侧边栏") : t("收起侧边栏")} onClick={onToggleSidebar}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
            </IconButton>
          </div>
        ) : null}
        {settings.showReload ? (
          <IconButton label={t("刷新")} disabled={refreshing} onClick={onRefresh}>
            <RefreshCw className={cn("h-5 w-5 hover:rotate-180", refreshing && "animate-spin")} aria-hidden="true" />
          </IconButton>
        ) : null}

        <div className="relative">
          <IconButton label={t("快捷页面")} active={openPanel === "quick"} onClick={() => setOpenPanel((current) => current === "quick" ? null : "quick")}>
            <Grid2X2 className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <Popover open={openPanel === "quick"} className="left-0 w-[min(620px,calc(100vw-2rem))] p-4">
            <div className="grid gap-5 sm:grid-cols-2">
              {quickGroups.map((group) => (
                <section key={group.label}>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-ink/40 dark:text-[var(--text-muted)]">{t(group.label)}</h3>
                  <div className="grid gap-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return item.external ? (
                        <Link key={item.href} href={item.href} className="flex min-h-12 items-center gap-3 rounded-md px-3 hover:bg-paper dark:hover:bg-[var(--hover)]">
                          <span className="grid h-9 w-9 place-items-center rounded-md bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)]"><ItemIcon className="h-4 w-4" /></span>
                          <span className="text-sm font-black">{t(item.label)}</span>
                        </Link>
                      ) : (
                        <button key={item.href} type="button" onClick={() => navigate(item.href)} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-left hover:bg-paper dark:hover:bg-[var(--hover)]">
                          <span className="grid h-9 w-9 place-items-center rounded-md bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)]"><ItemIcon className="h-4 w-4" /></span>
                          <span className="text-sm font-black">{t(item.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </Popover>
        </div>

        {settings.showBreadcrumb ? (
          <div className="ml-1 hidden min-w-0 items-center gap-1 text-sm font-bold text-ink/55 dark:text-[var(--text-muted)] lg:flex">
            {breadcrumb.map((item, index) => (
              <span key={`${item}-${index}`} className={cn("truncate", index === breadcrumb.length - 1 && "text-ink dark:text-[var(--text)]")}>
                {index ? " / " : ""}
                {t(item)}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <IconButton label={fullscreen ? t("退出全屏") : t("进入全屏")} disabled={fullscreenTransition} onClick={() => void toggleFullscreen()}>
          {fullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Expand className="h-5 w-5" aria-hidden="true" />}
        </IconButton>

        <div className="relative">
          <IconButton label={t("消息通知")} active={openPanel === "notifications"} onClick={() => {
            loadNotifications();
            setOpenPanel((current) => current === "notifications" ? null : "notifications");
          }}>
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadItems.length ? (
              <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[var(--danger)] px-1 text-[10px] font-black leading-4 text-white">
                {unreadItems.length > 9 ? "9+" : unreadItems.length}
              </span>
            ) : null}
          </IconButton>
          <Popover open={openPanel === "notifications"} className="right-0 w-[min(390px,calc(100vw-1rem))] overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 dark:border-[var(--border-soft)]">
              <div>
                <h3 className="font-black">{t("消息通知")}</h3>
                <p className="mt-0.5 text-xs font-bold text-ink/45 dark:text-[var(--text-muted)]">
                  {locale === "en-US" ? `${unreadItems.length} unread` : `${unreadItems.length} 条未读`}
                </p>
              </div>
              <button type="button" onClick={markAllRead} disabled={!unreadItems.length} className="inline-flex items-center gap-1 text-xs font-black text-[var(--admin-primary)] disabled:opacity-40">
                <CheckCheck className="h-4 w-4" />
                {t("全部已读")}
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {notificationItems.length ? notificationItems.map((item) => {
                const unread = item.status === "pending" && !readIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      persistReadIds([...readIds, item.id]);
                      navigate("/admin/site/messages");
                    }}
                    className="flex w-full items-start gap-3 rounded-md p-3 text-left hover:bg-paper dark:hover:bg-[var(--hover)]"
                  >
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--admin-primary)_13%,transparent)] text-[var(--admin-primary)]">
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-black">{t(item.status === "pending" ? "新留言" : "留言管理")}：{item.nickname}</span>
                        {unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--danger)]" /> : null}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-ink/45 dark:text-[var(--text-muted)]">{item.content}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-ink/35 dark:text-[var(--text-muted)]">{formatNotificationTime(item.created_at, locale)}</span>
                    </span>
                  </button>
                );
              }) : (
                <div className="grid min-h-32 place-items-center text-sm font-bold text-ink/40 dark:text-[var(--text-muted)]">{t("暂无通知")}</div>
              )}
            </div>
            <button type="button" onClick={() => navigate("/admin/site/messages")} className="min-h-11 w-full border-t border-ink/10 text-sm font-black text-[var(--admin-primary)] dark:border-[var(--border-soft)]">
              {t("查看全部")}
            </button>
          </Popover>
        </div>

        {settings.showLanguage ? (
          <div className="relative hidden sm:block">
            <IconButton label={t("语言切换")} active={openPanel === "language"} onClick={() => setOpenPanel((current) => current === "language" ? null : "language")}>
              <Languages className="h-5 w-5" aria-hidden="true" />
            </IconButton>
            <Popover open={openPanel === "language"} className="right-0 w-40 p-1">
              {([
                ["zh-CN", "中文"],
                ["en-US", "English"],
              ] as Array<[AdminLocale, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setLocale(value);
                    setOpenPanel(null);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-bold",
                    locale === value ? "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)]" : "hover:bg-paper dark:hover:bg-[var(--hover)]",
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </Popover>
          </div>
        ) : null}

        <IconButton label={t("设置中心")} onClick={() => {
          setOpenPanel(null);
          onOpenSettings();
        }}>
          <Settings className="h-5 w-5" aria-hidden="true" />
        </IconButton>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenPanel((current) => current === "user" ? null : "user")}
            className="ml-1 grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[var(--admin-primary)] text-white ring-2 ring-transparent hover:ring-[color-mix(in_srgb,var(--admin-primary)_35%,transparent)]"
            aria-label={t("用户菜单")}
            title={t("用户菜单")}
          >
            <UserAvatar user={user} />
          </button>
          <Popover open={openPanel === "user"} className="right-0 w-64 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-ink/10 p-4 dark:border-[var(--border-soft)]">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--admin-primary)] text-white">
                <UserAvatar user={user} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{user?.nickname || user?.username || "Admin"}</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-ink/40 dark:text-[var(--text-muted)]">{user?.email || user?.role || ""}</span>
              </span>
            </div>
            <div className="p-1.5">
              <button type="button" onClick={() => navigate("/admin/system/users")} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-bold hover:bg-paper dark:hover:bg-[var(--hover)]">
                <User className="h-4 w-4" />
                {t("个人中心")}
              </button>
              <button type="button" onClick={logout} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-bold text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-500/10">
                <LogOut className="h-4 w-4" />
                {t("退出登录")}
              </button>
            </div>
          </Popover>
        </div>
      </div>
    </div>
  );
}
