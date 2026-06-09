"use client";

import { ChevronDown, ListTree } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { TocItem } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type Props = {
  items: TocItem[];
  mode?: "desktop" | "mobile";
};

export function MarkdownToc({ items, mode = "desktop" }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const ids = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    if (!ids.length) return;

    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => Boolean(heading));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 1],
      },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [ids]);

  if (!items.length) return null;

  const list = (
    <nav aria-label="文章大纲" className="toc-list">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "toc-link",
            item.level === 3 && "toc-link--h3",
            item.level === 4 && "toc-link--h4",
            activeId === item.id && "toc-link--active",
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );

  if (mode === "mobile") {
    return (
      <details className="toc-mobile motion-surface lg:hidden">
        <summary>
          <span className="inline-flex items-center gap-2">
            <ListTree className="h-4 w-4" aria-hidden="true" />
            文章大纲
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="mt-3">{list}</div>
      </details>
    );
  }

  return (
    <aside className="toc-panel hidden lg:block">
      <div className="sticky top-24 rounded-lg border border-ink/10 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-black text-ink">
          <ListTree className="h-4 w-4 text-ocean" aria-hidden="true" />
          文章大纲
        </div>
        {list}
      </div>
    </aside>
  );
}
