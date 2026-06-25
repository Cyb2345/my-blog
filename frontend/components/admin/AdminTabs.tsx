"use client";

import { LockKeyhole, X } from "lucide-react";

import { useAdminLayout } from "@/components/admin/AdminLayoutContext";
import { cn } from "@/lib/utils";

export type AdminTab = {
  href: string;
  label: string;
  pinned?: boolean;
};

export function AdminTabs({
  tabs,
  activeHref,
  onNavigate,
  onClose,
}: {
  tabs: AdminTab[];
  activeHref: string;
  onNavigate: (href: string) => void;
  onClose: (href: string) => void;
}) {
  const { settings, t } = useAdminLayout();
  if (!settings.showTabs) return null;

  return (
    <div className="admin-tabs flex min-h-11 items-center gap-1 overflow-x-auto border-b border-ink/10 bg-white/80 px-3 py-1.5 dark:border-[var(--border-soft)] dark:bg-[color-mix(in_srgb,var(--surface)_94%,transparent)]">
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <div
            key={tab.href}
            className={cn(
              "group inline-flex h-8 shrink-0 items-center rounded-md border px-2 text-xs font-bold transition-colors",
              active
                ? "border-[var(--admin-primary)] bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[var(--admin-primary)]"
                : "border-ink/10 bg-white text-ink/60 hover:border-ink/20 hover:text-ink dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text)]",
            )}
          >
            <button type="button" onClick={() => onNavigate(tab.href)} className="inline-flex h-full items-center gap-1.5 px-1">
              {tab.pinned ? <LockKeyhole className="h-3 w-3" aria-hidden="true" /> : null}
              <span>{t(tab.label)}</span>
            </button>
            {!tab.pinned ? (
              <button
                type="button"
                onClick={() => onClose(tab.href)}
                className="ml-1 grid h-5 w-5 place-items-center rounded text-current/55 hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
                aria-label={`${t("关闭")} ${t(tab.label)}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
