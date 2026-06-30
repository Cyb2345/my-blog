"use client";

import {
  Copy,
  Edit,
  EyeOff,
  Eye,
  Image,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  type AdminDataTableColumn,
} from "@/components/admin/AdminDataTable";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { AdminPage } from "@/components/admin/AdminPage";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { RowActions, rowActionIconClass } from "@/components/admin/RowActions";
import { StatusTag } from "@/components/admin/StatusTag";
import {
  UploadProgress,
  type UploadProgressItem,
} from "@/components/admin/UploadProgress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminRequest, adminUpload } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { MediaAsset, NavigationItem, SiteConfig } from "@/types/blog";

type ConfigFieldType =
  | "text"
  | "textarea"
  | "url"
  | "select"
  | "switch"
  | "image";
export type ConfigGroupKey =
  | "basic"
  | "brand"
  | "hero"
  | "notice"
  | "navigation"
  | "homeBackground"
  | "loginBackground"
  | "resources";
type ConfigSaveMode = "config" | "homeBackground" | "loginBackground";

type ConfigOption = {
  label: string;
  value: string;
};

type ConfigItem = {
  key: string;
  label: string;
  description: string;
  type: ConfigFieldType;
  group: Exclude<ConfigGroupKey, "navigation" | "resources">;
  kind?: ConfigSaveMode;
  options?: ConfigOption[];
  assetUsage?: "site_hero" | "login_background" | "general";
  placeholder?: string;
};

type ConfigEditState = {
  item: ConfigItem;
  value: string;
};

type NavModalState =
  | { mode: "create"; item?: null }
  | { mode: "edit"; item: NavigationItem }
  | null;

type UploadState = {
  usage: "site_hero" | "login_background" | "general";
} | null;

type DeleteState =
  | { type: "navigation"; item: NavigationItem }
  | { type: "background"; item: MediaAsset }
  | null;

const groupTabs: Array<{
  key: ConfigGroupKey;
  label: string;
  description: string;
}> = [
  { key: "basic", label: "基础信息", description: "站点名称、副标题和描述。" },
  {
    key: "brand",
    label: "品牌设置",
    description: "前后台 Logo 与浏览器 Favicon。",
  },
  {
    key: "hero",
    label: "首页 Hero",
    description: "首页首屏文案、按钮和滚动提示。",
  },
  { key: "notice", label: "首页公告", description: "首页欢迎公告文案。" },
  {
    key: "navigation",
    label: "导航配置",
    description: "前台导航链接和显示状态。",
  },
  {
    key: "homeBackground",
    label: "首页背景",
    description: "首页背景策略和默认背景。",
  },
  {
    key: "loginBackground",
    label: "登录背景",
    description: "登录页背景策略。",
  },
  {
    key: "resources",
    label: "背景资源",
    description: "上传、设置和删除背景图片。",
  },
];

const backgroundModeOptions: ConfigOption[] = [
  { label: "固定单张图", value: "fixed" },
  { label: "多张随机显示", value: "random" },
  { label: "多张轮询显示", value: "round_robin" },
];

const heroImageDisplayOptions: ConfigOption[] = [
  { label: "覆盖铺满", value: "cover" },
  { label: "完整显示", value: "contain" },
  { label: "原始尺寸", value: "auto" },
];

const backgroundPositionOptions: ConfigOption[] = [
  { label: "居中", value: "center center" },
  { label: "顶部居中", value: "center top" },
  { label: "底部居中", value: "center bottom" },
  { label: "左侧居中", value: "left center" },
  { label: "右侧居中", value: "right center" },
];

const overlayOpacityOptions: ConfigOption[] = [
  { label: "20%", value: "0.2" },
  { label: "28%", value: "0.28" },
  { label: "35%", value: "0.35" },
  { label: "42%", value: "0.42" },
  { label: "50%", value: "0.5" },
];

