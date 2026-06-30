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
  edit: "bg-[color-mix(in_srgb,var(--admin-primary)_34%,transparent)] text-[color-mix(in_srgb,var(--admin-primary)_76%,white)] ring-[color-mix(in_srgb,var(--admin-primary)_32%,transparent)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_46%,transparent)]",
  delete:
    "bg-[color-mix(in_srgb,var(--color-danger)_26%,transparent)] text-[color-mix(in_srgb,var(--color-danger)_78%,white)] ring-[color-mix(in_srgb,var(--color-danger)_32%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_36%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_26%,transparent)] text-[color-mix(in_srgb,var(--color-warning)_78%,white)] ring-[color-mix(in_srgb,var(--color-warning)_34%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-warning)_36%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_24%,transparent)] text-[color-mix(in_srgb,var(--color-success)_78%,white)] ring-[color-mix(in_srgb,var(--color-success)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-success)_34%,transparent)]",
  neutral:
    "bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)] ring-[var(--color-border)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]",
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
        "h-9 w-9 rounded-lg ring-1 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
