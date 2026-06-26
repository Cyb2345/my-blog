"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  onClose: () => void;
};

export function Drawer({ open, title, children, footer, side = "right", onClose }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <>
      <button
        type="button"
        aria-label="关闭抽屉遮罩"
        onClick={onClose}
        className={cn("fixed inset-0 z-[88] bg-black/35 transition-opacity duration-[var(--motion-normal)]", open ? "visible pointer-events-auto opacity-100" : "invisible pointer-events-none opacity-0")}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={cn(
          "fixed inset-y-0 z-[90] flex w-[min(420px,calc(100vw-1rem))] flex-col border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] transition-transform duration-[260ms] ease-[var(--ease-standard)]",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          open ? "visible translate-x-0" : side === "right" ? "invisible translate-x-full" : "invisible -translate-x-full",
        )}
        aria-hidden={!open}
      >
        <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-5">
          <h2 className="text-base font-black text-[var(--color-text)]">{title}</h2>
          <IconButton label="关闭" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">{footer}</footer> : null}
      </aside>
    </>
  );
}
