"use client";

import {
  BarChart3,
  FileImage,
  FileText,
  Folder,
  Home,
  Link as LinkIcon,
  LogOut,
  MessageSquare,
  MonitorCog,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { clearToken, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items: Array<[string, string, LucideIcon]> = [
  ["概览", "/admin", BarChart3],
  ["文章", "/admin/posts", FileText],
  ["分类", "/admin/categories", Folder],
  ["标签", "/admin/tags", Tags],
  ["友链", "/admin/links", LinkIcon],
  ["留言", "/admin/comments", MessageSquare],
  ["用户", "/admin/users", Users],
  ["媒体", "/admin/media", FileImage],
  ["设置", "/admin/settings", Settings],
];

const groupedItems: Array<[string, Array<[string, string, LucideIcon]>]> = [
  ["监控中心", [["服务监控", "/admin/monitor/service", MonitorCog]]],
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    if (!ready) setReady(true);
  }, [ready, router]);

  function logout() {
    clearToken();
    router.replace("/admin/login");
  }

  if (!ready) return <div className="grid min-h-screen place-items-center bg-paper text-ink dark:bg-slate-950 dark:text-slate-200">正在检查登录状态...</div>;

  return (
    <div className="admin-shell min-h-screen bg-[#f5f7f4] text-ink dark:bg-slate-950 dark:text-slate-200">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900 md:block">
        <Link href="/admin" className="interactive flex items-center gap-3 font-black">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white dark:bg-sky-400 dark:text-slate-950">B</span>
          博客后台
        </Link>
        <nav className="motion-list mt-8 grid gap-2">
          {items.map(([label, href, Icon]) => {
            const active = isActivePath(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "interactive flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-ink/65 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
                  active && "bg-ink text-white hover:bg-ink hover:text-white dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300 dark:hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          {groupedItems.map(([groupLabel, links]) => (
            <div key={groupLabel} className="pt-3">
              <p className="px-3 pb-2 text-xs font-black uppercase tracking-wide text-ink/35 dark:text-slate-500">{groupLabel}</p>
              <div className="grid gap-2">
                {links.map(([label, href, Icon]) => {
                  const active = isActivePath(pathname, href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "interactive flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-ink/65 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
                        active && "bg-ink text-white hover:bg-ink hover:text-white dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300 dark:hover:text-slate-950",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-ink/10 bg-white/85 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/85 md:px-6">
          <div className="flex gap-2 overflow-x-auto md:hidden">
            {[...items, ...groupedItems.flatMap(([, links]) => links)].map(([label, href]) => {
              const active = isActivePath(pathname, href);

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
          <span className="hidden text-sm font-bold text-ink/60 dark:text-slate-400 md:inline">管理员工作台</span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
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
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
