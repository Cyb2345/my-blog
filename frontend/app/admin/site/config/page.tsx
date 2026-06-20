"use client";

import { Copy, Edit, EyeOff, Eye, Image, Plus, Trash2, Upload } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import { inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { UploadProgress, type UploadProgressItem } from "@/components/admin/UploadProgress";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { cn, getAssetUrl } from "@/lib/utils";
import type { MediaAsset, NavigationItem, SiteConfig } from "@/types/blog";

type ConfigFieldType = "text" | "textarea" | "url" | "select" | "switch" | "image";
type ConfigGroupKey = "basic" | "hero" | "notice" | "navigation" | "homeBackground" | "loginBackground" | "resources";
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
  assetUsage?: "site_hero" | "login_background";
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
  usage: "site_hero" | "login_background";
} | null;

type DeleteState =
  | { type: "navigation"; item: NavigationItem }
  | { type: "background"; item: MediaAsset }
  | null;

const groupTabs: Array<{ key: ConfigGroupKey; label: string; description: string }> = [
  { key: "basic", label: "基础信息", description: "站点名称、副标题和描述。" },
  { key: "hero", label: "首页 Hero", description: "首页首屏文案、按钮和滚动提示。" },
  { key: "notice", label: "首页公告", description: "首页欢迎公告文案。" },
  { key: "navigation", label: "导航配置", description: "前台导航链接和显示状态。" },
  { key: "homeBackground", label: "首页背景", description: "首页背景策略和默认背景。" },
  { key: "loginBackground", label: "登录背景", description: "登录页背景策略。" },
  { key: "resources", label: "背景资源", description: "上传、设置和删除背景图片。" },
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

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/10 bg-paper/70 p-8 text-center text-sm font-bold text-ink/45 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
      {children}
    </div>
  );
}

