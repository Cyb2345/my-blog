"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/admin/CustomSelect";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  {
    label: "Cloudflare Turnstile",
    value: "turnstile",
    description: "turnstile",
  },
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
  if (["sys_mfa_enabled", "open_comment", "open_message"].includes(key))
    return true;
  if (/^(open|enable|enabled|allow|is)_/.test(key)) return true;
  return Boolean(name && /是否|开启|启用|允许|显示/.test(name));
}

function isNumberParam(key: string, value: string) {
  if (
    /(_count|_minutes|_limit|_size|_days|_timeout|_seconds|_page_size|_order|_sort|_port|_ttl)$/.test(
      key,
    )
  )
    return true;
  if (/^(max_|min_)/.test(key)) return true;
  return /^-?\d+(\.\d+)?$/.test(value.trim()) && value.trim() !== "";
}

function isImageParam(key: string) {
  return /(_fixed_id|_image_id|_media_id|_cover_id|_background_id)$/.test(key);
}

function selectOptionsForKey(key: string): CustomSelectOption[] | null {
  if (key === "sys_captcha_type") return captchaOptions;
  if (key === "default_theme") return themeOptions;
  if (key.endsWith("_background_mode") || key.endsWith("_mode"))
    return backgroundModeOptions;
  if (key.endsWith("_image_display") || key.endsWith("_display"))
    return imageDisplayOptions;
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
      <Input
        name="value"
        type="password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="留空表示不修改，重新输入才更新"
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
        <input
          type="hidden"
          name="value"
          value={checked ? values.on : values.off}
        />
        <Switch
          checked={checked}
          onCheckedChange={(nextChecked) =>
            setValue(nextChecked ? values.on : values.off)
          }
          label={checked ? "启用" : "禁用"}
          className="min-h-11 rounded-md border border-border bg-background px-4"
        />
      </div>
    );
  }

  if (isImageParam(key)) {
    return (
      <ImagePicker
        name="value"
        value={value}
        assets={assets}
        onChange={setValue}
      />
    );
  }

  if (isNumberParam(key, value)) {
    return (
      <Input
        name="value"
        type="number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  }

  if (value.length > 120 || value.includes("\n")) {
    return (
      <Textarea
        name="value"
        rows={5}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="请输入参数值"
      />
    );
  }

  return (
    <Input
      name="value"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="请输入参数值"
    />
  );
}
