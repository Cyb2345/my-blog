import type { ButtonHTMLAttributes, ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminTableActionVariant =
  | "edit"
  | "delete"
  | "warning"
  | "success"
  | "neutral";

type AdminTableActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminTableActionVariant;
  children: ReactNode;
};

const variants: Record<AdminTableActionVariant, string> = {
  edit: "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)] ring-[color-mix(in_srgb,var(--admin-primary)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_18%,transparent)]",
  delete:
    "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)] ring-[color-mix(in_srgb,var(--color-danger)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_32%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-warning)_22%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)]",
  neutral:
    "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
};

export const adminTableActionIconClass = "h-4 w-4";

export function AdminTableActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {children}
    </div>
  );
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
        buttonVariants({ variant: "ghost", size: "icon" }),
        "h-9 w-9 rounded-md ring-1 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