const configItems: ConfigItem[] = [
  {
    key: "site_name",
    label: "站点名称",
    description: "显示在前台和浏览器标题中的主站点名称。",
    type: "text",
    group: "basic",
    placeholder: "请输入站点名称",
  },
  {
    key: "site_subtitle",
    label: "站点副标题",
    description: "用于补充说明站点方向或关键词。",
    type: "text",
    group: "basic",
    placeholder: "请输入站点副标题",
  },
  {
    key: "site_description",
    label: "站点描述",
    description: "用于首页简介和站点说明。",
    type: "textarea",
    group: "basic",
    placeholder: "请输入站点描述",
  },
  {
    key: "site_logo_url",
    label: "网站 Logo",
    description: "站点通用品牌标识，未单独配置时供前后台共用。",
    type: "image",
    group: "brand",
    assetUsage: "general",
  },
  {
    key: "favicon_url",
    label: "Favicon",
    description: "浏览器标签页图标，支持导入 ICO、PNG 或 SVG。",
    type: "image",
    group: "brand",
    assetUsage: "general",
  },
  {
    key: "admin_logo_url",
    label: "后台 Logo",
    description: "后台左上角显示的品牌图标。",
    type: "image",
    group: "brand",
    assetUsage: "general",
  },
  {
    key: "frontend_nav_logo_url",
    label: "前台导航 Logo",
    description: "前台导航栏显示的品牌图标。",
    type: "image",
    group: "brand",
    assetUsage: "general",
  },
  {
    key: "hero_badge",
    label: "首页标签",
    description: "首页 Hero 区域上方的小标签。",
    type: "text",
    group: "hero",
    placeholder: "请输入首页标签",
  },
  {
    key: "hero_title",
    label: "首页主标题",
    description: "首页首屏最重要的标题文案。",
    type: "textarea",
    group: "hero",
    placeholder: "请输入首页主标题",
  },
  {
    key: "hero_description",
    label: "首页副标题",
    description: "首页首屏标题下方的说明文案。",
    type: "textarea",
    group: "hero",
    placeholder: "请输入首页副标题",
  },
  {
    key: "hero_primary_text",
    label: "Hero 主按钮文字",
    description: "首页首屏主操作按钮显示的文字。",
    type: "text",
    group: "hero",
    placeholder: "请输入主按钮文字",
  },
  {
    key: "hero_primary_href",
    label: "Hero 主按钮链接",
    description: "首页首屏主操作按钮跳转地址。",
    type: "url",
    group: "hero",
    placeholder: "/posts",
  },
  {
    key: "hero_secondary_text",
    label: "Hero 次按钮文字",
    description: "首页首屏次要操作按钮显示的文字。",
    type: "text",
    group: "hero",
    placeholder: "请输入次按钮文字",
  },
  {
    key: "hero_secondary_href",
    label: "Hero 次按钮链接",
    description: "首页首屏次要操作按钮跳转地址。",
    type: "url",
    group: "hero",
    placeholder: "/docs",
  },
  {
    key: "home_show_scroll_indicator",
    label: "显示滚动提示箭头",
    description: "控制首页首屏底部是否显示向下提示箭头。",
    type: "switch",
    group: "hero",
    options: [
      { label: "显示", value: "true" },
      { label: "隐藏", value: "false" },
    ],
  },
  {
    key: "home_notice_text",
    label: "首页欢迎公告",
    description: "首页公告区域展示的欢迎文案。",
    type: "textarea",
    group: "notice",
    placeholder: "请输入首页欢迎公告",
  },
  {
    key: "hero_image",
    label: "默认背景 URL",
    description: "当没有可用背景资源时首页使用的兜底图片地址。",
    type: "url",
    group: "homeBackground",
    placeholder: "/images/blog-hero.png",
  },
  {
    key: "hero_image_display",
    label: "默认背景显示方式",
    description: "控制默认背景图在首页中的显示方式。",
    type: "select",
    group: "homeBackground",
    options: heroImageDisplayOptions,
  },
  {
    key: "home_background_mode",
    label: "首页背景显示模式",
    description: "控制首页背景使用固定、随机或轮询策略。",
    type: "select",
    group: "homeBackground",
    kind: "homeBackground",
    options: backgroundModeOptions,
  },
  {
    key: "home_background_fixed_id",
    label: "固定首页背景",
    description: "当显示模式为固定单张图时使用的背景资源。",
    type: "image",
    group: "homeBackground",
    kind: "homeBackground",
    assetUsage: "site_hero",
  },
  {
    key: "login_background_mode",
    label: "登录背景显示模式",
    description: "控制登录页背景使用固定、随机或轮询策略。",
    type: "select",
    group: "loginBackground",
    kind: "loginBackground",
    options: backgroundModeOptions,
  },
  {
    key: "login_background_fixed_id",
    label: "固定登录背景",
    description: "当显示模式为固定单张图时使用的登录背景资源。",
    type: "image",
    group: "loginBackground",
    kind: "loginBackground",
    assetUsage: "login_background",
  },
  {
    key: "login_background_display",
    label: "背景显示方式",
    description: "覆盖铺满可能裁切，完整显示会保留原图比例，原始尺寸不会缩放。",
    type: "select",
    group: "loginBackground",
    options: heroImageDisplayOptions,
  },
  {
    key: "login_background_position",
    label: "背景位置",
    description: "控制背景图在登录首屏中的对齐位置。",
    type: "select",
    group: "loginBackground",
    options: backgroundPositionOptions,
  },
  {
    key: "login_background_overlay_enabled",
    label: "启用深色遮罩",
    description: "遮罩只用于增强登录卡片可读性，不会再叠加白色蒙层。",
    type: "switch",
    group: "loginBackground",
  },
  {
    key: "login_background_overlay_opacity",
    label: "遮罩透明度",
    description: "数值越高背景越暗，建议 28% 至 42%。",
    type: "select",
    group: "loginBackground",
    options: overlayOpacityOptions,
  },
];

