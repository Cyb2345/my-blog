"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
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

const sizeClass: Record<IconButtonSize, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-11 w-11",
};

const variantMap = {
  default: "outline",
  primary: "primary",
  danger: "danger",
  ghost: "ghost",
} as const;

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
        buttonVariants({ variant: variantMap[variant], size: "icon" }),
        sizeClass[size],
        active && "bg-accent text-accent-foreground ring-1 ring-[color-mix(in_srgb,var(--primary)_24%,transparent)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
