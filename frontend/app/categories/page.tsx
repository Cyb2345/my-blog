import { FolderOpen } from "lucide-react";
import Link from "next/link";

import { safeApiFetch } from "@/lib/api";
import { fallbackCategories } from "@/lib/fallback";
import type { Category } from "@/types/blog";

export default async function CategoriesPage() {
  const categories = await safeApiFetch<Category[]>(
    "/categories",
    fallbackCategories,
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-bold text-primary">Categories</p>
      <h1 className="mt-2 text-3xl font-black text-foreground">分类</h1>
      <div className="motion-list mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="interactive-card group rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-4">
              <FolderOpen
                className="h-8 w-8 text-[var(--color-success)]"
                aria-hidden="true"
              />
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-black text-muted-foreground">
                {category.post_count ?? 0} 篇
              </span>
            </div>
            <h2 className="mt-5 text-xl font-black text-foreground group-hover:text-primary">
              {category.name}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {category.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
