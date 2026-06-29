"use client";

import { BookOpen, ChevronDown, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatDate } from "@/lib/utils";
import type { DocTreeGroup } from "@/lib/docs";
import { cn } from "@/lib/utils";

type Props = {
  activeSlug?: string;
  groups: DocTreeGroup[];
};

export function DocsTree({ activeSlug, groups }: Props) {
  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const group of groups) {
      if (!activeSlug || group.items.some((item) => item.slug === activeSlug)) {
        open.add(group.id);
      }
    }
    return open;
  }, [activeSlug, groups]);
  const [openGroups, setOpenGroups] = useState(initiallyOpen);

  useEffect(() => {
    if (!activeSlug) return;
    const activeGroup = groups.find((group) =>
      group.items.some((item) => item.slug === activeSlug),
    );
    if (!activeGroup) return;
    setOpenGroups((current) => {
      if (current.has(activeGroup.id)) return current;
      const next = new Set(current);
      next.add(activeGroup.id);
      return next;
    });
  }, [activeSlug, groups]);

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!groups.length) {
    return (
      <div className="docs-empty">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        暂无文档
      </div>
    );
  }

  return (
    <nav aria-label="知识库目录" className="docs-tree">
      {groups.map((group) => {
        const isOpen = openGroups.has(group.id);

        return (
          <section key={group.id} className="docs-tree__group">
            <button
              type="button"
              className="docs-tree__trigger"
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.id)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{group.name}</span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 docs-tree__chevron",
                  isOpen && "docs-tree__chevron--open",
                )}
                aria-hidden="true"
              />
            </button>
            <div
              className={cn(
                "docs-tree__children",
                isOpen && "docs-tree__children--open",
              )}
            >
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/docs/${item.slug}`}
                  className={cn(
                    "docs-tree__link",
                    activeSlug === item.slug && "docs-tree__link--active",
                  )}
                >
                  <FileText
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="docs-tree__date">
                    {formatDate(item.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
