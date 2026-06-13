"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

import { cn } from "@/lib/utils";

type AdminModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  footer?: ReactNode;
};

const sizes = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-[1400px]",
  full: "h-[96vh] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)]",
};

export function AdminModal({
  open,
  title,
  children,
  onClose,
  size = "md",
  footer,
}: AdminModalProps) {
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="关闭弹窗遮罩" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-slate-900",
          sizes[size],
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-black text-ink dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="interactive grid h-9 w-9 place-items-center rounded-md text-ink/50 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-ink/10 px-5 py-4 dark:border-white/10">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function ModalError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">
      {message}
    </p>
  );
}
