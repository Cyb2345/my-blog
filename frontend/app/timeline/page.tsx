import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { safeApiFetch } from "@/lib/api";
import { fallbackPage } from "@/lib/fallback";
import { formatDate } from "@/lib/utils";
import type { Paginated, Post } from "@/types/blog";

export default async function TimelinePage() {
  const posts = await safeApiFetch<Paginated<Post>>(
    "/posts?page_size=100",
    fallbackPage,
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold text-primary">Timeline</p>
      <h1 className="mt-2 text-3xl font-black text-foreground">时间线</h1>
      <div className="motion-list mt-8 border-l-2 border-ocean/20 pl-6">
        {posts.items.map((post) => (
          <article key={post.id} className="relative pb-8">
            <span className="absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full bg-primary ring-4 ring-paper" />
            <div className="interactive-card rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-soft">
              <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <CalendarDays
                  className="h-4 w-4 text-[var(--color-success)]"
                  aria-hidden="true"
                />
                {formatDate(post.published_at)}
                {post.category ? <span>· {post.category.name}</span> : null}
              </p>
              <Link
                href={`/posts/${post.slug}`}
                className="mt-2 block text-xl font-black text-foreground hover:text-primary"
              >
                {post.title}
              </Link>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {post.summary}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
