import { ArrowLeft, Clock, Folder } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownToc } from "@/components/blog/MarkdownToc";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { DocsNav } from "@/components/docs/DocsNav";
import { safeApiFetch } from "@/lib/api";
import { buildDocTree } from "@/lib/docs";
import { fallbackPage, fallbackPosts } from "@/lib/fallback";
import { extractToc } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import type { Paginated, Post, PostDetail } from "@/types/blog";

export default async function DocDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = await safeApiFetch<Paginated<Post>>("/posts?page_size=100", fallbackPage);
  const groups = buildDocTree(posts.items);
  const fallbackPost = fallbackPosts.find((post) => post.slug === slug);
  const fallbackDetail: PostDetail | null = fallbackPost
    ? { post: { ...fallbackPost, content: fallbackPost.content ?? "" }, previous: null, next: null }
    : null;
  const detail = await safeApiFetch<PostDetail | null>(`/posts/${slug}`, fallbackDetail);

  if (!detail?.post) notFound();

  const post = detail.post;
  const toc = extractToc(post.content);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)_17rem]">
        <DocsNav activeSlug={post.slug} groups={groups} />
        <main className="min-w-0">
          <Link href="/docs" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回知识库
          </Link>
          <MarkdownToc items={toc} mode="mobile" />
          <article className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white/85 shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]">
            <div className="border-b border-ink/10 p-6 dark:border-[var(--border-soft)] md:p-9">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-ink/55 dark:text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  更新于 {formatDate(post.updated_at)}
                </span>
                {post.category ? (
                  <Link href={`/categories/${post.category.slug}`} className="inline-flex items-center gap-1 hover:text-ocean dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]">
                    <Folder className="h-4 w-4" aria-hidden="true" />
                    {post.category.name}
                  </Link>
                ) : null}
              </div>
              <h1 className="text-3xl font-black leading-tight text-ink dark:text-[var(--text)] md:text-5xl">{post.title}</h1>
              {post.summary ? <p className="mt-4 text-lg leading-8 text-ink/65 dark:text-[var(--text-secondary)]">{post.summary}</p> : null}
            </div>
            <div className="p-6 md:p-9">
              <MarkdownView content={post.content} />
            </div>
          </article>
        </main>
        <MarkdownToc items={toc} />
      </div>
    </section>
  );
}
