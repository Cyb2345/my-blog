import { Search } from "lucide-react";

import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { safeApiFetch } from "@/lib/api";
import { fallbackPage } from "@/lib/fallback";
import type { Paginated, Post } from "@/types/blog";

type Props = {
  searchParams?: Promise<{
    keyword?: string;
    page?: string;
    category?: string;
    tag?: string;
  }>;
};

export default async function PostsPage({ searchParams }: Props) {
  const query = (await searchParams) ?? {};
  const params = new URLSearchParams();
  params.set("page_size", "10");
  if (query.page) params.set("page", query.page);
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  const posts = await safeApiFetch<Paginated<Post>>(`/posts?${params.toString()}`, fallbackPage);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-ocean">Posts</p>
          <h1 className="mt-2 text-3xl font-black text-ink">文章</h1>
        </div>
        <form action="/posts" className="flex min-w-0 gap-2">
          <input
            name="keyword"
            defaultValue={query.keyword}
            placeholder="搜索标题、摘要或正文"
            className="min-h-10 min-w-0 rounded-md border border-ink/10 bg-white px-3 text-sm outline-none ring-ocean/25 focus:ring-4"
          />
          <button
            className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white"
            aria-label="搜索文章"
            title="搜索文章"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
      {posts.items.length ? (
        <div className="motion-list grid gap-5">
          {posts.items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState title="没有找到文章" description="换个关键词，或者去分类和标签里逛逛。" />
      )}
    </section>
  );
}
