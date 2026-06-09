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
    <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm outline-none ring-ocean/20 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20 dark:placeholder:text-slate-500";
