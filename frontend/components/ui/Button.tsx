import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-ink text-white hover:bg-ocean dark:bg-[var(--primary)] dark:text-white dark:hover:bg-[color-mix(in_srgb,var(--primary)_84%,white)]",
  ghost: "bg-white/70 text-ink ring-1 ring-ink/10 hover:bg-white dark:bg-[var(--surface-soft)] dark:text-[var(--text)] dark:ring-[var(--border-soft)] dark:hover:bg-[var(--hover)]",
  danger: "bg-clay text-white hover:bg-red-700 dark:bg-[var(--danger)] dark:text-white dark:hover:bg-[color-mix(in_srgb,var(--danger)_84%,white)]",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
};

export function LinkButton({
  className,
  variant = "primary",
  href,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
