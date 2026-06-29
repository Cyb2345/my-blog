import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/empty-state";
import { safeApiFetch } from "@/lib/api";
import { fallbackPage, fallbackTags } from "@/lib/fallback";
import type { Paginated, Post, Tag } from "@/types/blog";

type TagPosts = {
  tag: Tag;
  posts: Paginated<Post>;
};

export default async function TagPostsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fallbackTag = fallbackTags.find((tag) => tag.slug === slug);
  const fallbackData: TagPosts | null = fallbackTag
    ? { tag: fallbackTag, posts: fallbackPage }
    : null;
  const data = await safeApiFetch<TagPosts | null>(
    `/tags/${slug}/posts`,
    fallbackData,
  );
  if (!data?.tag) notFound();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/tags" className="text-sm font-bold text-primary">
        返回标签
      </Link>
      <h1 className="mt-4 text-3xl font-black text-foreground">
        #{data.tag.name}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {data.tag.description}
      </p>
      <div className="motion-list mt-7 grid gap-5">
        {data.posts.items.length ? (
          data.posts.items.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyState title="这个标签还没有文章" />
        )}
      </div>
    </section>
  );
}
