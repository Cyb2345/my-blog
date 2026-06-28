import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type TagVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const variants: Record<TagVariant, string> = {
  neutral: "bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-muted-foreground ring-[color-mix(in_srgb,var(--foreground)_14%,transparent)]",
  primary: "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary ring-[color-mix(in_srgb,var(--primary)_24%,transparent)]",
  success: "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_28%,transparent)]",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_32%,transparent)]",
  danger: "bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-destructive ring-[color-mix(in_srgb,var(--destructive)_28%,transparent)]",
  info: "bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)] ring-[color-mix(in_srgb,var(--color-info)_28%,transparent)]",
};

type TagProps = HTMLAttributes<HTMLSpanElement> & { variant?: TagVariant };

export function Tag({ className, variant = "neutral", ...props }: TagProps) {
  return <span className={cn("inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-black ring-1", variants[variant], className)} {...props} />;
}
