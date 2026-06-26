import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type TagVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const variants: Record<TagVariant, string> = {
  neutral:
    "bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] text-[var(--color-text-muted)] ring-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
  primary:
    "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)] ring-[color-mix(in_srgb,var(--admin-primary)_24%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_28%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_32%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)] ring-[color-mix(in_srgb,var(--color-danger)_28%,transparent)]",
  info:
    "bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)] ring-[color-mix(in_srgb,var(--color-info)_28%,transparent)]",
};

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: TagVariant;
};

export function Tag({ className, variant = "neutral", ...props }: TagProps) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-black ring-1", variants[variant], className)}
      {...props}
    />
  );
}
