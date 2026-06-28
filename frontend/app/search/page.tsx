import { CalendarDays, FileText, Folder, Library, Tag as TagIcon } from "lucide-react";
import Link from "next/link";

import { SearchForm } from "@/components/search/SearchForm";
import { EmptyState } from "@/components/ui/empty-state";
import { safeApiFetch } from "@/lib/api";
import { excerpt, formatDate } from "@/lib/utils";
import type { Category, Paginated, Post, Tag } from "@/types/blog";

const emptyPage: Paginated<Post> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};

const searchTypes = [
  { label: "全部", value: "all" },
  { label: "文章", value: "posts" },
  { label: "知识库", value: "docs" },
  { label: "分类", value: "categories" },
  { label: "标签", value: "tags" },
] as const;

type SearchType = (typeof searchTypes)[number]["value"];

function normalizeType(value?: string): SearchType {
  return searchTypes.some((item) => item.value === value) ? (value as SearchType) : "all";
}

function buildTypeHref(keyword: string, type: SearchType) {
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function includesKeyword(value: string | null | undefined, keyword: string) {
  return value?.toLowerCase().includes(keyword.toLowerCase()) ?? false;
}

function filterTaxonomies<T extends Category | Tag>(items: T[], keyword: string) {
  if (!keyword) return [];
  return items.filter(
    (item) =>
      includesKeyword(item.name, keyword) ||
      includesKeyword(item.slug, keyword) ||
      includesKeyword(item.description, keyword),
  );
}

function canShow(activeType: SearchType, type: SearchType) {
  return activeType === "all" || activeType === type;
}

function TaxonomyCard({ item, type }: { item: Category | Tag; type: "categories" | "tags" }) {
  const href = type === "categories" ? `/categories/${item.slug}` : `/tags/${item.slug}`;
  const Icon = type === "categories" ? Folder : TagIcon;

  return (
    <Link
      href={href}
      className="interactive-card rounded-lg border border-ink/10 bg-white/85 p-5 shadow-sm hover:shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ocean/10 text-ocean dark:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-ink dark:text-[var(--text)]">{item.name}</h3>
          <p className="mt-1 text-sm text-ink/55 dark:text-[var(--text-muted)]">
            {type === "categories" ? "分类" : "标签"} · {item.post_count ?? 0} 篇内容
          </p>
          {item.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-[var(--text-secondary)]">{item.description}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PostResultCard({ post }: { post: Post }) {
  return (
    <article className="interactive-card rounded-lg border border-ink/10 bg-white/85 p-5 shadow-sm hover:shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink/50 dark:text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDate(post.published_at ?? post.created_at)}
        </span>
        {post.category ? (
          <Link href={`/categories/${post.category.slug}`} className="inline-flex items-center gap-1 hover:text-ocean dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]">
            <Folder className="h-3.5 w-3.5" aria-hidden="true" />
            {post.category.name}
          </Link>
        ) : null}
      </div>
      <Link href={`/posts/${post.slug}`}>
        <h3 className="mt-3 text-xl font-black leading-snug text-ink hover:text-ocean dark:text-[var(--text)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]">{post.title}</h3>
      </Link>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-[var(--text-secondary)]">
        {post.summary || excerpt(post.content, 140) || "这篇文章暂时没有摘要。"}
      </p>
      {post.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="interactive inline-flex items-center gap-1 rounded-md bg-ocean/10 px-2.5 py-1 text-xs font-semibold text-ocean hover:bg-ocean hover:text-white dark:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] dark:text-[color-mix(in_srgb,var(--primary)_78%,white)] dark:hover:bg-[var(--primary)] dark:hover:text-[var(--bg)]"
            >
              <TagIcon className="h-3 w-3" aria-hidden="true" />
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function DocResultCard({ post }: { post: Post }) {
  return (
    <article className="interactive-card rounded-lg border border-ink/10 bg-white/85 p-5 shadow-sm hover:shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink/50 dark:text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Library className="h-3.5 w-3.5" aria-hidden="true" />
          {post.category?.name ?? "未分类文档"}
        </span>
        <span>更新于 {formatDate(post.updated_at)}</span>
      </div>
      <Link href={`/docs/${post.slug}`}>
        <h3 className="mt-3 text-lg font-black leading-snug text-ink hover:text-ocean dark:text-[var(--text)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]">{post.title}</h3>
      </Link>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65 dark:text-[var(--text-secondary)]">
        {post.summary || excerpt(post.content, 140) || "这篇文档暂时没有摘要。"}
      </p>
    </article>
  );
}

export default async function SearchPage({ searchParams }: { searchParams?: Promise<{ q?: string; type?: string }> }) {
  const query = (await searchParams) ?? {};
  const keyword = query.q?.trim() ?? "";
  const activeType = normalizeType(query.type);

  const [posts, categories, tags] = await Promise.all([
    keyword
      ? safeApiFetch<Paginated<Post>>(`/posts/search?keyword=${encodeURIComponent(keyword)}`, emptyPage)
      : Promise.resolve(emptyPage),
    keyword ? safeApiFetch<Category[]>("/categories", []) : Promise.resolve([]),
    keyword ? safeApiFetch<Tag[]>("/tags", []) : Promise.resolve([]),
  ]);

  const categoryResults = filterTaxonomies(categories, keyword);
  const tagResults = filterTaxonomies(tags, keyword);
  const showPosts = canShow(activeType, "posts");
  const showDocs = canShow(activeType, "docs");
  const showCategories = canShow(activeType, "categories");
  const showTags = canShow(activeType, "tags");
  const hasResults =
    keyword &&
    ((showPosts && posts.items.length > 0) ||
      (showDocs && posts.items.length > 0) ||
      (showCategories && categoryResults.length > 0) ||
      (showTags && tagResults.length > 0));

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      <div className="mb-6">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Search
        </p>
        <h1 className="mt-2 text-3xl font-black text-ink dark:text-[var(--text)]">搜索</h1>
      </div>

      <SearchForm activeType={activeType} initialKeyword={keyword} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink/55 dark:text-[var(--text-muted)]">筛选：</span>
        {searchTypes.map((type) => {
          const active = type.value === activeType;
          return (
            <Link
              key={type.value}
              href={buildTypeHref(keyword, type.value)}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-md bg-ink px-3 py-1.5 text-sm font-black text-white shadow-sm dark:bg-[var(--primary)] dark:text-[var(--bg)]"
                  : "interactive rounded-md border border-ink/10 bg-white/70 px-3 py-1.5 text-sm font-bold text-ink/65 hover:border-ocean/30 hover:text-ocean dark:border-[var(--border-soft)] dark:bg-[var(--surface)] dark:text-[var(--text-secondary)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]"
              }
            >
              {type.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        {!keyword ? (
          <EmptyState title="输入关键词开始搜索" />
        ) : !hasResults ? (
          <EmptyState title="没有找到相关内容" description="可以尝试更换关键词" />
        ) : (
          <div className="space-y-8">
            {showPosts && posts.items.length ? (
              <section>
                <h2 className="mb-4 text-lg font-black text-ink dark:text-[var(--text)]">文章结果</h2>
                <div className="motion-list grid gap-4">
                  {posts.items.map((post) => (
                    <PostResultCard key={`post-${post.id}`} post={post} />
                  ))}
                </div>
              </section>
            ) : null}

            {showDocs && posts.items.length ? (
              <section>
                <h2 className="mb-4 text-lg font-black text-ink dark:text-[var(--text)]">知识库文档</h2>
                <div className="motion-list grid gap-4 md:grid-cols-2">
                  {posts.items.map((post) => (
                    <DocResultCard key={`doc-${post.id}`} post={post} />
                  ))}
                </div>
              </section>
            ) : null}

            {showCategories && categoryResults.length ? (
              <section>
                <h2 className="mb-4 text-lg font-black text-ink dark:text-[var(--text)]">分类结果</h2>
                <div className="motion-list grid gap-4 md:grid-cols-2">
                  {categoryResults.map((category) => (
                    <TaxonomyCard key={`category-${category.id}`} item={category} type="categories" />
                  ))}
                </div>
              </section>
            ) : null}

            {showTags && tagResults.length ? (
              <section>
                <h2 className="mb-4 text-lg font-black text-ink dark:text-[var(--text)]">标签结果</h2>
                <div className="motion-list grid gap-4 md:grid-cols-2">
                  {tagResults.map((tag) => (
                    <TaxonomyCard key={`tag-${tag.id}`} item={tag} type="tags" />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
