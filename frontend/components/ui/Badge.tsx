import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "primary" | "danger";
};

const tones = {
  neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  primary: "bg-[var(--admin-primary)] text-white",
  danger: "bg-[var(--color-danger)] text-white",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-black", tones[tone], className)}
      {...props}
    />
  );
}
