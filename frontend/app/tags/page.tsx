import { Hash } from "lucide-react";
import Link from "next/link";

import { safeApiFetch } from "@/lib/api";
import { fallbackTags } from "@/lib/fallback";
import type { Tag } from "@/types/blog";

export default async function TagsPage() {
  const tags = await safeApiFetch<Tag[]>("/tags", fallbackTags);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-bold text-primary">Tags</p>
      <h1 className="mt-2 text-3xl font-black text-foreground">标签</h1>
      <div className="motion-list mt-7 flex flex-wrap gap-3">
        {tags.map((tag, index) => (
          <Link
            key={tag.id}
            href={`/tags/${tag.slug}`}
            className="interactive-card inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 font-black text-foreground shadow-sm hover:text-primary hover:shadow-soft"
            style={{ fontSize: `${1 + (index % 4) * 0.08}rem` }}
          >
            <Hash className="h-4 w-4 text-clay" aria-hidden="true" />
            {tag.name}
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {tag.post_count ?? 0}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
