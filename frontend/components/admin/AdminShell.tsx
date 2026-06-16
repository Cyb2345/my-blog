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
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  MonitorCog,
  Navigation,
  RefreshCw,
  Settings,
  Settings2,
  Tags,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { adminRequest, clearToken, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { AdminMenuItem } from "@/types/blog";

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
  {
    label: "仪表盘",
    href: "/admin/dashboard",
    icon: BarChart3,
    children: [],
  },
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
  {
    label: "菜单管理",
    href: "/admin/menus",
    icon: Users,
    children: [],
  },
  {
    label: "监控中心",
    icon: Monitor,
    children: [{ label: "服务监控", href: "/admin/monitor/service", icon: MonitorCog }],
  },
  {
    label: "系统工具",
    icon: Gamepad2,
    children: [],
  },
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

function resolveIcon(icon?: string | null) {
  return icon ? iconMap[icon] ?? LayoutGrid : LayoutGrid;
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
        .filter((child) => child.is_active && child.type !== "button" && child.route)
        .map(menuToLink);
      return {
        label: item.name,
        href: children.length ? undefined : item.route ?? undefined,
        icon: resolveIcon(item.icon),
        children,
      };
    })
    .filter((item) => item.href || item.children.length);
}

function normalizeAdminPath(pathname: string) {
  if (pathname === "/admin") return "/admin/dashboard";
  if (pathname.startsWith("/admin/posts")) return "/admin/content/posts";
  if (pathname.startsWith("/admin/categories")) return "/admin/content/categories";
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
    if (section.href && isActivePath(current, section.href)) return [section.label];
    const child = section.children.find((item) => isActivePath(current, item.href));
    if (child) return [section.label, child.label];
  }
  return ["管理员工作台"];
}

function allLinks(sections: AdminSection[]) {
  return sections.flatMap((section) =>
    section.href ? [{ label: section.label, href: section.href, icon: section.icon }] : section.children,
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = normalizeAdminPath(pathname);
  const [ready, setReady] = useState(() => Boolean(getToken()));
  const [sections, setSections] = useState<AdminSection[]>(fallbackSections);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const breadcrumb = useMemo(() => findBreadcrumb(current, sections), [current, sections]);
  const mobileLinks = useMemo(() => allLinks(sections), [sections]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    if (!ready) setReady(true);
  }, [ready, router]);

  useEffect(() => {
    if (!ready || !getToken()) return;
    let cancelled = false;

    adminRequest<AdminMenuItem[]>("/admin/menus")
      .then((items) => {
        if (cancelled) return;
        const nextSections = menuTreeToSections(items);
        setSections(nextSections.length ? nextSections : fallbackSections);
      })
      .catch(() => {
        if (!cancelled) setSections(fallbackSections);
      });

    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const activeSection = sections.find((section) =>
      section.children.some((item) => isActivePath(current, item.href)),
    );
    if (activeSection) {
      setOpenSections((state) => ({ ...state, [activeSection.label]: true }));
    }
  }, [current, sections]);

  function logout() {
    clearToken();
    router.replace("/admin/login");
  }

  function isSectionOpen(section: AdminSection) {
    if (!section.children.length) return false;
    if (openSections[section.label] !== undefined) return openSections[section.label];
    return section.children.some((item) => isActivePath(current, item.href));
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink dark:bg-slate-950 dark:text-slate-200">
        正在检查登录状态...
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[#f5f7fb] text-ink dark:bg-slate-950 dark:text-slate-200">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-ink/10 bg-white dark:border-white/10 dark:bg-slate-900 md:block">
        <Link href="/admin/dashboard" className="interactive flex h-[72px] items-center gap-3 border-b border-ink/10 px-5 font-black dark:border-white/10">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ocean text-white dark:bg-sky-400 dark:text-slate-950">B</span>
          <span>博客管理系统</span>
        </Link>
        <nav className="py-3">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const activeSection =
              (section.href && isActivePath(current, section.href)) ||
              section.children.some((item) => isActivePath(current, item.href));
            const open = isSectionOpen(section);

            if (section.href) {
              return (
                <Link
                  key={section.label}
                  href={section.href}
                  aria-current={activeSection ? "page" : undefined}
                  className={cn(
                    "interactive mx-2 flex min-h-12 items-center gap-3 rounded-md px-4 text-sm font-bold text-ink/75 hover:bg-[#eef3ff] hover:text-blue-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-sky-200",
                    activeSection && "bg-[#eef3ff] text-blue-600 dark:bg-sky-400/10 dark:text-sky-200",
                  )}
                >
                  <SectionIcon className="h-5 w-5" aria-hidden="true" />
                  {section.label}
                </Link>
              );
            }

            return (
              <div key={section.label}>
                <button
                  type="button"
                  onClick={() => setOpenSections((state) => ({ ...state, [section.label]: !open }))}
                  className={cn(
                    "interactive mx-2 flex min-h-12 w-[calc(100%-1rem)] items-center gap-3 rounded-md px-4 text-left text-sm font-bold text-ink/75 hover:bg-[#eef3ff] hover:text-blue-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-sky-200",
                    activeSection && "bg-[#eef3ff] text-blue-600 dark:bg-sky-400/10 dark:text-sky-200",
                  )}
                  aria-expanded={open}
                >
                  <SectionIcon className="h-5 w-5" aria-hidden="true" />
                  <span className="flex-1">{section.label}</span>
                  {section.children.length ? (
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
                  ) : null}
                </button>
                {section.children.length ? (
                  <div
                    className={cn(
                      "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0">
                      <div className="grid gap-1 px-2 pb-2">
                        {section.children.map((item) => {
                          const ItemIcon = item.icon;
                          const active = isActivePath(current, item.href);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "interactive ml-7 flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold text-ink/65 hover:bg-[#eef3ff] hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-sky-200",
                                active && "bg-blue-50 text-blue-600 dark:bg-sky-400/10 dark:text-sky-200",
                              )}
                            >
                              <ItemIcon className="h-4 w-4" aria-hidden="true" />
                              {item.label}
                            </Link>
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
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
          <div className="flex h-[72px] items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Menu className="h-5 w-5 shrink-0 text-ink/50 dark:text-slate-400 md:hidden" aria-hidden="true" />
              <RefreshCw className="hidden h-5 w-5 shrink-0 text-ink/45 dark:text-slate-500 md:block" aria-hidden="true" />
              <div className="hidden min-w-0 items-center gap-2 text-sm font-bold text-ink/65 dark:text-slate-400 md:flex">
                {breadcrumb.map((item, index) => (
                  <span key={`${item}-${index}`} className={index === breadcrumb.length - 1 ? "truncate text-ink dark:text-slate-200" : "text-ink/55 dark:text-slate-500"}>
                    {index ? " / " : ""}
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto md:hidden">
              {mobileLinks.map(({ label, href }) => {
                const active = isActivePath(current, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "interactive whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold",
                      active ? "bg-ink text-white dark:bg-sky-400 dark:text-slate-950" : "bg-paper text-ink/65 dark:bg-white/10 dark:text-slate-300",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                className="interactive hidden min-h-10 items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 sm:inline-flex"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                返回首页
              </Link>
              <ThemeToggle compact />
              <button
                type="button"
                onClick={logout}
                className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink hover:bg-ink hover:text-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-sky-400 dark:hover:text-slate-950"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                退出
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
