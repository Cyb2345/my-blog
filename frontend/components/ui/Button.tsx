import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "text";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--admin-primary)] text-white hover:bg-[color-mix(in_srgb,var(--admin-primary)_84%,black)]",
  secondary:
    "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)] ring-1 ring-[color-mix(in_srgb,var(--admin-primary)_24%,transparent)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_18%,transparent)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:bg-[color-mix(in_srgb,var(--color-danger)_84%,black)]",
  ghost:
    "bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)]",
  outline:
    "border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary)]",
  text:
    "bg-transparent text-[var(--admin-primary)] shadow-none hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-2.5 text-base",
  icon: "h-10 w-10 p-0",
};

const baseClass =
  "interactive inline-flex items-center justify-center gap-2 rounded-md font-semibold shadow-sm outline-none transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(baseClass, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function LinkButton({
  className,
  variant = "primary",
  size = "md",
  href,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(baseClass, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
