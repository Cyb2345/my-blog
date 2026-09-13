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

import { Button, LinkButton } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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
        !desktopMenuRef.current?.contains(target)
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
        <Button variant="ghost" onClick={() => setUserMenuOpen(value => !value)}
          aria-label="打开用户菜单" aria-expanded={userMenuOpen}>
          <UserCircle aria-hidden="true" />
          <span className="hidden max-w-24 truncate sm:inline">{user.nickname || user.username}</span>
        </Button>
        {userMenuOpen && (
          <div className="theme-menu motion-surface min-w-36">
            <LinkButton href="/admin" variant="ghost" onClick={() => setUserMenuOpen(false)}>
              <LayoutDashboard aria-hidden="true" />进入后台
            </LinkButton>
            <Button variant="ghost" onClick={logout}><LogOut aria-hidden="true" />退出登录</Button>
          </div>
        )}
      </div>
    ) : (
      <LinkButton href="/admin/login" variant="ghost" aria-label="登录">
        <LogIn aria-hidden="true" /><span className="hidden sm:inline">登录</span>
      </LinkButton>
    );
  }

  const visibleNavItems = navItems.filter(
    (item) => openMessage || item.href !== "/message",
  );
  const navLogo = siteConfig.frontend_nav_logo_url || siteConfig.site_logo_url;

  return (
    <header className={cn("site-header top-0 z-50 border-b backdrop-blur-xl", isHome ? "fixed site-header--hero" : "sticky border-border bg-muted text-foreground dark:border-[var(--border-soft)] dark:bg-[color-mix(in_srgb,var(--bg-soft)_88%,transparent)]")}>
      <div className="site-header-grid">
        <Link href="/" className="site-brand flex min-w-0 items-center gap-3 font-bold" aria-label={siteConfig.site_name || "首页"}>
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground">
            {navLogo ? <img src={getAssetUrl(navLogo)} alt="" className="h-full w-full object-contain" /> : "B"}
          </span>
          <span className="min-w-0 truncate leading-tight">
            {siteConfig.site_name || "技术札记"}
            <span className="block truncate text-xs font-medium text-muted-foreground">{siteConfig.site_subtitle || "Ops, DevOps, Python"}</span>
          </span>
        </Link>
        <nav aria-label="主导航" className="site-desktop-nav items-center justify-center gap-1">
          {visibleNavItems.map(({ id, label, href, target }) => (
            <Link key={id} href={href} target={target === "blank" ? "_blank" : undefined}
              rel={target === "blank" ? "noopener noreferrer" : undefined}
              aria-current={isActivePath(pathname, href) ? "page" : undefined}
              className={cn("site-nav-link", isActivePath(pathname, href) && "site-nav-link--active")}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions flex items-center justify-end gap-1">
          <LinkButton href="/search" variant="ghost" size="icon" aria-label="搜索"><Search aria-hidden="true" /></LinkButton>
          {renderAccountButton(desktopMenuRef)}
          <ThemeToggle compact />
          <IconButton variant="ghost" className="site-menu-toggle" label={open ? "关闭导航" : "打开导航"}
            aria-expanded={open} aria-controls="site-mobile-navigation" onClick={() => setOpen(value => !value)}>
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </IconButton>
        </div>
      </div>
      <div id="site-mobile-navigation" className={cn("mobile-menu-shell site-mobile-navigation", open && "mobile-menu-shell--open")}
        inert={!open}>
        <nav aria-label="移动导航" className="border-t border-border bg-card py-3">
          <div className="site-shell grid grid-cols-2 gap-2">
            {visibleNavItems.map(({ id, label, href, target }) => (
              <Link key={id} href={href} target={target === "blank" ? "_blank" : undefined}
                rel={target === "blank" ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)} aria-current={isActivePath(pathname, href) ? "page" : undefined}
                className={cn("site-nav-link", isActivePath(pathname, href) && "site-nav-link--active")}>
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
