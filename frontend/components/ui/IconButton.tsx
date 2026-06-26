import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type IconButtonVariant = "default" | "primary" | "danger" | "ghost";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "size"> & {
  label: string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
};

const variants: Record<IconButtonVariant, string> = {
  default:
    "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
  primary:
    "bg-[var(--admin-primary)] text-white ring-1 ring-[color-mix(in_srgb,var(--admin-primary)_36%,transparent)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_84%,black)]",
  danger:
    "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)] ring-1 ring-[color-mix(in_srgb,var(--color-danger)_24%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
};

const sizes: Record<IconButtonSize, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-11 w-11",
};

export function IconButton({
  label,
  children,
  className,
  variant = "default",
  size = "md",
  active,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "interactive grid shrink-0 place-items-center rounded-md outline-none transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variants[variant],
        sizes[size],
        active && "bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
