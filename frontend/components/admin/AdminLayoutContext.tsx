"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AdminLocale = "zh-CN" | "en-US";
export type AdminBoxStyle = "border" | "shadow";
export type AdminContainerWidth = "full" | "fixed";
export type AdminPageTransition =
  | "none"
  | "fade"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom";
export type AdminRadius = "sm" | "md" | "lg";
export type AdminFontSize = "small" | "default" | "large";

export type AdminLayoutSettings = {
  sidebarCollapsed: boolean;
  primaryColor: string;
  boxStyle: AdminBoxStyle;
  containerWidth: AdminContainerWidth;
  showTabs: boolean;
  accordionMenu: boolean;
  showCollapse: boolean;
  showReload: boolean;
  showBreadcrumb: boolean;
  showLanguage: boolean;
  showProgress: boolean;
  autoCloseSettings: boolean;
  pageTransition: AdminPageTransition;
  radius: AdminRadius;
  fontSize: AdminFontSize;
  menuWidth: number;
};

type AdminLayoutContextValue = {
  settings: AdminLayoutSettings;
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  updateSetting: <Key extends keyof AdminLayoutSettings>(
    key: Key,
    value: AdminLayoutSettings[Key],
  ) => void;
  t: (label: string) => string;
};

const defaultSettings: AdminLayoutSettings = {
  sidebarCollapsed: false,
  primaryColor: "#4f7cff",
  boxStyle: "border",
  containerWidth: "full",
  showTabs: true,
  accordionMenu: true,
  showCollapse: true,
  showReload: true,
  showBreadcrumb: true,
  showLanguage: true,
  showProgress: true,
  autoCloseSettings: false,
  pageTransition: "fade",
  radius: "md",
  fontSize: "default",
  menuWidth: 256,
};

export const adminPageTransitionOptions: Array<{
  label: string;
  value: AdminPageTransition;
}> = [
  { label: "无动画", value: "none" },
  { label: "淡入淡出", value: "fade" },
  { label: "向右滑动", value: "slide-right" },
  { label: "向上滑动", value: "slide-up" },
  { label: "向下滑动", value: "slide-down" },
  { label: "缩放", value: "zoom" },
];

const pageTransitionValues = new Set<AdminPageTransition>(
  adminPageTransitionOptions.map((option) => option.value),
);

const storageKeys: Record<keyof AdminLayoutSettings, string> = {
  sidebarCollapsed: "admin_sidebar_collapsed",
  primaryColor: "admin_primary_color",
  boxStyle: "admin_box_style",
  containerWidth: "admin_container_width",
  showTabs: "admin_show_tabs",
  accordionMenu: "admin_accordion_menu",
  showCollapse: "admin_show_collapse",
  showReload: "admin_show_reload",
  showBreadcrumb: "admin_show_breadcrumb",
  showLanguage: "admin_show_language",
  showProgress: "admin_show_progress",
  autoCloseSettings: "admin_auto_close_settings",
  pageTransition: "admin_page_transition",
  radius: "admin_radius",
  fontSize: "admin_font_size",
  menuWidth: "admin_menu_width",
};