const usageLabels: Record<MediaAsset["usage_type"], string> = {
  general: "通用",
  post_cover: "文章封面",
  article_image: "文章图片",
  login_background: "登录背景",
  site_hero: "首页背景",
  avatar: "头像",
  link_avatar: "友链头像",
};

function truncateValue(value: string, maxLength = 80) {
  if (!value) return "未配置";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function assetLabel(asset?: MediaAsset) {
  if (!asset) return "未选择";
  return asset.original_name || asset.filename;
}

function sortNavigation(items: NavigationItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function SiteConfigSkeleton() {
  return (
    <section className="motion-surface overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      </div>
      <div className="grid divide-y divide-border">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto] sm:items-center sm:px-5"
          >
            <div className="grid gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SiteConfigManager({
  initialGroup = "basic",
  allowedGroups = groupTabs.map((item) => item.key),
}: {
  initialGroup?: ConfigGroupKey;
  allowedGroups?: ConfigGroupKey[];
}) {
  const [activeGroup, setActiveGroup] = useState<ConfigGroupKey>(initialGroup);
  const [config, setConfig] = useState<SiteConfig>({});
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [loginBackgrounds, setLoginBackgrounds] = useState<MediaAsset[]>([]);
  const [homeBackgrounds, setHomeBackgrounds] = useState<MediaAsset[]>([]);
  const [brandAssets, setBrandAssets] = useState<MediaAsset[]>([]);
  const [configEdit, setConfigEdit] = useState<ConfigEditState | null>(null);
  const [navModal, setNavModal] = useState<NavModalState>(null);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const visibleTabs = groupTabs.filter((item) =>
    allowedGroups.includes(item.key),
  );
  const activeTab =
    visibleTabs.find((item) => item.key === activeGroup) ??
    visibleTabs[0] ??
    groupTabs[0];
  const activeConfigItems = configItems.filter(
    (item) => item.group === activeGroup,
  );
  const allBackgrounds = useMemo(
    () => [...homeBackgrounds, ...loginBackgrounds],
    [homeBackgrounds, loginBackgrounds],
  );
  const activeHomeBackgrounds = homeBackgrounds.filter(
    (item) => item.is_active,
  );
  const activeLoginBackgrounds = loginBackgrounds.filter(
    (item) => item.is_active,
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [configData, navData, loginBgData, homeBgData, brandData] =
        await Promise.all([
          adminRequest<SiteConfig>("/admin/site/config"),
          adminRequest<NavigationItem[]>("/admin/navigation"),
          adminRequest<MediaAsset[]>("/admin/site/login-backgrounds"),
          adminRequest<MediaAsset[]>("/admin/site/home-backgrounds"),
          adminRequest<MediaAsset[]>("/admin/media?usage_type=general"),
        ]);
      setConfig(configData);
      setNavigation(sortNavigation(navData));
      setLoginBackgrounds(loginBgData);
      setHomeBackgrounds(homeBgData);
      setBrandAssets(brandData.filter((item) => item.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "站点配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function getConfigValue(key: string) {
    return config[key] ?? "";
  }

  function findAsset(item: ConfigItem, value = getConfigValue(item.key)) {
    const source =
      item.assetUsage === "login_background"
        ? loginBackgrounds
        : item.assetUsage === "general"
          ? brandAssets
          : homeBackgrounds;
    const mediaId = Number(value);
    return source.find((asset) => asset.id === mediaId || asset.url === value);
  }

  function openConfigEdit(item: ConfigItem) {
    setModalError("");
    const currentValue = getConfigValue(item.key);
    const asset =
      item.type === "image" ? findAsset(item, currentValue) : undefined;
    setConfigEdit({ item, value: asset ? String(asset.id) : currentValue });
  }

  function closeConfigEdit() {
    if (saving) return;
    setConfigEdit(null);
    setModalError("");
  }

  async function saveConfigItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configEdit) return;
    const form = new FormData(event.currentTarget);
    const item = configEdit.item;
    const nextValue = String(form.get("value") ?? "");
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      if (item.kind === "homeBackground") {
        const displayMode =
          item.key === "home_background_mode"
            ? nextValue
            : getConfigValue("home_background_mode") || "fixed";
        const fixedValue =
          item.key === "home_background_fixed_id"
            ? nextValue
            : getConfigValue("home_background_fixed_id");
        const nextConfig = await adminRequest<SiteConfig>(
          "/admin/site/home-background",
          {
            method: "PUT",
            body: JSON.stringify({
              display_mode: displayMode,
              fixed_media_id: fixedValue ? Number(fixedValue) : null,
            }),
          },
        );
        setConfig(nextConfig);
      } else if (item.kind === "loginBackground") {
        const displayMode =
          item.key === "login_background_mode"
            ? nextValue
            : getConfigValue("login_background_mode") || "random";
        const fixedValue =
          item.key === "login_background_fixed_id"
            ? nextValue
            : getConfigValue("login_background_fixed_id");
        const nextConfig = await adminRequest<SiteConfig>(
          "/admin/site/login-background",
          {
            method: "PUT",
            body: JSON.stringify({
              display_mode: displayMode,
              fixed_media_id: fixedValue ? Number(fixedValue) : null,
            }),
          },
        );
        setConfig(nextConfig);
      } else {
        const storedValue =
          item.type === "image"
            ? (brandAssets.find((asset) => String(asset.id) === nextValue)
                ?.url ?? "")
            : nextValue;
        const nextConfig = { ...config, [item.key]: storedValue };
        const saved = await adminRequest<SiteConfig>("/admin/site/config", {
          method: "PUT",
          body: JSON.stringify({ values: nextConfig }),
        });
        setConfig((current) => ({
          ...current,
          [item.key]: saved[item.key] ?? storedValue,
        }));
      }
      setNotice(`「${item.label}」已保存。`);
      setConfigEdit(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openNavModal(next: NavModalState) {
    setModalError("");
    setNavModal(next);
  }

  function closeNavModal() {
    if (saving) return;
    setNavModal(null);
    setModalError("");
  }

  async function saveNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!navModal) return;
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
      sort_order: Number(form.get("sort_order") || 0),
      target: String(form.get("target") ?? "self"),
      icon: String(form.get("icon") ?? "").trim() || null,
      is_visible: form.get("is_visible") === "on",
    };
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      if (navModal.mode === "edit" && navModal.item) {
        const saved = await adminRequest<NavigationItem>(
          `/admin/navigation/${navModal.item.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
        setNavigation((current) =>
          sortNavigation(
            current.map((item) => (item.id === saved.id ? saved : item)),
          ),
        );
        setNotice("导航项已保存。");
      } else {
        const created = await adminRequest<NavigationItem>(
          "/admin/navigation",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        setNavigation((current) => sortNavigation([...current, created]));
        setNotice("导航项已新增。");
      }
      setNavModal(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleNavigation(item: NavigationItem) {
    setError("");
    setNotice("");
    try {
      const saved = await adminRequest<NavigationItem>(
        `/admin/navigation/${item.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ is_visible: !item.is_visible }),
        },
      );
      setNavigation((current) =>
        sortNavigation(
          current.map((nav) => (nav.id === saved.id ? saved : nav)),
        ),
      );
      setNotice(saved.is_visible ? "导航项已启用。" : "导航项已禁用。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  function openDeleteDialog(next: DeleteState) {
    setDeleteState(next);
    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteState(null);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleting(true);
    setDeleteError("");
    setNotice("");
    try {
      if (deleteState.type === "navigation") {
        await adminRequest(`/admin/navigation/${deleteState.item.id}`, {
          method: "DELETE",
        });
        setNavigation((current) =>
          current.filter((item) => item.id !== deleteState.item.id),
        );
        setNotice("导航项已删除。");
      } else {
        await adminRequest(`/admin/media/${deleteState.item.id}`, {
          method: "DELETE",
        });
        setHomeBackgrounds((current) =>
          current.filter((item) => item.id !== deleteState.item.id),
        );
        setLoginBackgrounds((current) =>
          current.filter((item) => item.id !== deleteState.item.id),
        );
        setNotice("背景资源已删除。");
      }
      setDeleteState(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function deleteDescription() {
    if (!deleteState) return "确定删除该记录吗？";
    if (deleteState.type === "navigation")
      return `确定删除导航「${deleteState.item.label}」吗？`;
    return `确定删除背景资源「${assetLabel(deleteState.item)}」吗？`;
  }

  function openUploadDialog(
    usage: "site_hero" | "login_background" | "general",
  ) {
    setUploadState({ usage });
    setUploadError("");
    setUploadProgress(null);
  }

  function closeUploadDialog() {
    if (uploading) return;
    setUploadState(null);
    setUploadError("");
    setUploadProgress(null);
  }

  async function uploadBackground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadState) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setUploadError("请选择背景图片");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadProgress({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("usage_type", uploadState.usage);
      const asset = await adminUpload<MediaAsset>(
        "/admin/uploads/image",
        payload,
        {
          onProgress: (progress) =>
            setUploadProgress({
              fileName: file.name,
              progress,
              status: "uploading",
            }),
        },
      );
      setUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "success",
      });
      if (uploadState.usage === "site_hero") {
        setHomeBackgrounds((current) => [asset, ...current]);
      } else if (uploadState.usage === "login_background") {
        setLoginBackgrounds((current) => [asset, ...current]);
      } else {
        setBrandAssets((current) => [asset, ...current]);
      }
      setNotice(
        uploadState.usage === "site_hero"
          ? "首页背景已上传。"
          : uploadState.usage === "login_background"
            ? "登录背景已上传。"
            : "品牌资源已导入，可在配置项中选择。",
      );
      window.setTimeout(() => {
        setUploadState(null);
        setUploadProgress(null);
      }, 900);
      formElement.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      setUploadError(message);
      setUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "error",
        error: message,
      });
    } finally {
      setUploading(false);
    }
  }

  async function setBackgroundTarget(
    asset: MediaAsset,
    target: "home" | "login",
  ) {
    setError("");
    setNotice("");
    try {
      if (target === "home") {
        const next = await adminRequest<SiteConfig>(
          "/admin/site/home-background",
          {
            method: "PUT",
            body: JSON.stringify({
              display_mode: "fixed",
              fixed_media_id: asset.id,
            }),
          },
        );
        setConfig(next);
        setNotice(`已设为首页背景：${assetLabel(asset)}`);
      } else {
        const next = await adminRequest<SiteConfig>(
          "/admin/site/login-background",
          {
            method: "PUT",
            body: JSON.stringify({
              display_mode: "fixed",
              fixed_media_id: asset.id,
            }),
          },
        );
        setConfig(next);
        setNotice(`已设为登录背景：${assetLabel(asset)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "设置失败");
    }
  }

  async function copyUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setNotice("背景 URL 已复制。");
    } catch {
      setError("复制失败，请手动复制 URL。");
    }
  }

  function renderValue(item: ConfigItem) {
    const value = getConfigValue(item.key);
    if (item.type === "switch") return value === "true" ? "开启" : "关闭";
    if (item.type === "select")
      return (
        item.options?.find((option) => option.value === value)?.label ??
        truncateValue(value)
      );
    if (item.type === "image") return assetLabel(findAsset(item, value));
    return truncateValue(value);
  }

  function renderConfigGroup() {
    return (
      <section className="motion-surface overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground">
                {activeTab.label}
              </h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                {activeTab.description}
              </p>
            </div>
            {activeGroup === "brand" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => openUploadDialog("general")}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                导入品牌资源
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid divide-y divide-border">
          {activeConfigItems.map((item) => (
            <ConfigItemRow
              key={item.key}
              item={item}
              value={renderValue(item)}
              image={item.type === "image" ? findAsset(item) : undefined}
              onEdit={() => openConfigEdit(item)}
            />
          ))}
        </div>
      </section>
    );
  }

  const pageMeta = allowedGroups.includes("basic")
    ? {
        title: "站点配置",
        description: "维护站点基础信息、品牌资源和前台可见配置。",
      }
    : allowedGroups.includes("hero")
      ? {
          title: "首页配置",
          description: "维护首页 Hero、公告、背景策略和背景资源。",
        }
      : {
          title: "登录页配置",
          description: "维护后台登录页背景策略和背景资源。",
        };

  return (
    <AdminPage title={pageMeta.title} description={pageMeta.description}>
      {error ? (
        <p className="notice-pop mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="notice-pop mb-4 rounded-md bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] px-3 py-2 text-sm font-bold text-[var(--color-success)] dark:text-[var(--color-success)]">
          {notice}
        </p>
      ) : null}

      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
          {visibleTabs.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className={cn(
                "interactive rounded-md px-4 py-2 text-sm font-black transition-colors duration-150",
                activeGroup === group.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SiteConfigSkeleton />
      ) : activeGroup === "navigation" ? (
        <NavigationConfigTable
          items={navigation}
          onCreate={() => openNavModal({ mode: "create" })}
          onEdit={(item) => openNavModal({ mode: "edit", item })}
          onToggle={(item) => void toggleNavigation(item)}
          onDelete={(item) => openDeleteDialog({ type: "navigation", item })}
        />
      ) : activeGroup === "resources" ? (
        <BackgroundResourceList
          items={allBackgrounds}
          onUploadHome={() => openUploadDialog("site_hero")}
          onUploadLogin={() => openUploadDialog("login_background")}
          onSetHome={(item) => void setBackgroundTarget(item, "home")}
          onSetLogin={(item) => void setBackgroundTarget(item, "login")}
          onCopy={(item) => void copyUrl(item)}
          onDelete={(item) => openDeleteDialog({ type: "background", item })}
        />
      ) : (
        renderConfigGroup()
      )}

      <ConfigEditDialog
        state={configEdit}
        value={configEdit?.value ?? ""}
        assets={
          configEdit?.item.assetUsage === "login_background"
            ? activeLoginBackgrounds
            : configEdit?.item.assetUsage === "general"
              ? brandAssets
              : activeHomeBackgrounds
        }
        error={modalError}
        saving={saving}
        onValueChange={(value) =>
          setConfigEdit((current) =>
            current ? { ...current, value } : current,
          )
        }
        onClose={closeConfigEdit}
        onSubmit={saveConfigItem}
      />

      <NavigationEditDialog
        state={navModal}
        error={modalError}
        saving={saving}
        onClose={closeNavModal}
        onSubmit={saveNavigation}
      />

      <BackgroundUploadDialog
        state={uploadState}
        error={uploadError}
        uploading={uploading}
        progress={uploadProgress}
        onClose={closeUploadDialog}
        onSubmit={uploadBackground}
      />

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

export default function AdminSiteConfigPage() {
  return (
    <SiteConfigManager
      initialGroup="basic"
      allowedGroups={["basic", "brand"]}
    />
  );
}

function ConfigItemRow({
  item,
  value,
  image,
  onEdit,
}: {
  item: ConfigItem;
  value: string;
  image?: MediaAsset;
  onEdit: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(12rem,1.05fr)_minmax(0,2fr)_2.5rem] md:items-center">
      <div className="min-w-0">
        <p className="font-black text-foreground">{item.label}</p>
        <p className="mt-1 text-xs font-bold leading-5 text-muted-foreground">
          {item.description}
        </p>
      </div>
      <div className="col-span-2 min-w-0 md:col-span-1">
        {image ? (
          <div className="flex min-w-0 items-center gap-3 rounded-md bg-muted px-3 py-2">
            <img
              src={getAssetUrl(image.url)}
              alt={assetLabel(image)}
              className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-border"
            />
            <div className="min-w-0">
              <p
                className="truncate text-sm font-black text-foreground"
                title={assetLabel(image)}
              >
                {assetLabel(image)}
              </p>
              <p
                className="truncate text-xs font-bold text-muted-foreground"
                title={image.url}
              >
                {image.url}
              </p>
            </div>
          </div>
        ) : (
          <p
            className="truncate rounded-md bg-muted px-3 py-2 text-sm font-bold text-muted-foreground"
            title={value}
          >
            {value}
          </p>
        )}
      </div>
      <button
        type="button"
        className="interactive row-start-1 grid h-10 w-10 place-items-center justify-self-end rounded-md bg-secondary text-secondary-foreground ring-1 ring-border hover:bg-accent hover:text-accent-foreground md:row-auto"
        onClick={onEdit}
        aria-label={`编辑${item.label}`}
        title="编辑"
      >
        <Edit className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ConfigEditDialog({
  state,
  value,
  assets,
  error,
  saving,
  onValueChange,
  onClose,
  onSubmit,
}: {
  state: ConfigEditState | null;
  value: string;
  assets: MediaAsset[];
  error: string;
  saving: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const item = state?.item;
  return (
    <AdminModal
      open={Boolean(state)}
      title={item ? `编辑配置：${item.label}` : "编辑配置"}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" form="site-config-edit-form" disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </>
      }
    >
      {item ? (
        <form
          id="site-config-edit-form"
          onSubmit={onSubmit}
          className="grid gap-5"
        >
          <ModalError message={error} />
          <div>
            <p className="text-sm font-black text-foreground">{item.label}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-muted-foreground">
              {item.description}
            </p>
          </div>
          {item.type === "textarea" ? (
            <Textarea
              name="value"
              rows={6}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={item.placeholder}
            />
          ) : item.type === "select" ? (
            <CustomSelect
              name="value"
              value={value || item.options?.[0]?.value || ""}
              onChange={onValueChange}
              options={(item.options ?? []).map((option) => ({
                ...option,
                description: option.value,
              }))}
            />
          ) : item.type === "switch" ? (
            <div className="grid gap-2">
              <input
                type="hidden"
                name="value"
                value={value === "true" ? "true" : "false"}
              />
              <Switch
                checked={value === "true"}
                onCheckedChange={(checked) =>
                  onValueChange(checked ? "true" : "false")
                }
                label={value === "true" ? "开启" : "关闭"}
                className="min-h-11 rounded-md border border-border bg-background px-4"
              />
            </div>
          ) : item.type === "image" ? (
            <ImagePicker
              name="value"
              value={value}
              assets={assets}
              onChange={onValueChange}
            />
          ) : (
            <Input
              name="value"
              type={item.type === "url" ? "text" : "text"}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={item.placeholder}
            />
          )}
        </form>
      ) : null}
    </AdminModal>
  );
}

function NavigationConfigTable({
  items,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
}: {
  items: NavigationItem[];
  onCreate: () => void;
  onEdit: (item: NavigationItem) => void;
  onToggle: (item: NavigationItem) => void;
  onDelete: (item: NavigationItem) => void;
}) {
  const columns = useMemo<Array<AdminDataTableColumn<NavigationItem>>>(
    () => [
      {
        key: "label",
        title: "名称",
        width: 150,
        ellipsis: true,
        render: (item) => (
          <span className="font-black text-foreground">{item.label}</span>
        ),
      },
      {
        key: "href",
        title: "链接",
        minWidth: 260,
        ellipsis: true,
        render: (item) => item.href,
      },
      {
        key: "sort",
        title: "排序",
        width: 100,
        render: (item) => item.sort_order,
      },
      {
        key: "target",
        title: "打开方式",
        width: 120,
        render: (item) => (item.target === "blank" ? "新窗口" : "当前页"),
      },
      {
        key: "status",
        title: "状态",
        width: 100,
        render: (item) => (
          <StatusTag
            status={item.is_visible ? "active" : "inactive"}
            label={item.is_visible ? "显示" : "隐藏"}
          />
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: 160,
        align: "center",
        sticky: "right",
        render: (item) => (
          <RowActions
            actions={[
              {
                key: "toggle",
                label: item.is_visible ? "禁用" : "启用",
                icon: item.is_visible ? (
                  <EyeOff className={rowActionIconClass} aria-hidden="true" />
                ) : (
                  <Eye className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "success",
                onClick: () => onToggle(item),
              },
              {
                key: "edit",
                label: "编辑",
                icon: (
                  <Edit className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "edit",
                onClick: () => onEdit(item),
              },
              {
                key: "delete",
                label: "删除",
                icon: (
                  <Trash2 className={rowActionIconClass} aria-hidden="true" />
                ),
                variant: "delete",
                onClick: () => onDelete(item),
              },
            ]}
          />
        ),
      },
    ],
    [onDelete, onEdit, onToggle],
  );

  return (
    <section className="motion-surface overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-lg font-black text-foreground">导航配置</h2>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            新增和编辑都通过弹窗完成。
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增导航
        </Button>
      </div>
      <AdminDataTable
        columns={columns}
        data={items}
        rowKey="id"
        emptyText="暂无导航数据"
        minWidth={860}
        className="rounded-none border-x-0 border-b-0 shadow-none"
      />
    </section>
  );
}

function NavigationEditDialog({
  state,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  state: NavModalState;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [target, setTarget] = useState("self");

  useEffect(() => {
    if (state) setTarget(state.item?.target ?? "self");
  }, [state]);

  return (
    <AdminModal
      open={Boolean(state)}
      title={state?.mode === "edit" ? "编辑导航" : "新增导航"}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" form="navigation-edit-form" disabled={saving}>
            {saving ? "提交中..." : "提交"}
          </Button>
        </>
      }
    >
      {state ? (
        <form
          id="navigation-edit-form"
          key={state.item?.id ?? "new"}
          onSubmit={onSubmit}
          className="grid gap-4"
        >
          <ModalError message={error} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span>
                <span className="text-red-500">*</span> 名称
              </span>
              <Input
                name="label"
                required
                defaultValue={state.item?.label ?? ""}
                placeholder="请输入导航名称"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span>
                <span className="text-red-500">*</span> 链接
              </span>
              <Input
                name="href"
                required
                defaultValue={state.item?.href ?? ""}
                placeholder="/posts"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-foreground">
              排序
              <Input
                name="sort_order"
                type="number"
                defaultValue={state.item?.sort_order ?? 0}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-foreground">
              打开方式
              <CustomSelect
                name="target"
                value={target}
                onChange={setTarget}
                options={[
                  { label: "当前页", value: "self" },
                  { label: "新窗口", value: "blank" },
                ]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-foreground">
              图标标识
              <Input
                name="icon"
                defaultValue={state.item?.icon ?? ""}
                placeholder="可选，例如 Home"
              />
            </label>
            <Checkbox
              name="is_visible"
              defaultChecked={state.item?.is_visible ?? true}
              label="前台显示"
              className="self-end rounded-md border border-border bg-muted px-3 py-2 text-foreground"
            />
          </div>
        </form>
      ) : null}
    </AdminModal>
  );
}

function BackgroundResourceList({
  items,
  onUploadHome,
  onUploadLogin,
  onSetHome,
  onSetLogin,
  onCopy,
  onDelete,
}: {
  items: MediaAsset[];
  onUploadHome: () => void;
  onUploadLogin: () => void;
  onSetHome: (item: MediaAsset) => void;
  onSetLogin: (item: MediaAsset) => void;
  onCopy: (item: MediaAsset) => void;
  onDelete: (item: MediaAsset) => void;
}) {
  const columns = useMemo<Array<AdminDataTableColumn<MediaAsset>>>(
    () => [
      {
        key: "thumbnail",
        title: "缩略图",
        width: 120,
        render: (item) => (
          <img
            src={getAssetUrl(item.url)}
            alt={assetLabel(item)}
            className="h-14 w-20 rounded-md object-cover ring-1 ring-border"
          />
        ),
      },
      {
        key: "file",
        title: "文件名",
        width: 220,
        ellipsis: true,
        render: (item) => (
          <div className="min-w-0">
            <p
              className="truncate font-black text-foreground"
              title={assetLabel(item)}
            >
              {assetLabel(item)}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
              {item.width && item.height
                ? `${item.width} x ${item.height}`
                : item.mime_type}
            </p>
          </div>
        ),
      },
      {
        key: "usage",
        title: "使用位置",
        width: 120,
        render: (item) => (
          <StatusTag
            status={item.usage_type}
            label={usageLabels[item.usage_type] ?? item.usage_type}
            map={{
              site_hero: { label: "首页背景", variant: "primary" },
              login_background: { label: "登录背景", variant: "info" },
              general: { label: "品牌资源", variant: "neutral" },
            }}
          />
        ),
      },
      {
        key: "url",
        title: "URL",
        minWidth: 260,
        ellipsis: true,
        render: (item) => item.url,
      },
      {
        key: "size",
        title: "大小",
        width: 130,
        render: (item) => formatBytes(item.size),
      },
      {
        key: "actions",
        title: "操作",
        width: 300,
        align: "right",
        sticky: "right",
        render: (item) => {
          const canSetHome = item.usage_type === "site_hero";
          const canSetLogin = item.usage_type === "login_background";
          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canSetHome}
                onClick={() => onSetHome(item)}
              >
                设为首页
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canSetLogin}
                onClick={() => onSetLogin(item)}
              >
                设为登录
              </Button>
              <RowActions
                actions={[
                  {
                    key: "copy",
                    label: "复制 URL",
                    icon: (
                      <Copy className={rowActionIconClass} aria-hidden="true" />
                    ),
                    variant: "neutral",
                    onClick: () => onCopy(item),
                  },
                  {
                    key: "delete",
                    label: "删除",
                    icon: (
                      <Trash2
                        className={rowActionIconClass}
                        aria-hidden="true"
                      />
                    ),
                    variant: "delete",
                    onClick: () => onDelete(item),
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [onCopy, onDelete, onSetHome, onSetLogin],
  );

  return (
    <section className="motion-surface overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-lg font-black text-foreground">背景资源</h2>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            背景图片上传和设定都在这里处理。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onUploadHome}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            上传首页背景
          </Button>
          <Button type="button" variant="ghost" onClick={onUploadLogin}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            上传登录背景
          </Button>
        </div>
      </div>
      <AdminDataTable
        columns={columns}
        data={items}
        rowKey="id"
        emptyText="暂无背景资源"
        minWidth={980}
        className="rounded-none border-x-0 border-b-0 shadow-none"
      />
    </section>
  );
}

function BackgroundUploadDialog({
  state,
  error,
  uploading,
  progress,
  onClose,
  onSubmit,
}: {
  state: UploadState;
  error: string;
  uploading: boolean;
  progress: UploadProgressItem | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <AdminModal
      open={Boolean(state)}
      title={
        state?.usage === "site_hero"
          ? "上传首页背景"
          : state?.usage === "login_background"
            ? "上传登录背景"
            : "导入品牌资源"
      }
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </Button>
          <Button
            type="submit"
            form="background-upload-form"
            disabled={uploading}
          >
            {uploading ? "上传中..." : "上传"}
          </Button>
        </>
      }
    >
      {state ? (
        <form
          id="background-upload-form"
          onSubmit={onSubmit}
          className="grid gap-5"
        >
          <ModalError message={error} />
          <label className="grid gap-2 text-sm font-bold text-foreground">
            {state.usage === "general" ? "品牌图片" : "背景图片"}
            <span className={buttonVariants({ variant: "secondary" })}>
              选择文件
              <input
                name="file"
                type="file"
                required
                accept={
                  state.usage === "general"
                    ? "image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,image/webp"
                    : "image/jpeg,image/png,image/webp"
                }
                className="sr-only"
              />
            </span>
          </label>
          <UploadProgress item={progress} />
          <p className="rounded-md bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">
            {state.usage === "general"
              ? "支持 ICO、PNG、SVG、WebP。导入后可用于 Favicon 和前后台 Logo。"
              : "支持 JPG、PNG、WebP。上传后会进入背景资源列表。"}
          </p>
        </form>
      ) : null}
    </AdminModal>
  );
}
