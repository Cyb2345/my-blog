import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { safeApiFetch } from "@/lib/api";
import { fallbackPage } from "@/lib/fallback";
import { formatDate } from "@/lib/utils";
import type { Paginated, Post } from "@/types/blog";

export default async function TimelinePage() {
  const posts = await safeApiFetch<Paginated<Post>>("/posts?page_size=100", fallbackPage);

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold text-ocean">Timeline</p>
      <h1 className="mt-2 text-3xl font-black text-ink">时间线</h1>
      <div className="motion-list mt-8 border-l-2 border-ocean/20 pl-6">
        {posts.items.map((post) => (
          <article key={post.id} className="relative pb-8">
            <span className="absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full bg-ocean ring-4 ring-paper" />
            <div className="interactive-card rounded-lg border border-ink/10 bg-white/80 p-5 shadow-sm hover:shadow-soft">
              <p className="flex items-center gap-2 text-sm font-bold text-ink/50">
                <CalendarDays className="h-4 w-4 text-moss" aria-hidden="true" />
                {formatDate(post.published_at)}
                {post.category ? <span>· {post.category.name}</span> : null}
              </p>
              <Link href={`/posts/${post.slug}`} className="mt-2 block text-xl font-black text-ink hover:text-ocean">
                {post.title}
              </Link>
              <p className="mt-2 text-sm leading-6 text-ink/60">{post.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
