"use client";

import { Check, Settings2, X } from "lucide-react";

import {
  adminPageTransitionOptions,
  adminPrimaryColors,
  type AdminLayoutSettings,
  useAdminLayout,
} from "@/components/admin/AdminLayoutContext";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-black text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-4 py-1 text-sm font-bold text-muted-foreground">
      <span>{label}</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors peer-checked:bg-primary">
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </label>
  );
}

function SegmentedSetting<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: Array<{ label: string; value: Value }>;
  onChange: (value: Value) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "min-h-9 rounded-lg px-3 text-sm font-black",
            value === option.value
              ? "bg-background text-primary shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AdminSettingsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings, t, updateSetting } = useAdminLayout();

  function update<Key extends keyof AdminLayoutSettings>(
    key: Key,
    value: AdminLayoutSettings[Key],
  ) {
    updateSetting(key, value);
    if (settings.autoCloseSettings) window.setTimeout(onClose, 140);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("关闭")}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[88] bg-black/45 transition-opacity duration-[var(--motion-normal)]",
          open
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[90] w-[min(390px,calc(100vw-1rem))] border-l border-border bg-card text-card-foreground shadow-[var(--shadow-dialog)] transition-transform duration-[260ms] ease-[var(--ease-standard)]",
          open ? "visible translate-x-0" : "invisible translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex h-[58px] items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <Settings2
              className="h-5 w-5 text-[var(--admin-primary)]"
              aria-hidden="true"
            />
            <h2 className="text-base font-black">{t("设置中心")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent hover:text-accent-foreground"
            aria-label={t("关闭")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="h-[calc(100%-4rem)] overflow-y-auto px-5 py-5">
          <SettingSection title={t("主题风格")}>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-2">
              <span className="text-sm font-bold">{t("切换明暗主题")}</span>
              <ThemeToggle compact />
            </div>
          </SettingSection>

          <SettingSection title={t("系统主题色")}>
            <div className="flex flex-wrap gap-3">
              {adminPrimaryColors.map((color) => {
                const active = settings.primaryColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => update("primaryColor", color.value)}
                    className="relative grid h-9 w-9 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110"
                    style={{ backgroundColor: color.value }}
                    aria-label={color.label}
                    title={color.label}
                  >
                    {active ? (
                      <Check
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </SettingSection>

          <SettingSection title={t("盒子样式")}>
            <SegmentedSetting
              value={settings.boxStyle}
              options={[
                { label: t("边框"), value: "border" },
                { label: t("阴影"), value: "shadow" },
              ]}
              onChange={(value) => update("boxStyle", value)}
            />
          </SettingSection>

          <SettingSection title={t("容器宽度")}>
            <SegmentedSetting
              value={settings.containerWidth}
              options={[
                { label: t("铺满"), value: "full" },
                { label: t("定宽"), value: "fixed" },
              ]}
              onChange={(value) => update("containerWidth", value)}
            />
          </SettingSection>

          <SettingSection title={t("基础配置")}>
            <div className="grid divide-y divide-border">
              <SettingToggle
                label={t("开启多标签栏")}
                checked={settings.showTabs}
                onChange={(value) => update("showTabs", value)}
              />
              <SettingToggle
                label={t("侧边栏手风琴")}
                checked={settings.accordionMenu}
                onChange={(value) => update("accordionMenu", value)}
              />
              <SettingToggle
                label={t("显示折叠按钮")}
                checked={settings.showCollapse}
                onChange={(value) => update("showCollapse", value)}
              />
              <SettingToggle
                label={t("显示刷新按钮")}
                checked={settings.showReload}
                onChange={(value) => update("showReload", value)}
              />
              <SettingToggle
                label={t("显示面包屑")}
                checked={settings.showBreadcrumb}
                onChange={(value) => update("showBreadcrumb", value)}
              />
              <SettingToggle
                label={t("显示语言选择")}
                checked={settings.showLanguage}
                onChange={(value) => update("showLanguage", value)}
              />
              <SettingToggle
                label={t("显示顶部进度条")}
                checked={settings.showProgress}
                onChange={(value) => update("showProgress", value)}
              />
              <SettingToggle
                label={t("自动关闭设置中心")}
                checked={settings.autoCloseSettings}
                onChange={(value) => update("autoCloseSettings", value)}
              />
            </div>
          </SettingSection>

          <SettingSection title={t("页面切换动画")}>
            <CustomSelect
              value={settings.pageTransition}
              onChange={(value) =>
                update(
                  "pageTransition",
                  value as AdminLayoutSettings["pageTransition"],
                )
              }
              options={adminPageTransitionOptions.map((option) => ({
                ...option,
                label: t(option.label),
              }))}
              panelClassName="z-[100]"
            />
          </SettingSection>

          <SettingSection title={t("圆角大小")}>
            <CustomSelect
              value={settings.radius}
              onChange={(value) =>
                update("radius", value as AdminLayoutSettings["radius"])
              }
              options={[
                { label: t("小"), value: "sm" },
                { label: t("中"), value: "md" },
                { label: t("大"), value: "lg" },
              ]}
            />
          </SettingSection>

          <SettingSection title={t("字体大小")}>
            <CustomSelect
              value={settings.fontSize}
              onChange={(value) =>
                update("fontSize", value as AdminLayoutSettings["fontSize"])
              }
              options={[
                { label: t("小"), value: "small" },
                { label: t("默认"), value: "default" },
                { label: t("大"), value: "large" },
              ]}
            />
          </SettingSection>

          <SettingSection title={t("菜单宽度")}>
            <CustomSelect
              value={String(settings.menuWidth)}
              onChange={(value) => update("menuWidth", Number(value))}
              options={[
                { label: "224px", value: "224" },
                { label: "256px", value: "256" },
                { label: "280px", value: "280" },
              ]}
            />
          </SettingSection>
        </div>
      </aside>
    </>
  );
}
