import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { safeApiFetch } from "@/lib/api";
import { fallbackCategories, fallbackPage } from "@/lib/fallback";
import type { Category, Paginated, Post } from "@/types/blog";

type CategoryPosts = {
  category: Category;
  posts: Paginated<Post>;
};

export default async function CategoryPostsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fallbackCategory = fallbackCategories.find((category) => category.slug === slug);
  const fallbackData: CategoryPosts | null = fallbackCategory
    ? { category: fallbackCategory, posts: fallbackPage }
    : null;
  const data = await safeApiFetch<CategoryPosts | null>(
    `/categories/${slug}/posts`,
    fallbackData,
  );
  if (!data?.category) notFound();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/categories" className="text-sm font-bold text-ocean">
        返回分类
      </Link>
      <h1 className="mt-4 text-3xl font-black text-ink">{data.category.name}</h1>
      <p className="mt-2 max-w-2xl text-ink/60">{data.category.description}</p>
      <div className="motion-list mt-7 grid gap-5">
        {data.posts.items.length ? (
          data.posts.items.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <EmptyState title="这个分类还没有文章" />
        )}
      </div>
    </section>
  );
}
