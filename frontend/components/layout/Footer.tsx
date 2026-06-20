"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-ink/10 bg-white/55 dark:border-[var(--border-soft)] dark:bg-[color-mix(in_srgb,var(--bg-soft)_72%,transparent)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink/60 dark:text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
        <p>© 2026 技术札记 · 记录运维、DevOps 与 Python 学习。</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-ocean">
            关于
          </Link>
        </div>
      </div>
    </footer>
  );
}