export default function AdminSiteConfigPage() {
  const [activeGroup, setActiveGroup] = useState<ConfigGroupKey>("basic");
  const [config, setConfig] = useState<SiteConfig>({});
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [loginBackgrounds, setLoginBackgrounds] = useState<MediaAsset[]>([]);
  const [homeBackgrounds, setHomeBackgrounds] = useState<MediaAsset[]>([]);
  const [configEdit, setConfigEdit] = useState<ConfigEditState | null>(null);
  const [navModal, setNavModal] = useState<NavModalState>(null);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const activeTab = groupTabs.find((item) => item.key === activeGroup) ?? groupTabs[0];
  const activeConfigItems = configItems.filter((item) => item.group === activeGroup);
  const allBackgrounds = useMemo(() => [...homeBackgrounds, ...loginBackgrounds], [homeBackgrounds, loginBackgrounds]);
  const activeHomeBackgrounds = homeBackgrounds.filter((item) => item.is_active);
  const activeLoginBackgrounds = loginBackgrounds.filter((item) => item.is_active);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [configData, navData, loginBgData, homeBgData] = await Promise.all([
        adminRequest<SiteConfig>("/admin/site/config"),
        adminRequest<NavigationItem[]>("/admin/navigation"),
        adminRequest<MediaAsset[]>("/admin/site/login-backgrounds"),
        adminRequest<MediaAsset[]>("/admin/site/home-backgrounds"),
      ]);
      setConfig(configData);
      setNavigation(sortNavigation(navData));
      setLoginBackgrounds(loginBgData);
      setHomeBackgrounds(homeBgData);
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
    const mediaId = Number(value);
    if (!Number.isFinite(mediaId) || !mediaId) return undefined;
    const source = item.assetUsage === "login_background" ? loginBackgrounds : homeBackgrounds;
    return source.find((asset) => asset.id === mediaId);
  }

  function openConfigEdit(item: ConfigItem) {
    setModalError("");
    setConfigEdit({ item, value: getConfigValue(item.key) });
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
        const displayMode = item.key === "home_background_mode" ? nextValue : getConfigValue("home_background_mode") || "fixed";
        const fixedValue = item.key === "home_background_fixed_id" ? nextValue : getConfigValue("home_background_fixed_id");
        const nextConfig = await adminRequest<SiteConfig>("/admin/site/home-background", {
          method: "PUT",
          body: JSON.stringify({
            display_mode: displayMode,
            fixed_media_id: fixedValue ? Number(fixedValue) : null,
          }),
        });
        setConfig(nextConfig);
      } else if (item.kind === "loginBackground") {
        const displayMode = item.key === "login_background_mode" ? nextValue : getConfigValue("login_background_mode") || "random";
        const fixedValue = item.key === "login_background_fixed_id" ? nextValue : getConfigValue("login_background_fixed_id");
        const nextConfig = await adminRequest<SiteConfig>("/admin/site/login-background", {
          method: "PUT",
          body: JSON.stringify({
            display_mode: displayMode,
            fixed_media_id: fixedValue ? Number(fixedValue) : null,
          }),
        });
        setConfig(nextConfig);
      } else {
        const nextConfig = { ...config, [item.key]: nextValue };
        const saved = await adminRequest<SiteConfig>("/admin/site/config", {
          method: "PUT",
          body: JSON.stringify({ values: nextConfig }),
        });
        setConfig((current) => ({ ...current, [item.key]: saved[item.key] ?? nextValue }));
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
        const saved = await adminRequest<NavigationItem>(`/admin/navigation/${navModal.item.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNavigation((current) => sortNavigation(current.map((item) => item.id === saved.id ? saved : item)));
        setNotice("导航项已保存。");
      } else {
        const created = await adminRequest<NavigationItem>("/admin/navigation", {
          method: "POST",
          body: JSON.stringify(payload),
        });
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
      const saved = await adminRequest<NavigationItem>(`/admin/navigation/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_visible: !item.is_visible }),
      });
      setNavigation((current) => sortNavigation(current.map((nav) => nav.id === saved.id ? saved : nav)));
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
        await adminRequest(`/admin/navigation/${deleteState.item.id}`, { method: "DELETE" });
        setNavigation((current) => current.filter((item) => item.id !== deleteState.item.id));
        setNotice("导航项已删除。");
      } else {
        await adminRequest(`/admin/media/${deleteState.item.id}`, { method: "DELETE" });
        setHomeBackgrounds((current) => current.filter((item) => item.id !== deleteState.item.id));
        setLoginBackgrounds((current) => current.filter((item) => item.id !== deleteState.item.id));
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
    if (deleteState.type === "navigation") return `确定删除导航「${deleteState.item.label}」吗？`;
    return `确定删除背景资源「${assetLabel(deleteState.item)}」吗？`;
  }

  function openUploadDialog(usage: "site_hero" | "login_background") {
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
    setUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("usage_type", uploadState.usage);
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", payload, {
        onProgress: (progress) => setUploadProgress({ fileName: file.name, progress, status: "uploading" }),
      });
      setUploadProgress({ fileName: file.name, progress: 100, status: "success" });
      if (uploadState.usage === "site_hero") {
        setHomeBackgrounds((current) => [asset, ...current]);
      } else {
        setLoginBackgrounds((current) => [asset, ...current]);
      }
      setNotice(uploadState.usage === "site_hero" ? "首页背景已上传。" : "登录背景已上传。");
      window.setTimeout(() => {
        setUploadState(null);
        setUploadProgress(null);
      }, 900);
      formElement.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      setUploadError(message);
      setUploadProgress({ fileName: file.name, progress: 100, status: "error", error: message });
    } finally {
      setUploading(false);
    }
  }

  async function setBackgroundTarget(asset: MediaAsset, target: "home" | "login") {
    setError("");
    setNotice("");
    try {
      if (target === "home") {
        const next = await adminRequest<SiteConfig>("/admin/site/home-background", {
          method: "PUT",
          body: JSON.stringify({ display_mode: "fixed", fixed_media_id: asset.id }),
        });
        setConfig(next);
        setNotice(`已设为首页背景：${assetLabel(asset)}`);
      } else {
        const next = await adminRequest<SiteConfig>("/admin/site/login-background", {
          method: "PUT",
          body: JSON.stringify({ display_mode: "fixed", fixed_media_id: asset.id }),
        });
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
    if (item.type === "select") return item.options?.find((option) => option.value === value)?.label ?? truncateValue(value);
    if (item.type === "image") return assetLabel(findAsset(item, value));
    return truncateValue(value);
  }

  function renderConfigGroup() {
    return (
      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-ink/10 px-4 py-4 dark:border-white/10 sm:px-5">
          <h2 className="text-lg font-black text-ink dark:text-slate-100">{activeTab.label}</h2>
          <p className="mt-1 text-sm font-bold text-ink/50 dark:text-slate-400">{activeTab.description}</p>
        </div>
        <div className="grid divide-y divide-ink/10 dark:divide-white/10">
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

  return (
    <>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-lg border border-ink/10 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-900">
          {groupTabs.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className={cn(
                "interactive rounded-md px-4 py-2 text-sm font-black transition-colors duration-150",
                activeGroup === group.key
                  ? "bg-ocean text-white dark:bg-sky-400 dark:text-slate-950"
                  : "text-ink/60 hover:bg-paper hover:text-ink dark:text-slate-300 dark:hover:bg-white/10",
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <EmptyState>正在加载站点配置...</EmptyState>
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
        assets={configEdit?.item.assetUsage === "login_background" ? activeLoginBackgrounds : activeHomeBackgrounds}
        error={modalError}
        saving={saving}
        onValueChange={(value) => setConfigEdit((current) => current ? { ...current, value } : current)}
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
    </>
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
        <p className="font-black text-ink dark:text-slate-100">{item.label}</p>
        <p className="mt-1 text-xs font-bold leading-5 text-ink/45 dark:text-slate-500">{item.description}</p>
      </div>
      <div className="col-span-2 min-w-0 md:col-span-1">
        {image ? (
          <div className="flex min-w-0 items-center gap-3 rounded-md bg-paper px-3 py-2 dark:bg-slate-950">
            <img src={getAssetUrl(image.url)} alt={assetLabel(image)} className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-ink/10 dark:ring-white/10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-ink dark:text-slate-100" title={assetLabel(image)}>{assetLabel(image)}</p>
              <p className="truncate text-xs font-bold text-ink/45 dark:text-slate-500" title={image.url}>{image.url}</p>
            </div>
          </div>
        ) : (
          <p className="truncate rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink/60 dark:bg-slate-950 dark:text-slate-400" title={value}>
            {value}
          </p>
        )}
      </div>
      <button
        type="button"
        className="interactive row-start-1 grid h-10 w-10 place-items-center justify-self-end rounded-md bg-white/70 text-ocean ring-1 ring-ink/10 hover:bg-white dark:bg-white/10 dark:text-sky-200 dark:ring-white/10 dark:hover:bg-white/15 md:row-auto"
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
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button type="submit" form="site-config-edit-form" disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
        </>
      }
    >
      {item ? (
        <form id="site-config-edit-form" onSubmit={onSubmit} className="grid gap-5">
          <ModalError message={error} />
          <div>
            <p className="text-sm font-black text-ink dark:text-slate-100">{item.label}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-ink/50 dark:text-slate-500">{item.description}</p>
          </div>
          {item.type === "textarea" ? (
            <textarea
              name="value"
              rows={6}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={item.placeholder}
              className={inputClass}
            />
          ) : item.type === "select" ? (
            <CustomSelect
              name="value"
              value={value || item.options?.[0]?.value || ""}
              onChange={onValueChange}
              options={(item.options ?? []).map((option) => ({ ...option, description: option.value }))}
            />
          ) : item.type === "switch" ? (
            <div className="grid gap-2">
              <input type="hidden" name="value" value={value === "true" ? "true" : "false"} />
              <button
                type="button"
                onClick={() => onValueChange(value === "true" ? "false" : "true")}
                className={cn(
                  "interactive flex min-h-11 items-center justify-between rounded-md border px-4 text-sm font-black",
                  value === "true"
                    ? "border-ocean/30 bg-ocean/10 text-ocean dark:border-[color-mix(in_srgb,var(--primary)_44%,transparent)] dark:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] dark:text-white"
                    : "border-ink/10 bg-paper text-ink/55 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text-muted)]",
                )}
              >
                <span>{value === "true" ? "开启" : "关闭"}</span>
                <span className={cn("relative h-6 w-11 rounded-full transition-colors", value === "true" ? "bg-ocean dark:bg-[var(--primary)]" : "bg-ink/18 dark:bg-[var(--surface-soft)]")}>
                  <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform", value === "true" ? "translate-x-6" : "translate-x-1")} />
                </span>
              </button>
            </div>
          ) : item.type === "image" ? (
            <ImagePicker name="value" value={value} assets={assets} onChange={onValueChange} />
          ) : (
            <input
              name="value"
              type={item.type === "url" ? "text" : "text"}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={item.placeholder}
              className={inputClass}
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
  return (
    <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
        <div>
          <h2 className="text-lg font-black text-ink dark:text-slate-100">导航配置</h2>
          <p className="mt-1 text-sm font-bold text-ink/50 dark:text-slate-400">新增和编辑都通过弹窗完成。</p>
        </div>
        <Button type="button" variant="ghost" onClick={onCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增导航
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[860px] table-fixed text-sm">
          <colgroup>
            <col className="w-[150px]" />
            <col />
            <col className="w-[100px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
            <col className="w-[220px]" />
          </colgroup>
          <thead className="bg-paper text-left text-ink/60 dark:bg-slate-950/80 dark:text-slate-400">
            <tr>
              <th className="p-3">名称</th>
              <th className="p-3">链接</th>
              <th className="p-3">排序</th>
              <th className="p-3">打开方式</th>
              <th className="p-3">状态</th>
              <th className="p-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-ink/10 transition-colors hover:bg-paper/60 dark:border-white/10 dark:hover:bg-white/5">
                <td className="p-3 font-black text-ink dark:text-slate-100">{item.label}</td>
                <td className="truncate p-3 text-ink/65 dark:text-slate-400" title={item.href}>{item.href}</td>
                <td className="p-3 text-ink/65 dark:text-slate-400">{item.sort_order}</td>
                <td className="p-3 text-ink/65 dark:text-slate-400">{item.target === "blank" ? "新窗口" : "当前页"}</td>
                <td className="p-3">
                  <span className={item.is_visible ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200"}>
                    {item.is_visible ? "显示" : "隐藏"}
                  </span>
                </td>
                <td className="p-3">
                  <AdminTableActions>
                    <AdminTableActionButton
                      variant="success"
                      onClick={() => onToggle(item)}
                      aria-label={item.is_visible ? "禁用" : "启用"}
                      title={item.is_visible ? "禁用" : "启用"}
                    >
                      {item.is_visible ? <EyeOff className={adminTableActionIconClass} aria-hidden="true" /> : <Eye className={adminTableActionIconClass} aria-hidden="true" />}
                    </AdminTableActionButton>
                    <AdminTableActionButton
                      variant="edit"
                      onClick={() => onEdit(item)}
                      aria-label="编辑"
                      title="编辑"
                    >
                      <Edit className={adminTableActionIconClass} aria-hidden="true" />
                    </AdminTableActionButton>
                    <AdminTableActionButton
                      variant="delete"
                      onClick={() => onDelete(item)}
                      aria-label="删除"
                      title="删除"
                    >
                      <Trash2 className={adminTableActionIconClass} aria-hidden="true" />
                    </AdminTableActionButton>
                  </AdminTableActions>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-slate-500">暂无导航数据</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button type="submit" form="navigation-edit-form" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
        </>
      }
    >
      {state ? (
        <form id="navigation-edit-form" key={state.item?.id ?? "new"} onSubmit={onSubmit} className="grid gap-4">
          <ModalError message={error} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
              <span><span className="text-red-500">*</span> 名称</span>
              <input name="label" required defaultValue={state.item?.label ?? ""} placeholder="请输入导航名称" className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
              <span><span className="text-red-500">*</span> 链接</span>
              <input name="href" required defaultValue={state.item?.href ?? ""} placeholder="/posts" className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
              排序
              <input name="sort_order" type="number" defaultValue={state.item?.sort_order ?? 0} className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
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
            <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
              图标标识
              <input name="icon" defaultValue={state.item?.icon ?? ""} placeholder="可选，例如 Home" className={inputClass} />
            </label>
            <label className="flex items-center gap-3 self-end rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm font-bold text-ink dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
              <input name="is_visible" type="checkbox" defaultChecked={state.item?.is_visible ?? true} className="h-4 w-4 accent-blue-500" />
              前台显示
            </label>
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
  return (
    <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
        <div>
          <h2 className="text-lg font-black text-ink dark:text-slate-100">背景资源</h2>
          <p className="mt-1 text-sm font-bold text-ink/50 dark:text-slate-400">背景图片上传和设定都在这里处理。</p>
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
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[980px] table-fixed text-sm">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[220px]" />
            <col className="w-[120px]" />
            <col />
            <col className="w-[130px]" />
            <col className="w-[300px]" />
          </colgroup>
          <thead className="bg-paper text-left text-ink/60 dark:bg-slate-950/80 dark:text-slate-400">
            <tr>
              <th className="p-3">缩略图</th>
              <th className="p-3">文件名</th>
              <th className="p-3">使用位置</th>
              <th className="p-3">URL</th>
              <th className="p-3">大小</th>
              <th className="p-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const canSetHome = item.usage_type === "site_hero";
              const canSetLogin = item.usage_type === "login_background";
              return (
                <tr key={`${item.usage_type}-${item.id}`} className="border-t border-ink/10 transition-colors hover:bg-paper/60 dark:border-white/10 dark:hover:bg-white/5">
                  <td className="p-3">
                    <img src={getAssetUrl(item.url)} alt={assetLabel(item)} className="h-14 w-20 rounded-md object-cover ring-1 ring-ink/10 dark:ring-white/10" />
                  </td>
                  <td className="p-3">
                    <p className="truncate font-black text-ink dark:text-slate-100" title={assetLabel(item)}>{assetLabel(item)}</p>
                    <p className="mt-1 text-xs font-bold text-ink/45 dark:text-slate-500">{item.width && item.height ? `${item.width} x ${item.height}` : item.mime_type}</p>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{usageLabels[item.usage_type] ?? item.usage_type}</td>
                  <td className="truncate p-3 text-ink/55 dark:text-slate-400" title={item.url}>{item.url}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatBytes(item.size)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" disabled={!canSetHome} onClick={() => onSetHome(item)}>
                        设为首页
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" disabled={!canSetLogin} onClick={() => onSetLogin(item)}>
                        设为登录
                      </Button>
                      <AdminTableActionButton
                        variant="neutral"
                        onClick={() => onCopy(item)}
                        aria-label="复制 URL"
                        title="复制 URL"
                      >
                        <Copy className={adminTableActionIconClass} aria-hidden="true" />
                      </AdminTableActionButton>
                      <AdminTableActionButton
                        variant="delete"
                        onClick={() => onDelete(item)}
                        aria-label="删除"
                        title="删除"
                      >
                        <Trash2 className={adminTableActionIconClass} aria-hidden="true" />
                      </AdminTableActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-sm font-bold text-ink/45 dark:text-slate-500">暂无背景资源</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
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
      title={state?.usage === "site_hero" ? "上传首页背景" : "上传登录背景"}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={uploading}>取消</Button>
          <Button type="submit" form="background-upload-form" disabled={uploading}>{uploading ? "上传中..." : "上传"}</Button>
        </>
      }
    >
      {state ? (
        <form id="background-upload-form" onSubmit={onSubmit} className="grid gap-5">
          <ModalError message={error} />
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            背景图片
            <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className={inputClass} />
          </label>
          <UploadProgress item={progress} />
          <p className="rounded-md bg-paper px-3 py-2 text-xs font-bold text-ink/50 dark:bg-slate-950 dark:text-slate-500">
            支持 JPG、PNG、WebP。上传后会进入背景资源列表。
          </p>
        </form>
      ) : null}
    </AdminModal>
  );
}
