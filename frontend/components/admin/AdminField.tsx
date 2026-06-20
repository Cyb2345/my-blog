"use client";

import { ReactNode } from "react";

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink dark:text-[var(--text)]">
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none ring-ocean/20 focus:ring-4 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)] dark:ring-[color-mix(in_srgb,var(--primary)_24%,transparent)] dark:placeholder:text-[var(--text-muted)]";
