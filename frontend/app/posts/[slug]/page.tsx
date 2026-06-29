import { ArrowLeft, ArrowRight, Eye, Folder } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownToc } from "@/components/blog/MarkdownToc";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { safeApiFetch } from "@/lib/api";
import { fallbackPosts } from "@/lib/fallback";
import { extractToc } from "@/lib/markdown";
import { formatDate, getAssetUrl } from "@/lib/utils";
import type { PostDetail } from "@/types/blog";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fallbackPost = fallbackPosts.find((post) => post.slug === slug);
  const fallbackDetail: PostDetail | null = fallbackPost
    ? {
        post: { ...fallbackPost, content: fallbackPost.content ?? "" },
        previous: null,
        next: null,
      }
    : null;
  const detail = await safeApiFetch<PostDetail | null>(
    `/posts/${slug}`,
    fallbackDetail,
  );
  if (!detail?.post) notFound();
  const post = detail.post;
  const toc = extractToc(post.content);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <main className="min-w-0">
          <Link
            href="/posts"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回文章列表
          </Link>
          <MarkdownToc items={toc} mode="mobile" />
          <article className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <div className="relative aspect-[16/8] min-h-64">
              <Image
                src={getAssetUrl(post.cover_image)}
                alt={post.title}
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="p-6 md:p-9">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-foreground">
                <span>{formatDate(post.published_at)}</span>
                <span>更新于 {formatDate(post.updated_at)}</span>
                {post.category ? (
                  <Link
                    href={`/categories/${post.category.slug}`}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Folder className="h-4 w-4" aria-hidden="true" />
                    {post.category.name}
                  </Link>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {post.view_count}
                </span>
              </div>
              <h1 className="text-3xl font-black leading-tight text-foreground md:text-5xl">
                {post.title}
              </h1>
              {post.summary ? (
                <p className="mt-4 text-lg leading-8 text-muted-foreground">
                  {post.summary}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${tag.slug}`}
                    className="rounded-md bg-accent px-3 py-1 text-sm font-bold text-primary"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
              <div className="mt-8 border-t border-border pt-8">
                <MarkdownView content={post.content} />
              </div>
            </div>
          </article>
          <nav className="mt-6 grid gap-3 md:grid-cols-2">
            {detail.previous ? (
              <Link
                href={`/posts/${detail.previous.slug}`}
                className="rounded-lg bg-card p-4 font-bold text-foreground hover:text-primary"
              >
                上一篇：{detail.previous.title}
              </Link>
            ) : (
              <span className="rounded-lg bg-card p-4 text-muted-foreground">
                没有上一篇
              </span>
            )}
            {detail.next ? (
              <Link
                href={`/posts/${detail.next.slug}`}
                className="flex items-center justify-end gap-2 rounded-lg bg-card p-4 text-right font-bold text-foreground hover:text-primary"
              >
                下一篇：{detail.next.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="rounded-lg bg-card p-4 text-right text-muted-foreground">
                没有下一篇
              </span>
            )}
          </nav>
        </main>
        <MarkdownToc items={toc} />
      </div>
    </div>
  );
}