const englishLabels: Record<string, string> = {
  仪表盘: "Dashboard",
  内容管理: "Content",
  文章管理: "Posts",
  分类管理: "Categories",
  标签管理: "Tags",
  网站管理: "Website",
  站点配置: "Site settings",
  首页配置: "Homepage",
  登录页配置: "Login page",
  导航配置: "Navigation",
  友链管理: "Friend links",
  留言管理: "Messages",
  关于页面: "About page",
  系统管理: "System",
  用户管理: "Users",
  角色管理: "Roles",
  参数管理: "Parameters",
  文件管理: "Files",
  文件配置: "Storage settings",
  文件列表: "File list",
  日志管理: "Logs",
  操作日志: "Operation logs",
  访问日志: "Access logs",
  菜单管理: "Menus",
  监控中心: "Monitoring",
  服务监控: "Service monitor",
  系统工具: "System tools",
  管理员工作台: "Admin workspace",
  博客管理系统: "Blog Admin",
  返回首页: "Home",
  刷新: "Refresh",
  "行高 / 密度设置": "Density",
  列显示设置: "Columns",
  表格样式设置: "Table style",
  边框: "Borders",
  斑马纹: "Striped rows",
  表头背景: "Header background",
  恢复默认列: "Restore columns",
  紧凑: "Compact",
  默认: "Default",
  宽松: "Loose",
  快捷页面: "Quick access",
  常用功能: "Common",
  技术支持: "Support",
  博客首页: "Blog homepage",
  消息通知: "Notifications",
  全部已读: "Mark all read",
  查看全部: "View all",
  暂无通知: "No notifications",
  语言切换: "Language",
  设置中心: "Settings",
  用户菜单: "User menu",
  个人中心: "Profile",
  退出登录: "Sign out",
  主题风格: "Theme",
  切换明暗主题: "Toggle light / dark",
  系统主题色: "Accent color",
  盒子样式: "Surface style",
  阴影: "Shadow",
  容器宽度: "Container width",
  铺满: "Full width",
  定宽: "Fixed width",
  基础配置: "Basic settings",
  开启多标签栏: "Enable page tabs",
  侧边栏手风琴: "Accordion sidebar",
  显示折叠按钮: "Show collapse button",
  显示刷新按钮: "Show refresh button",
  显示面包屑: "Show breadcrumbs",
  显示语言选择: "Show language switcher",
  显示顶部进度条: "Show top progress",
  自动关闭设置中心: "Auto-close settings",
  页面切换动画: "Page transition",
  无动画: "No animation",
  淡入淡出: "Fade",
  向右滑动: "Slide right",
  向上滑动: "Slide up",
  向下滑动: "Slide down",
  缩放: "Zoom",
  滑动淡入: "Slide and fade",
  仅淡入: "Fade only",
  关闭动画: "No transition",
  圆角大小: "Corner radius",
  小: "Small",
  中: "Medium",
  大: "Large",
  字体大小: "Font size",
  菜单宽度: "Sidebar width",
  中文: "中文",
  新留言: "New message",
  待审核留言: "Pending message",
  已读: "Read",
  收起侧边栏: "Collapse sidebar",
  展开侧边栏: "Expand sidebar",
  进入全屏: "Enter fullscreen",
  退出全屏: "Exit fullscreen",
  关闭: "Close",
  查询: "Search",
  重置: "Reset",
  新增: "Add",
  批量删除: "Batch delete",
  编辑: "Edit",
  删除: "Delete",
  操作: "Actions",
  状态: "Status",
  排序: "Order",
  创建时间: "Created at",
  更新时间: "Updated at",
  时间: "Time",
  名称: "Name",
  标题: "Title",
  作者: "Author",
  分类: "Category",
  标签: "Tags",
  封面: "Cover",
  阅读量: "Views",
  文章标题: "Post title",
  文章分类: "Post category",
  文章标签: "Post tags",
  文章数: "Posts",
  分类名称: "Category name",
  标签名称: "Tag name",
  文件名: "File name",
  文件类型: "File type",
  文件大小: "File size",
  存储器: "Storage",
  上传时间: "Uploaded at",
  配置名: "Config name",
  配置名称: "Config name",
  主配置: "Primary",
  参数名称: "Parameter name",
  参数键名: "Parameter key",
  参数键值: "Parameter value",
  系统内置: "Built-in",
  生效状态: "Effect",
  访问IP: "IP address",
  IP归属地: "IP location",
  浏览器: "Browser",
  操作系统: "Operating system",
  访问时间: "Access time",
  昵称: "Nickname",
  邮箱: "Email",
  内容: "Content",
  链接: "Link",
  打开方式: "Open mode",
  友链头像: "Avatar",
  友链名称: "Link name",
  友链地址: "URL",
  友链简介: "Description",
  友链邮箱: "Email",
  用户名: "Username",
  角色: "Role",
  登录方式: "Login method",
  登录IP: "Login IP",
  登录地区: "Login location",
  最后登录时间: "Last login",
  上一页: "Previous",
  下一页: "Next",
  前往: "Go to",
  跳转: "Go",
  页: "page",
  暂无文章数据: "No posts",
  暂无数据: "No data",
};

