"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  onClose: () => void;
};

const sizes = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-[1200px]",
  full: "h-[96vh] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)]",
};

export function Dialog({ open, title, description, children, footer, size = "md", onClose }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="关闭弹窗遮罩" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className={cn("motion-fade-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]", sizes[size])}>
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[var(--color-text)]">{title}</h2>
            {description ? <p className="mt-1 text-sm font-semibold text-[var(--color-text-subtle)]">{description}</p> : null}
          </div>
          <IconButton label="关闭" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}
