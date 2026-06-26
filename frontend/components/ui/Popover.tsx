import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PopoverProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
};

export function Popover({ open, className, ...props }: PopoverProps) {
  return (
    <div
      className={cn(
        "absolute z-40 min-w-44 origin-top-right rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-popover)] transition-all duration-[var(--motion-normal)]",
        open ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100" : "invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        className,
      )}
      aria-hidden={!open}
      {...props}
    />
  );
}