export function translateAdminText(label: string, locale: AdminLocale) {
  return locale === "en-US" ? (englishLabels[label] ?? label) : label;
}

function parseStoredValue<Key extends keyof AdminLayoutSettings>(
  key: Key,
  raw: string | null,
  prefersReducedMotion = false,
): AdminLayoutSettings[Key] {
  if (raw === null) {
    if (key === "pageTransition" && prefersReducedMotion)
      return "none" as AdminLayoutSettings[Key];
    return defaultSettings[key];
  }
  const fallback = defaultSettings[key];
  if (key === "pageTransition") {
    if (raw === "slide") return "slide-up" as AdminLayoutSettings[Key];
    if (pageTransitionValues.has(raw as AdminPageTransition))
      return raw as AdminLayoutSettings[Key];
    return fallback as AdminLayoutSettings[Key];
  }
  if (typeof fallback === "boolean")
    return (raw === "true") as AdminLayoutSettings[Key];
  if (typeof fallback === "number") {
    const value = Number(raw);
    return (
      Number.isFinite(value) ? value : fallback
    ) as AdminLayoutSettings[Key];
  }
  return raw as AdminLayoutSettings[Key];
}

function applyLayoutSettings(
  settings: AdminLayoutSettings,
  locale: AdminLocale,
) {
  const root = document.documentElement;
  root.style.setProperty("--admin-primary", settings.primaryColor);
  root.style.setProperty("--color-primary", settings.primaryColor);
  root.style.setProperty(
    "--color-primary-hover",
    `color-mix(in srgb, ${settings.primaryColor} 84%, black)`,
  );
  root.style.setProperty("--primary", settings.primaryColor);
  root.style.setProperty("--admin-menu-width", `${settings.menuWidth}px`);
  root.dataset.adminBoxStyle = settings.boxStyle;
  root.dataset.adminContainerWidth = settings.containerWidth;
  root.dataset.adminTransition = settings.pageTransition;
  root.dataset.pageTransition = settings.pageTransition;
  root.dataset.adminRadius = settings.radius;
  root.dataset.adminFontSize = settings.fontSize;
  root.lang = locale === "en-US" ? "en" : "zh-CN";
}

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [locale, setLocaleState] = useState<AdminLocale>("zh-CN");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restored = { ...defaultSettings };
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    (Object.keys(storageKeys) as Array<keyof AdminLayoutSettings>).forEach(
      (key) => {
        (restored[key] as AdminLayoutSettings[typeof key]) = parseStoredValue(
          key,
          window.localStorage.getItem(storageKeys[key]),
          prefersReducedMotion,
        );
      },
    );
    const storedLocale = window.localStorage.getItem("admin_language");
    const nextLocale: AdminLocale =
      storedLocale === "en-US" ? "en-US" : "zh-CN";
    setSettings(restored);
    setLocaleState(nextLocale);
    applyLayoutSettings(restored, nextLocale);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyLayoutSettings(settings, locale);
  }, [hydrated, locale, settings]);

  function updateSetting<Key extends keyof AdminLayoutSettings>(
    key: Key,
    value: AdminLayoutSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
    window.localStorage.setItem(storageKeys[key], String(value));
    if (key === "pageTransition") {
      document.documentElement.dataset.adminTransition = String(value);
      document.documentElement.dataset.pageTransition = String(value);
    }
  }

  function setLocale(nextLocale: AdminLocale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem("admin_language", nextLocale);
  }

  const value = useMemo<AdminLayoutContextValue>(
    () => ({
      settings,
      locale,
      setLocale,
      updateSetting,
      t: (label) => translateAdminText(label, locale),
    }),
    [locale, settings],
  );

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const value = useContext(AdminLayoutContext);
  if (!value)
    throw new Error("useAdminLayout must be used inside AdminLayoutProvider");
  return value;
}

export const adminPrimaryColors = [
  { label: "蓝色", value: "#4f7cff" },
  { label: "紫色", value: "#9b72f2" },
  { label: "青色", value: "#2bb7c8" },
  { label: "绿色", value: "#58b947" },
  { label: "橙色", value: "#f39a32" },
  { label: "粉色", value: "#ec65aa" },
];
