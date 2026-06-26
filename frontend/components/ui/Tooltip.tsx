import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 z-50 max-w-64 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-text)] px-2 py-1 text-xs font-bold text-[var(--color-text-inverse)] opacity-0 shadow-[var(--shadow-popover)] transition-opacity duration-[var(--motion-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}
