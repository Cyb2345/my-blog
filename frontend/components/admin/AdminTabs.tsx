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
    <div className="admin-tabs flex min-h-11 items-center gap-1.5 overflow-x-auto border-b border-border/80 bg-[var(--admin-header-bg)] px-4 py-1.5">
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <div
            key={tab.href}
            className={cn(
              "group inline-flex h-8 shrink-0 items-center rounded-lg border px-2 text-xs font-extrabold transition-colors",
              active
                ? "border-[var(--admin-primary)] bg-[color-mix(in_srgb,var(--admin-primary)_13%,transparent)] text-[var(--admin-primary)]"
                : "border-border bg-[var(--admin-surface)] text-muted-foreground hover:border-[var(--admin-control-border)] hover:text-foreground",
            )}
          >
            <button
              type="button"
              onClick={() => onNavigate(tab.href)}
              className="inline-flex h-full items-center gap-1.5 px-1"
            >
              {tab.pinned ? (
                <LockKeyhole className="h-3 w-3" aria-hidden="true" />
              ) : null}
              <span>{t(tab.label)}</span>
            </button>
            {!tab.pinned ? (
              <button
                type="button"
                onClick={() => onClose(tab.href)}
                className="ml-1 grid h-5 w-5 place-items-center rounded text-current/55 hover:bg-accent hover:text-current"
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
