"use client";

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Cloud,
  Eye,
  FileText,
  Files,
  Folder,
  FolderOpen,
  Gamepad2,
  Hexagon,
  Home,
  Info,
  LayoutGrid,
  Link as LinkIcon,
  LogIn,
  MessageSquare,
  Monitor,
  MonitorCog,
  Navigation,
  Settings,
  Settings2,
  Tags,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AdminLayoutProvider,
  useAdminLayout,
} from "@/components/admin/AdminLayoutContext";
import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { AdminSettingsDrawer } from "@/components/admin/AdminSettingsDrawer";
import { AdminTabs, type AdminTab } from "@/components/admin/AdminTabs";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { useAdminViewTransitionNavigate } from "@/components/admin/useAdminViewTransitionNavigate";
import { adminRequest, getToken } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { AdminMenuItem, SiteConfig } from "@/types/blog";

type AdminLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AdminSection = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children: AdminLink[];
};

const fallbackSections: AdminSection[] = [
  { label: "仪表盘", href: "/admin/dashboard", icon: BarChart3, children: [] },
  {
    label: "内容管理",
    icon: FileText,
    children: [
      { label: "文章管理", href: "/admin/content/posts", icon: FileText },
      { label: "分类管理", href: "/admin/content/categories", icon: Folder },
      { label: "标签管理", href: "/admin/content/tags", icon: Tags },
    ],
  },
  {
    label: "网站管理",
    icon: Cloud,
    children: [
      { label: "站点配置", href: "/admin/site/config", icon: Settings },
      { label: "首页配置", href: "/admin/site/home", icon: Home },
      { label: "登录页配置", href: "/admin/site/login", icon: LogIn },
      { label: "导航配置", href: "/admin/site/navigation", icon: Navigation },
      { label: "友链管理", href: "/admin/site/links", icon: LinkIcon },
      { label: "留言管理", href: "/admin/site/messages", icon: MessageSquare },
      { label: "关于页面", href: "/admin/site/about", icon: BookOpen },
    ],
  },
  {
    label: "系统管理",
    icon: LayoutGrid,
    children: [
      { label: "用户管理", href: "/admin/system/users", icon: User },
      { label: "角色管理", href: "/admin/system/roles", icon: Users },
      { label: "参数管理", href: "/admin/system/params", icon: Hexagon },
    ],
  },
  {
    label: "文件管理",
    icon: Files,
    children: [
      { label: "文件配置", href: "/admin/files/config", icon: Settings2 },
      { label: "文件列表", href: "/admin/files/list", icon: FolderOpen },
    ],
  },
  {
    label: "日志管理",
    icon: BookOpen,
    children: [
      { label: "操作日志", href: "/admin/logs/operation", icon: Ticket },
      { label: "访问日志", href: "/admin/logs/access", icon: Eye },
    ],
  },
  { label: "菜单管理", href: "/admin/menus", icon: Users, children: [] },
  {
    label: "监控中心",
    icon: Monitor,
    children: [
      { label: "服务监控", href: "/admin/monitor/service", icon: MonitorCog },
    ],
  },
  { label: "系统工具", icon: Gamepad2, children: [] },
];

const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  BookOpen,
  Cloud,
  Eye,
  FileText,
  Files,
  Folder,
  FolderOpen,
  Gamepad2,
  Hexagon,
  Home,
  Info,
  LayoutGrid,
  Link: LinkIcon,
  LogIn,
  MessageSquare,
  Monitor,
  MonitorCog,
  Navigation,
  Settings,
  Settings2,
  Tags,
  Ticket,
  User,
  Users,
};

const tabsStorageKey = "admin_open_tabs";
const dashboardTab: AdminTab = {
  href: "/admin/dashboard",
  label: "仪表盘",
  pinned: true,
};
const pageEnterMs = 220;

function resolveIcon(icon?: string | null) {
  return icon ? (iconMap[icon] ?? LayoutGrid) : LayoutGrid;
}

function menuToLink(item: AdminMenuItem): AdminLink {
  return {
    label: item.name,
    href: item.route || "/admin/dashboard",
    icon: resolveIcon(item.icon),
  };
}

function menuTreeToSections(items: AdminMenuItem[]): AdminSection[] {
  return items
    .filter((item) => item.is_active && item.type !== "button")
    .map((item) => {
      const children = (item.children ?? [])
        .filter(
          (child) => child.is_active && child.type !== "button" && child.route,
        )
        .map(menuToLink);
      return {
        label: item.name,
        href: children.length ? undefined : (item.route ?? undefined),
        icon: resolveIcon(item.icon),
        children,
      };
    })
    .filter((item) => item.href || item.children.length);
}

