"use client";

import { useEffect, useMemo, useState } from "react";

import { CustomSelect, type CustomSelectOption } from "@/components/admin/CustomSelect";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { inputClass } from "@/components/admin/AdminField";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/types/blog";

type ParamValueFieldProps = {
  paramKey?: string;
  paramName?: string;
  initialValue: string;
  sensitive?: boolean;
  assets?: MediaAsset[];
};

const captchaOptions: CustomSelectOption[] = [
  { label: "关闭验证码", value: "none", description: "none" },
  { label: "图片验证码", value: "image", description: "image" },
  { label: "滑块验证码", value: "slider", description: "slider" },
  { label: "Cloudflare Turnstile", value: "turnstile", description: "turnstile" },
];

const themeOptions: CustomSelectOption[] = [
  { label: "跟随系统", value: "system", description: "system" },
  { label: "白天模式", value: "light", description: "light" },
  { label: "黑夜模式", value: "dark", description: "dark" },
];

const backgroundModeOptions: CustomSelectOption[] = [
  { label: "固定单张图", value: "fixed", description: "fixed" },
  { label: "多张随机显示", value: "random", description: "random" },
  { label: "多张轮询显示", value: "round_robin", description: "round_robin" },
];

const imageDisplayOptions: CustomSelectOption[] = [
  { label: "覆盖铺满", value: "cover", description: "cover" },
  { label: "完整显示", value: "contain", description: "contain" },
  { label: "原始尺寸", value: "auto", description: "auto" },
];

function normalizeKey(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function isTruthy(value: string) {
  return ["1", "true", "yes", "y", "on"].includes(value.trim().toLowerCase());
}

function switchValues(initialValue: string) {
  const normalized = initialValue.trim().toLowerCase();
  if (["y", "n"].includes(normalized)) return { on: "Y", off: "N" };
  if (["1", "0"].includes(normalized)) return { on: "1", off: "0" };
  if (["yes", "no"].includes(normalized)) return { on: "yes", off: "no" };
  return { on: "true", off: "false" };
}

function isSwitchParam(key: string, name?: string) {
  if (["sys_mfa_enabled", "open_comment", "open_message"].includes(key)) return true;
  if (/^(open|enable|enabled|allow|is)_/.test(key)) return true;
  return Boolean(name && /是否|开启|启用|允许|显示/.test(name));
}

function isNumberParam(key: string, value: string) {
  if (/(_count|_minutes|_limit|_size|_days|_timeout|_seconds|_page_size|_order|_sort|_port|_ttl)$/.test(key)) return true;
  if (/^(max_|min_)/.test(key)) return true;
  return /^-?\d+(\.\d+)?$/.test(value.trim()) && value.trim() !== "";
}

function isImageParam(key: string) {
  return /(_fixed_id|_image_id|_media_id|_cover_id|_background_id)$/.test(key);
}

function selectOptionsForKey(key: string): CustomSelectOption[] | null {
  if (key === "sys_captcha_type") return captchaOptions;
  if (key === "default_theme") return themeOptions;
  if (key.endsWith("_background_mode") || key.endsWith("_mode")) return backgroundModeOptions;
  if (key.endsWith("_image_display") || key.endsWith("_display")) return imageDisplayOptions;
  return null;
}

export function ParamValueField({
  paramKey,
  paramName,
  initialValue,
  sensitive = false,
  assets = [],
}: ParamValueFieldProps) {
  const [value, setValue] = useState(sensitive ? "" : initialValue);
  const key = normalizeKey(paramKey);
  const values = useMemo(() => switchValues(initialValue), [initialValue]);
  const selectOptions = selectOptionsForKey(key);

  useEffect(() => {
    setValue(sensitive ? "" : initialValue);
  }, [initialValue, sensitive, paramKey]);

  if (sensitive) {
    return (
      <input
        name="value"
        type="password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="留空表示不修改，重新输入才更新"
        className={inputClass}
      />
    );
  }

  if (selectOptions) {
    return (
      <CustomSelect
        name="value"
        value={value || selectOptions[0]?.value || ""}
        options={selectOptions}
        onChange={setValue}
        placeholder="请选择参数值"
      />
    );
  }

  if (isSwitchParam(key, paramName)) {
    const checked = isTruthy(value);
    return (
      <div className="grid gap-2">
        <input type="hidden" name="value" value={checked ? values.on : values.off} />
        <button
          type="button"
          onClick={() => setValue(checked ? values.off : values.on)}
          className={cn(
            "interactive flex min-h-11 items-center justify-between rounded-md border px-4 text-sm font-black",
            checked
              ? "border-ocean/30 bg-ocean/10 text-ocean dark:border-[color-mix(in_srgb,var(--primary)_44%,transparent)] dark:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] dark:text-white"
              : "border-ink/10 bg-paper text-ink/55 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text-muted)]",
          )}
        >
          <span>{checked ? "启用" : "禁用"}</span>
          <span
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              checked ? "bg-ocean dark:bg-[var(--primary)]" : "bg-ink/18 dark:bg-[var(--surface-soft)]",
            )}
          >
            <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
          </span>
        </button>
      </div>
    );
  }

  if (isImageParam(key)) {
    return <ImagePicker name="value" value={value} assets={assets} onChange={setValue} />;
  }

  if (isNumberParam(key, value)) {
    return (
      <input
        name="value"
        type="number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={inputClass}
      />
    );
  }

  if (value.length > 120 || value.includes("\n")) {
    return (
      <textarea
        name="value"
        rows={5}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="请输入参数值"
        className={inputClass}
      />
    );
  }

  return (
    <input
      name="value"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="请输入参数值"
      className={inputClass}
    />
  );
}
