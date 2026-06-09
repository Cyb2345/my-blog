"use client";

import { Edit, Image, Plus, Save, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import type { MediaAsset, NavigationItem, SiteConfig } from "@/types/blog";

type ConfigField = {
  key: string;
  label: string;
  type: "input" | "textarea" | "select";
  options?: Array<{ label: string; value: string }>;
};

const configFields: ConfigField[] = [
  { key: "site_name", label: "站点名称", type: "input" },
  { key: "site_subtitle", label: "站点副标题", type: "input" },
  { key: "site_description", label: "站点描述", type: "textarea" },
  { key: "hero_badge", label: "首页标签", type: "input" },
  { key: "hero_title", label: "首页主标题", type: "textarea" },
  { key: "hero_description", label: "首页副标题", type: "textarea" },
  { key: "hero_primary_text", label: "Hero 主按钮文字", type: "input" },
  { key: "hero_primary_href", label: "Hero 主按钮链接", type: "input" },
  { key: "hero_secondary_text", label: "Hero 次按钮文字", type: "input" },
  { key: "hero_secondary_href", label: "Hero 次按钮链接", type: "input" },
  { key: "hero_image", label: "首页默认背景图 URL", type: "input" },
  {
    key: "hero_image_display",
    label: "首页背景图显示方式",
    type: "select",
    options: [
      { label: "覆盖铺满", value: "cover" },
      { label: "完整显示", value: "contain" },
      { label: "原始尺寸", value: "auto" },
    ],
  },
  { key: "home_notice_text", label: "首页欢迎公告文案", type: "textarea" },
  {
    key: "home_show_scroll_indicator",
    label: "显示滚动提示箭头",
    type: "select",
    options: [
      { label: "显示", value: "true" },
      { label: "隐藏", value: "false" },
    ],
  },
];

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<SiteConfig>({});
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [backgrounds, setBackgrounds] = useState<MediaAsset[]>([]);
  const [homeBackgrounds, setHomeBackgrounds] = useState<MediaAsset[]>([]);
  const [editingNav, setEditingNav] = useState<NavigationItem | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [configData, navData, bgData, homeBgData] = await Promise.all([
        adminRequest<SiteConfig>("/admin/site/config"),
        adminRequest<NavigationItem[]>("/admin/navigation"),
        adminRequest<MediaAsset[]>("/admin/site/login-backgrounds"),
        adminRequest<MediaAsset[]>("/admin/site/home-backgrounds"),
      ]);
      setConfig(configData);
      setNavigation(navData);
      setBackgrounds(bgData);
      setHomeBackgrounds(homeBgData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const values: SiteConfig = {};
    for (const field of configFields) values[field.key] = String(form.get(field.key) ?? "");
    try {
      const next = await adminRequest<SiteConfig>("/admin/site/config", {
        method: "PUT",
        body: JSON.stringify({ values }),
      });
      setConfig(next);
      setNotice("站点配置已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveLoginBackground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const displayMode = String(form.get("display_mode") || "random");
    const fixed = String(form.get("fixed_media_id") || "");
    try {
      const next = await adminRequest<SiteConfig>("/admin/site/login-background", {
        method: "PUT",
        body: JSON.stringify({
          display_mode: displayMode,
          fixed_media_id: fixed ? Number(fixed) : null,
        }),
      });
      setConfig(next);
      setNotice("登录背景策略已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function saveHomeBackground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const displayMode = String(form.get("display_mode") || "fixed");
    const fixed = String(form.get("fixed_media_id") || "");
    try {
      const next = await adminRequest<SiteConfig>("/admin/site/home-background", {
        method: "PUT",
        body: JSON.stringify({
          display_mode: displayMode,
          fixed_media_id: fixed ? Number(fixed) : null,
        }),
      });
      setConfig(next);
      setNotice("首页背景策略已保存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function uploadBackground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("请选择登录背景图片");
      return;
    }
    setError("");
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("usage_type", "login_background");
      await adminUpload<MediaAsset>("/admin/uploads/image", payload);
      formElement.reset();
      await load();
      setNotice("登录背景已上传。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
  }

  async function uploadHomeBackground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("请选择首页背景图片");
      return;
    }
    setError("");
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("usage_type", "site_hero");
      await adminUpload<MediaAsset>("/admin/uploads/image", payload);
      formElement.reset();
      await load();
      setNotice("首页背景已上传。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
  }

  async function saveNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      label: form.get("label"),
      href: form.get("href"),
      icon: form.get("icon") || null,
      sort_order: Number(form.get("sort_order") || 0),
      target: form.get("target"),
      is_visible: form.get("is_visible") === "on",
    };
    try {
      if (editingNav) {
        await adminRequest(`/admin/navigation/${editingNav.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("导航项已保存。");
      } else {
        await adminRequest("/admin/navigation", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("导航项已新增。");
      }
      setEditingNav(null);
      formElement.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function deleteNavigation(item: NavigationItem) {
    if (!window.confirm(`确认删除导航「${item.label}」吗？`)) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/navigation/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("导航项已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Settings</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">站点设置</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          <form key={JSON.stringify(config)} onSubmit={saveConfig} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">基础与首页</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {configFields.map((field) => (
                <AdminField key={field.key} label={field.label}>
                  {field.type === "textarea" ? (
                    <textarea name={field.key} rows={3} defaultValue={config[field.key] ?? ""} className={inputClass} />
                  ) : field.type === "select" ? (
                    <select name={field.key} defaultValue={config[field.key] ?? field.options?.[0]?.value ?? ""} className={inputClass}>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input name={field.key} defaultValue={config[field.key] ?? ""} className={inputClass} />
                  )}
                </AdminField>
              ))}
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              <Save className="h-4 w-4" aria-hidden="true" />
              保存配置
            </Button>
          </form>

          <section className="motion-surface rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">导航配置</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-[320px_1fr]">
              <form key={editingNav?.id ?? "new"} onSubmit={saveNavigation} className="grid gap-4">
                <AdminField label="名称">
                  <input name="label" required defaultValue={editingNav?.label ?? ""} className={inputClass} />
                </AdminField>
                <AdminField label="链接">
                  <input name="href" required defaultValue={editingNav?.href ?? ""} className={inputClass} />
                </AdminField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="排序">
                    <input name="sort_order" type="number" defaultValue={editingNav?.sort_order ?? 0} className={inputClass} />
                  </AdminField>
                  <AdminField label="打开方式">
                    <select name="target" defaultValue={editingNav?.target ?? "self"} className={inputClass}>
                      <option value="self">当前页</option>
                      <option value="blank">新窗口</option>
                    </select>
                  </AdminField>
                </div>
                <AdminField label="图标标识">
                  <input name="icon" defaultValue={editingNav?.icon ?? ""} className={inputClass} />
                </AdminField>
                <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
                  <input name="is_visible" type="checkbox" defaultChecked={editingNav?.is_visible ?? true} />
                  前台显示
                </label>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {editingNav ? "保存导航" : "新增导航"}
                  </Button>
                  {editingNav ? (
                    <Button type="button" variant="ghost" onClick={() => setEditingNav(null)}>
                      取消
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="overflow-x-auto rounded-lg border border-ink/10 dark:border-white/10">
                <table className="admin-table w-full min-w-[620px] text-sm">
                  <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
                    <tr>
                      <th className="p-3">名称</th>
                      <th className="p-3">链接</th>
                      <th className="p-3">排序</th>
                      <th className="p-3">状态</th>
                      <th className="p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navigation.map((item) => (
                      <tr key={item.id} className="border-t border-ink/10 dark:border-white/10">
                        <td className="p-3 font-black text-ink dark:text-slate-100">{item.label}</td>
                        <td className="p-3 text-ink/60 dark:text-slate-400">{item.href}</td>
                        <td className="p-3 text-ink/60 dark:text-slate-400">{item.sort_order}</td>
                        <td className="p-3 text-ink/60 dark:text-slate-400">{item.is_visible ? "显示" : "隐藏"}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setEditingNav(item)}>
                              <Edit className="h-4 w-4" />
                              编辑
                            </Button>
                            <Button type="button" variant="danger" className="h-9 min-h-9 px-3" onClick={() => deleteNavigation(item)}>
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <form key={`${config.home_background_mode}-${config.home_background_fixed_id}-${homeBackgrounds.length}`} onSubmit={saveHomeBackground} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-slate-100">
              <Image className="h-5 w-5 text-ocean dark:text-sky-300" aria-hidden="true" />
              首页背景
            </h2>
            <AdminField label="显示模式">
              <select name="display_mode" defaultValue={config.home_background_mode ?? "fixed"} className={inputClass}>
                <option value="fixed">固定单张图</option>
                <option value="random">多张随机显示</option>
                <option value="round_robin">多张轮询显示</option>
              </select>
            </AdminField>
            <AdminField label="固定背景">
              <select name="fixed_media_id" defaultValue={config.home_background_fixed_id ?? ""} className={inputClass}>
                <option value="">使用默认背景 URL</option>
                {homeBackgrounds.filter((item) => item.is_active).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.original_name}
                  </option>
                ))}
              </select>
            </AdminField>
            <Button type="submit">
              <Save className="h-4 w-4" aria-hidden="true" />
              保存首页背景
            </Button>
          </form>

          <form onSubmit={uploadHomeBackground} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">上传首页背景</h2>
            <AdminField label="背景图片">
              <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className={inputClass} />
            </AdminField>
            <Button type="submit">
              <Upload className="h-4 w-4" aria-hidden="true" />
              上传背景
            </Button>
          </form>

          <form key={`${config.login_background_mode}-${config.login_background_fixed_id}-${backgrounds.length}`} onSubmit={saveLoginBackground} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">登录背景</h2>
            <AdminField label="显示模式">
              <select name="display_mode" defaultValue={config.login_background_mode ?? "random"} className={inputClass}>
                <option value="random">随机</option>
                <option value="round_robin">轮播</option>
                <option value="fixed">固定</option>
              </select>
            </AdminField>
            <AdminField label="固定背景">
              <select name="fixed_media_id" defaultValue={config.login_background_fixed_id ?? ""} className={inputClass}>
                <option value="">未选择</option>
                {backgrounds.filter((item) => item.is_active).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.original_name}
                  </option>
                ))}
              </select>
            </AdminField>
            <Button type="submit">
              <Save className="h-4 w-4" aria-hidden="true" />
              保存背景策略
            </Button>
          </form>

          <form onSubmit={uploadBackground} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">上传登录背景</h2>
            <AdminField label="背景图片">
              <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className={inputClass} />
            </AdminField>
            <Button type="submit">
              <Upload className="h-4 w-4" aria-hidden="true" />
              上传背景
            </Button>
          </form>

          <section className="motion-surface rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">背景资源</h2>
            <div className="mt-4 grid gap-3">
              {homeBackgrounds.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-md border border-ink/10 bg-paper p-3 text-sm dark:border-white/10 dark:bg-slate-950">
                  <p className="font-black text-ink dark:text-slate-100">首页 · {item.original_name}</p>
                  <p className="mt-1 break-all text-xs font-bold text-ink/50 dark:text-slate-500">{item.url}</p>
                </div>
              ))}
              {backgrounds.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-md border border-ink/10 bg-paper p-3 text-sm dark:border-white/10 dark:bg-slate-950">
                  <p className="font-black text-ink dark:text-slate-100">登录 · {item.original_name}</p>
                  <p className="mt-1 break-all text-xs font-bold text-ink/50 dark:text-slate-500">{item.url}</p>
                </div>
              ))}
              {!backgrounds.length && !homeBackgrounds.length ? <p className="text-sm font-bold text-ink/45 dark:text-slate-500">暂无背景图片。</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
