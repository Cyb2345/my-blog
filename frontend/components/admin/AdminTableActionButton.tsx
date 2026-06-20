import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminTableActionVariant = "edit" | "delete" | "warning" | "success" | "neutral";

type AdminTableActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminTableActionVariant;
  children: ReactNode;
};

const variants: Record<AdminTableActionVariant, string> = {
  edit:
    "bg-ocean text-white ring-ocean/30 hover:bg-ocean/90 dark:bg-[var(--primary)] dark:text-white dark:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--primary)_84%,white)]",
  delete:
    "bg-red-100 text-red-700 ring-red-200 hover:bg-red-200 dark:bg-rose-500/20 dark:text-rose-100 dark:ring-rose-400/40 dark:hover:bg-rose-500/30",
  warning:
    "bg-amber-100 text-amber-800 ring-amber-200 hover:bg-amber-200 dark:bg-amber-400/20 dark:text-amber-100 dark:ring-amber-300/40 dark:hover:bg-amber-400/30",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20 dark:hover:bg-emerald-400/20",
  neutral:
    "bg-paper text-ink/65 ring-ink/10 hover:bg-white hover:text-ink dark:bg-white/10 dark:text-[var(--text-secondary)] dark:ring-white/10 dark:hover:bg-white/15 dark:hover:text-[var(--text)]",
};

export const adminTableActionIconClass = "h-4 w-4";

export function AdminTableActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center justify-center gap-2", className)}>{children}</div>;
}

export function AdminTableActionButton({
  variant = "neutral",
  className,
  type = "button",
  children,
  ...props
}: AdminTableActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "interactive grid h-9 w-9 place-items-center rounded-md ring-1 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
