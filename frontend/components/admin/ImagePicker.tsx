"use client";

import { Check, Image as ImageIcon } from "lucide-react";

import { CustomSelect, type CustomSelectOption } from "@/components/admin/CustomSelect";
import { cn, getAssetUrl } from "@/lib/utils";
import type { MediaAsset } from "@/types/blog";

type ImagePickerProps = {
  value: string;
  assets: MediaAsset[];
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  allowEmpty?: boolean;
};

function assetName(asset: MediaAsset) {
  return asset.original_name || asset.filename;
}

function toOption(asset: MediaAsset): CustomSelectOption {
  const dimensions = asset.width && asset.height ? `${asset.width} x ${asset.height}` : asset.mime_type;
  return {
    label: assetName(asset),
    value: String(asset.id),
    description: `ID ${asset.id} · ${dimensions}`,
    thumbnail: getAssetUrl(asset.url),
  };
}

export function ImagePicker({
  value,
  assets,
  onChange,
  name,
  placeholder = "请选择图片",
  allowEmpty = true,
}: ImagePickerProps) {
  const options: CustomSelectOption[] = [
    ...(allowEmpty ? [{ label: "未选择", value: "", description: "不指定固定图片" }] : []),
    ...assets.map(toOption),
  ];
  const selected = assets.find((asset) => String(asset.id) === value);

  return (
    <div className="grid gap-3">
      <CustomSelect
        name={name}
        value={value}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        searchable
        emptyLabel="暂无可选图片"
      />
      <div className="overflow-hidden rounded-lg border border-ink/10 bg-paper/70 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)]">
        {selected ? (
          <div className="grid gap-3 p-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
            <img
              src={getAssetUrl(selected.url)}
              alt={assetName(selected)}
              className="aspect-video w-full rounded-md object-cover ring-1 ring-ink/10 dark:ring-[var(--border-soft)]"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-black text-ink dark:text-[var(--text)]" title={assetName(selected)}>
                <Check className="h-4 w-4 shrink-0 text-ocean dark:text-[var(--primary)]" aria-hidden="true" />
                {assetName(selected)}
              </p>
              <p className="mt-1 text-xs font-bold text-ink/48 dark:text-[var(--text-muted)]">资源 ID：{selected.id}</p>
              <p className="mt-1 truncate text-xs font-semibold text-ink/42 dark:text-[var(--text-muted)]" title={selected.url}>{selected.url}</p>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center gap-2 px-4 py-6 text-center text-sm font-bold text-ink/45 dark:text-[var(--text-muted)]">
            <span className={cn("grid h-12 w-12 place-items-center rounded-md bg-white text-ink/32 dark:bg-[var(--surface-soft)] dark:text-[var(--text-muted)]")}>
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            未选择图片
          </div>
        )}
      </div>
    </div>
  );
}
