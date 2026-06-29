"use client";

import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[color-mix(in_srgb,var(--primary)_84%,black)]",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[color-mix(in_srgb,var(--primary)_84%,black)]",
        secondary:
          "bg-secondary text-secondary-foreground ring-1 ring-border hover:bg-accent hover:text-accent-foreground",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-[color-mix(in_srgb,var(--destructive)_84%,black)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-[color-mix(in_srgb,var(--destructive)_84%,black)]",
        ghost:
          "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-input bg-background text-foreground hover:border-primary hover:text-primary",
        text: "bg-transparent text-primary shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "bg-transparent p-0 text-primary underline-offset-4 shadow-none hover:underline",
        inverse: "bg-background text-foreground shadow-sm hover:bg-secondary",
        glass:
          "border border-[color-mix(in_srgb,var(--background)_28%,transparent)] bg-[color-mix(in_srgb,var(--background)_14%,transparent)] text-background shadow-sm backdrop-blur-md hover:bg-[color-mix(in_srgb,var(--background)_24%,transparent)]",
      },
      size: {
        sm: "min-h-9 px-3 py-1.5 text-xs",
        md: "min-h-10 px-4 py-2",
        default: "min-h-10 px-4 py-2",
        lg: "min-h-11 px-5 py-2.5 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;
export type ButtonSize = NonNullable<
  VariantProps<typeof buttonVariants>["size"]
>;

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "size"
> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Comp>
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof buttonVariants> & {
    href: string;
    children: ReactNode;
  };

export function LinkButton({
  className,
  variant = "primary",
  size = "default",
  href,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
