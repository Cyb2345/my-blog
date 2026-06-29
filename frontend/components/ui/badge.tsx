import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--admin-focus-ring)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: "border-border text-foreground",
        neutral: "border-transparent bg-muted text-muted-foreground",
        primary:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        danger:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    tone?: "neutral" | "primary" | "danger";
  };

export function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "min-h-5 min-w-5 justify-center rounded-full px-1.5 font-black",
        badgeVariants({ variant: variant ?? tone ?? "neutral" }),
        className,
      )}
      {...props}
    />
  );
}
