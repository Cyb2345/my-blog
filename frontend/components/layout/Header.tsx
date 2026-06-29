"use client";

import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  UserCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MutableRefObject, useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { API_BASE_URL, clearToken, getToken } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { Envelope, NavigationItem, SiteConfig } from "@/types/blog";

const fallbackNavItems: NavigationItem[] = [
  {
    id: 1,
    label: "首页",
    href: "/",
    sort_order: 0,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 2,
    label: "文章",
    href: "/posts",
    sort_order: 10,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 3,
    label: "分类",
    href: "/categories",
    sort_order: 20,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 4,
    label: "标签",
    href: "/tags",
    sort_order: 30,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 5,
    label: "时间线",
    href: "/timeline",
    sort_order: 40,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 6,
    label: "知识库",
    href: "/docs",
    sort_order: 50,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 7,
    label: "友链",
    href: "/links",
    sort_order: 60,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 8,
    label: "留言",
    href: "/message",
    sort_order: 70,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: 9,
    label: "关于",
    href: "/about",
    sort_order: 80,
    target: "self",
    is_visible: true,
    created_at: "",
    updated_at: "",
  },
];

type HeaderUser = {
  username: string;
  nickname: string;
  avatar?: string | null;
};

type RuntimeOptions = {
  open_message?: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavigationItem[]>(fallbackNavItems);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    site_name: "技术札记",
    site_subtitle: "Ops, DevOps, Python",
  });
  const [openMessage, setOpenMessage] = useState(true);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/site/navigation`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Envelope<NavigationItem[]>) => {
        if (Array.isArray(body.data) && body.data.length)
          setNavItems(body.data);
      })
      .catch(() => setNavItems(fallbackNavItems));
    fetch(`${API_BASE_URL}/site/config`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Envelope<SiteConfig>) =>
        setSiteConfig((value) => ({ ...value, ...(body.data ?? {}) })),
      )
      .catch(() => undefined);
    fetch(`${API_BASE_URL}/site/runtime-options`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Envelope<RuntimeOptions>) =>
        setOpenMessage(body.data?.open_message !== false),
      )
      .catch(() => setOpenMessage(true));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Envelope<HeaderUser> | null) => setUser(body?.data ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !desktopMenuRef.current?.contains(target) &&
        !mobileMenuRef.current?.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [userMenuOpen]);

  if (pathname.startsWith("/admin")) return null;

  function logout() {
    clearToken();
    setUser(null);
    setUserMenuOpen(false);
  }

  function renderAccountButton(ref: MutableRefObject<HTMLDivElement | null>) {
    return user ? (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setUserMenuOpen((value) => !value)}
          className={cn(
            "interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm dark:bg-[var(--surface-soft)] dark:text-[var(--text)]",
            isHome &&
              "bg-accent text-white ring-1 ring-white/20 hover:bg-accent bg-accent dark:text-white",
          )}
          aria-label="打开用户菜单"
          aria-expanded={userMenuOpen}
        >
          <UserCircle className="h-4 w-4" aria-hidden="true" />
          <span className="hidden lg:inline">
            {user.nickname || user.username}
          </span>
        </button>
        {userMenuOpen ? (
          <div className="theme-menu motion-surface min-w-36">
            <Link
              href="/admin"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted dark:text-[var(--text-secondary)] dark:hover:bg-[var(--hover)]"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              进入后台
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-muted-foreground hover:bg-muted dark:text-[var(--text-secondary)] dark:hover:bg-[var(--hover)]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              退出登录
            </button>
          </div>
        ) : null}
      </div>
    ) : (
      <Link
        href="/admin/login"
        className={cn(
          "interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm hover:text-primary dark:bg-[var(--surface-soft)] dark:text-[var(--text)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]",
          isHome &&
            "bg-accent text-white ring-1 ring-white/20 hover:bg-accent hover:text-white bg-accent dark:text-white dark:hover:text-white",
        )}
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">登录</span>
      </Link>
    );
  }

  const visibleNavItems = navItems.filter(
    (item) => openMessage || item.href !== "/message",
  );
  const navLogo = siteConfig.frontend_nav_logo_url || siteConfig.site_logo_url;

  return (
    <header
      className={cn(
        "site-header top-0 z-50 border-b backdrop-blur-xl",
        isHome
          ? "fixed border-white/20 bg-black/25 text-white"
          : "sticky border-border bg-muted dark:border-[var(--border-soft)] dark:bg-[color-mix(in_srgb,var(--bg-soft)_88%,transparent)]",
      )}
    >
      <div className="site-shell flex items-center justify-between py-3">
        <Link
          href="/"
          className={cn(
            "interactive flex items-center gap-3 font-black text-foreground dark:text-[var(--text)]",
            isHome && "text-white dark:text-white",
          )}
        >
          <span
            className={cn(
              "grid h-10 w-10 place-items-center overflow-hidden rounded-md bg-primary text-white dark:bg-[var(--primary)]",
              isHome &&
                "bg-accent text-white ring-1 ring-white/20 bg-accent dark:text-white",
            )}
          >
            {navLogo ? (
              <img
                src={getAssetUrl(navLogo)}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              "B"
            )}
          </span>
          <span className="leading-tight">
            {siteConfig.site_name ?? "技术札记"}
            <span
              className={cn(
                "block text-xs font-medium text-muted-foreground dark:text-[var(--text-muted)]",
                isHome && "text-white/65 dark:text-white/65",
              )}
            >
              {siteConfig.site_subtitle ?? "Ops, DevOps, Python"}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {visibleNavItems.map((item) => {
            const { label, href } = item;
            const active = isActivePath(pathname, href);

            return (
              <Link
                key={`${item.id}-${href}`}
                href={href}
                target={item.target === "blank" ? "_blank" : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "interactive rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground dark:text-[var(--text-secondary)] dark:hover:bg-[var(--hover)] dark:hover:text-[var(--text)]",
                  active &&
                    "bg-card text-foreground shadow-sm dark:bg-[var(--surface-soft)] dark:text-[var(--text)]",
                  isHome &&
                    "text-white/80 hover:bg-accent hover:text-white dark:text-white/80 hover:bg-accent dark:hover:text-white",
                  isHome &&
                    active &&
                    "bg-accent text-white shadow-sm bg-accent dark:text-white",
                )}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/search"
            className={cn(
              "interactive ml-2 grid h-10 w-10 place-items-center rounded-md bg-card text-muted-foreground shadow-sm hover:text-primary dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]",
              isHome &&
                "bg-accent text-white ring-1 ring-white/20 hover:bg-accent hover:text-white bg-accent dark:text-white dark:hover:text-white",
            )}
            aria-label="搜索"
            title="搜索"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <ThemeToggle hero={isHome} />
          {renderAccountButton(desktopMenuRef)}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle compact hero={isHome} />
          {renderAccountButton(mobileMenuRef)}
          <button
            type="button"
            className={cn(
              "interactive grid h-10 w-10 place-items-center rounded-md bg-card text-foreground shadow-sm dark:bg-[var(--surface-soft)] dark:text-[var(--text)]",
              isHome &&
                "bg-accent text-white ring-1 ring-white/20 hover:bg-accent bg-accent dark:text-white",
            )}
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "关闭导航" : "打开导航"}
            title={open ? "关闭导航" : "打开导航"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mobile-menu-shell md:hidden",
          open && "mobile-menu-shell--open",
        )}
      >
        <nav className="border-t border-border bg-muted py-3 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)]">
          <div className="motion-list site-shell grid grid-cols-2 gap-2">
            {visibleNavItems.map((item) => {
              const { label, href } = item;
              const active = isActivePath(pathname, href);

              return (
                <Link
                  key={`${item.id}-${href}`}
                  href={href}
                  target={item.target === "blank" ? "_blank" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "interactive rounded-md bg-card px-3 py-3 text-sm font-semibold text-muted-foreground dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)]",
                    active &&
                      "bg-primary text-white dark:bg-[var(--primary)] dark:text-[var(--bg)]",
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="interactive rounded-md bg-card px-3 py-3 text-sm font-semibold text-muted-foreground dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)]"
            >
              搜索
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