function normalizeAdminPath(pathname: string) {
  if (pathname === "/admin") return "/admin/dashboard";
  if (pathname.startsWith("/admin/posts")) return "/admin/content/posts";
  if (pathname.startsWith("/admin/categories"))
    return "/admin/content/categories";
  if (pathname.startsWith("/admin/tags")) return "/admin/content/tags";
  if (pathname.startsWith("/admin/links")) return "/admin/site/links";
  if (pathname.startsWith("/admin/comments")) return "/admin/site/messages";
  if (pathname.startsWith("/admin/users")) return "/admin/system/users";
  if (pathname.startsWith("/admin/media")) return "/admin/files/list";
  if (pathname.startsWith("/admin/settings")) return "/admin/site/config";
  return pathname;
}

function isActivePath(current: string, href: string) {
  if (href === "/admin/dashboard") return current === "/admin/dashboard";
  return current === href || current.startsWith(`${href}/`);
}

function findBreadcrumb(current: string, sections: AdminSection[]) {
  for (const section of sections) {
    if (section.href && isActivePath(current, section.href))
      return [section.label];
    const child = section.children.find((item) =>
      isActivePath(current, item.href),
    );
    if (child) return [section.label, child.label];
  }
  return ["管理员工作台"];
}

function SidebarContent({
  sections,
  current,
  collapsed,
  adminLogo,
  openSections,
  onToggleSection,
  onNavigate,
  onCloseMobile,
}: {
  sections: AdminSection[];
  current: string;
  collapsed: boolean;
  adminLogo: string;
  openSections: Record<string, boolean>;
  onToggleSection: (section: AdminSection) => void;
  onNavigate: (href: string) => void;
  onCloseMobile?: () => void;
}) {
  const { t } = useAdminLayout();

  function isSectionOpen(section: AdminSection) {
    if (!section.children.length) return false;
    if (openSections[section.label] !== undefined)
      return openSections[section.label];
    return section.children.some((item) => isActivePath(current, item.href));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onCloseMobile?.();
          onNavigate("/admin/dashboard");
        }}
        className={cn(
          "interactive flex h-[64px] w-full items-center border-b border-border font-black dark:border-[var(--border-soft)]",
          collapsed ? "justify-center px-2" : "gap-3 px-4",
        )}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--admin-primary)] text-white">
          {adminLogo ? (
            <img
              src={getAssetUrl(adminLogo)}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            "B"
          )}
        </span>
        {!collapsed ? (
          <span className="truncate">{t("博客管理系统")}</span>
        ) : null}
      </button>

      <nav className="py-3">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const activeSection =
            (section.href && isActivePath(current, section.href)) ||
            section.children.some((item) => isActivePath(current, item.href));
          const open = isSectionOpen(section);
          const baseClass = cn(
            "interactive mx-2 flex min-h-11 items-center rounded-md text-sm font-bold text-muted-foreground hover:bg-accent hover:text-[var(--admin-primary)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--hover)] dark:hover:text-[var(--text)]",
            collapsed ? "justify-center px-2" : "gap-3 px-3",
            activeSection &&
              "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)] dark:text-[color-mix(in_srgb,var(--admin-primary)_76%,white)]",
          );

          if (section.href) {
            return (
              <button
                key={section.label}
                type="button"
                onClick={() => {
                  onCloseMobile?.();
                  onNavigate(section.href as string);
                }}
                aria-current={activeSection ? "page" : undefined}
                className={cn(baseClass, "w-[calc(100%-1rem)]")}
                title={collapsed ? t(section.label) : undefined}
              >
                <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed ? <span>{t(section.label)}</span> : null}
              </button>
            );
          }

          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => {
                  if (collapsed && section.children[0]) {
                    onNavigate(section.children[0].href);
                    return;
                  }
                  onToggleSection(section);
                }}
                className={cn(baseClass, "w-[calc(100%-1rem)] text-left")}
                aria-expanded={collapsed ? undefined : open}
                title={collapsed ? t(section.label) : undefined}
              >
                <SectionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed ? (
                  <>
                    <span className="flex-1">{t(section.label)}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        open && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </>
                ) : null}
              </button>
              {!collapsed && section.children.length ? (
                <div
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
                    open
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="min-h-0">
                    <div className="grid gap-1 px-2 pb-2">
                      {section.children.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActivePath(current, item.href);
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => {
                              onCloseMobile?.();
                              onNavigate(item.href);
                            }}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "interactive ml-7 flex min-h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-muted-foreground hover:bg-accent hover:text-[var(--admin-primary)] dark:text-[var(--text-muted)] dark:hover:bg-[var(--hover)] dark:hover:text-[var(--text)]",
                              active &&
                                "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)] dark:text-[color-mix(in_srgb,var(--admin-primary)_76%,white)]",
                            )}
                          >
                            <ItemIcon
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            {t(item.label)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </>
  );
}

function AdminShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const viewTransitionNavigate = useAdminViewTransitionNavigate();
  const pathname = usePathname();
  const current = normalizeAdminPath(pathname);
  const { settings, updateSetting } = useAdminLayout();
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<AdminSection[]>(fallbackSections);
  const [adminLogo, setAdminLogo] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tabs, setTabs] = useState<AdminTab[]>([dashboardTab]);
  const [tabsHydrated, setTabsHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const progressTimer = useRef<number | null>(null);

  const clearProgressTimer = useCallback(() => {
    if (progressTimer.current) window.clearTimeout(progressTimer.current);
    progressTimer.current = null;
  }, []);

  const finishProgressSoon = useCallback(() => {
    clearProgressTimer();
    progressTimer.current = window.setTimeout(() => {
      setProgressVisible(false);
      setRefreshing(false);
      progressTimer.current = null;
    }, pageEnterMs + 80);
  }, [clearProgressTimer]);

  const breadcrumb = useMemo(
    () => findBreadcrumb(current, sections),
    [current, sections],
  );
  const currentTabLabel = breadcrumb[breadcrumb.length - 1] || "管理员工作台";
  const sidebarWidth = settings.sidebarCollapsed ? 72 : settings.menuWidth;

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready || !getToken()) return;
    let cancelled = false;
    Promise.all([
      adminRequest<AdminMenuItem[]>("/admin/menus"),
      adminRequest<SiteConfig>("/admin/site/config"),
    ])
      .then(([items, config]) => {
        if (cancelled) return;
        const nextSections = menuTreeToSections(items);
        setSections(nextSections.length ? nextSections : fallbackSections);
        setAdminLogo(config.admin_logo_url || config.site_logo_url || "");
      })
      .catch(() => {
        if (!cancelled) setSections(fallbackSections);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const storedTabs = window.localStorage.getItem(tabsStorageKey);
    if (storedTabs) {
      try {
        const parsed = JSON.parse(storedTabs) as AdminTab[];
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter(
              (tab) =>
                typeof tab?.href === "string" && typeof tab?.label === "string",
            )
            .map((tab) => ({ ...tab, href: normalizeAdminPath(tab.href) }));
          const unique = valid.filter(
            (tab, index, values) =>
              values.findIndex((candidate) => candidate.href === tab.href) ===
              index,
          );
          setTabs(
            [
              dashboardTab,
              ...unique.filter((tab) => tab.href !== dashboardTab.href),
            ].slice(0, 12),
          );
        }
      } catch {
        window.localStorage.removeItem(tabsStorageKey);
      }
    }
    setTabsHydrated(true);
  }, []);

  useEffect(() => {
    if (!tabsHydrated) return;
    setTabs((currentTabs) => {
      const existing = currentTabs.find((tab) => tab.href === current);
      if (existing) {
        if (existing.label === currentTabLabel) return currentTabs;
        return currentTabs.map((tab) =>
          tab.href === current ? { ...tab, label: currentTabLabel } : tab,
        );
      }
      const nextTabs = [
        ...currentTabs,
        { href: current, label: currentTabLabel },
      ];
      return nextTabs.length > 12
        ? [dashboardTab, ...nextTabs.filter((tab) => !tab.pinned).slice(-11)]
        : nextTabs;
    });
  }, [current, currentTabLabel, tabsHydrated]);

  useEffect(() => {
    if (tabsHydrated)
      window.localStorage.setItem(tabsStorageKey, JSON.stringify(tabs));
  }, [tabs, tabsHydrated]);

  useEffect(() => {
    const activeSection = sections.find((section) =>
      section.children.some((item) => isActivePath(current, item.href)),
    );
    if (activeSection) {
      setOpenSections((state) => {
        if (settings.accordionMenu) return { [activeSection.label]: true };
        return { ...state, [activeSection.label]: true };
      });
    }
    setMobileSidebarOpen(false);
  }, [current, sections, settings.accordionMenu]);

  useEffect(() => {
    clearProgressTimer();
    progressTimer.current = window.setTimeout(
      () => setProgressVisible(false),
      pageEnterMs + 80,
    );
  }, [clearProgressTimer, current, settings.pageTransition]);

  useEffect(
    () => () => {
      clearProgressTimer();
    },
    [clearProgressTimer],
  );

  function navigate(href: string) {
    if (!href) return;
    const targetUrl = new URL(href, window.location.origin);
    const targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    const targetAdminPath = normalizeAdminPath(targetUrl.pathname);
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (targetPath === currentPath) return;
    if (targetAdminPath === current) {
      viewTransitionNavigate(targetPath);
      return;
    }
    setProgressVisible(true);
    viewTransitionNavigate(targetPath);
  }

  function handleLinkCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (
      !anchor ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    )
      return;
    const href = anchor.getAttribute("href");
    if (!href?.startsWith("/admin") || href.startsWith("/admin/login")) return;
    event.preventDefault();
    navigate(href);
  }

  function toggleSection(section: AdminSection) {
    const open = Boolean(openSections[section.label]);
    if (settings.accordionMenu) {
      setOpenSections(open ? {} : { [section.label]: true });
      return;
    }
    setOpenSections((state) => ({ ...state, [section.label]: !open }));
  }

  function refreshPage() {
    if (refreshing) return;
    setRefreshing(true);
    setProgressVisible(true);
    router.refresh();
    window.dispatchEvent(new CustomEvent("admin:refresh"));
    finishProgressSoon();
  }

  function closeTab(href: string) {
    const index = tabs.findIndex((tab) => tab.href === href);
    if (index < 0 || tabs[index].pinned) return;

    const nextTabs = tabs.filter((tab) => tab.href !== href);
    const nextTab = tabs[index - 1] || tabs[index + 1] || dashboardTab;
    setTabs(nextTabs);

    if (href === current) navigate(nextTab.href);
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted text-foreground dark:bg-[var(--bg)] dark:text-[var(--text)]">
        正在检查登录状态...
      </div>
    );
  }

  return (
    <div
      className={cn(
        "admin-shell min-h-screen overflow-x-hidden bg-background text-foreground dark:bg-[var(--bg)] dark:text-[var(--text)]",
        settings.sidebarCollapsed && "admin-shell--collapsed",
      )}
      style={{ "--admin-sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      onClickCapture={handleLinkCapture}
    >
      {settings.showProgress && progressVisible ? (
        <div className="admin-top-progress" />
      ) : null}

      <aside className="admin-sidebar fixed inset-y-0 left-0 z-50 hidden overflow-y-auto border-r border-border bg-card transition-[width] duration-300 dark:border-[var(--border-soft)] dark:bg-[var(--surface)] md:block">
        <SidebarContent
          sections={sections}
          current={current}
          collapsed={settings.sidebarCollapsed}
          adminLogo={adminLogo}
          openSections={openSections}
          onToggleSection={toggleSection}
          onNavigate={navigate}
        />
      </aside>

      <button
        type="button"
        aria-label="关闭侧边栏"
        onClick={() => setMobileSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-[54] bg-black/45 backdrop-blur-[1px] transition-opacity md:hidden",
          mobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[55] w-[min(300px,calc(100vw-3rem))] overflow-y-auto border-r border-border bg-card shadow-2xl transition-transform duration-300 dark:border-[var(--border-soft)] dark:bg-[var(--surface)] md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent
          sections={sections}
          current={current}
          collapsed={false}
          adminLogo={adminLogo}
          openSections={openSections}
          onToggleSection={toggleSection}
          onNavigate={navigate}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </aside>

      <div className="admin-main min-w-0 transition-[margin-left] duration-300">
        <header className="sticky top-0 z-40 border-b border-border bg-card backdrop-blur dark:border-[var(--border-soft)] dark:bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]">
          <div className="flex h-[64px] items-center gap-2 px-2 sm:px-4">
            <AdminTopBar
              breadcrumb={breadcrumb}
              sidebarCollapsed={settings.sidebarCollapsed}
              mobileSidebarOpen={mobileSidebarOpen}
              refreshing={refreshing}
              onToggleSidebar={() =>
                updateSetting("sidebarCollapsed", !settings.sidebarCollapsed)
              }
              onToggleMobileSidebar={() =>
                setMobileSidebarOpen((value) => !value)
              }
              onRefresh={refreshPage}
              onNavigate={navigate}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
          <AdminTabs
            tabs={tabs}
            activeHref={current}
            onNavigate={navigate}
            onClose={closeTab}
          />
        </header>

        <main className="admin-content min-w-0 p-4 md:p-6">
          <div
            className={cn(
              "admin-content-inner mx-auto w-full",
              settings.containerWidth === "fixed" && "max-w-[1440px]",
            )}
          >
            <AdminPageTransition transitionKey={pathname}>
              {children}
            </AdminPageTransition>
          </div>
        </main>
      </div>

      <AdminSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminLayoutProvider>
      <AdminShellContent>{children}</AdminShellContent>
    </AdminLayoutProvider>
  );
}
