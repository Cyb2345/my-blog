import { ArrowDown, ArrowRight, BookOpen, Database, Folder, Library, Tags, TerminalSquare } from "lucide-react";
import Link from "next/link";

import { PostCard } from "@/components/blog/PostCard";
import { safeApiFetch } from "@/lib/api";
import { fallbackCategories, fallbackPage, fallbackTags } from "@/lib/fallback";
import { formatDate, getAssetUrl } from "@/lib/utils";
import type { Category, MediaAsset, Paginated, Post, SiteConfig, Tag } from "@/types/blog";

type HomeBackground = {
  mode: string;
  image_url: string;
  media?: MediaAsset | null;
};

const defaultHeroTitle = "把运维现场、DevOps 实践和 Python 学习写成自己的知识库";
const defaultHeroDescription =
  "这里记录 Linux、Docker、网络、数据库、云服务和自动化运维中的真实问题，也记录一点慢慢学会后端开发的过程。";

function normalizeBackgroundSize(value?: string) {
  if (value === "contain" || value === "auto") return value;
  return "cover";
}

function showScrollIndicator(value?: string) {
  return value !== "false";
}

export default async function HomePage() {
  const [posts, categories, tags, config, homeBackground] = await Promise.all([
    safeApiFetch<Paginated<Post>>("/posts?page_size=6", fallbackPage),
    safeApiFetch<Category[]>("/categories", fallbackCategories),
    safeApiFetch<Tag[]>("/tags", fallbackTags),
    safeApiFetch<SiteConfig>("/site/config", {}),
    safeApiFetch<HomeBackground>("/site/home-background", {
      mode: "fixed",
      image_url: "/images/blog-hero.png",
      media: null,
    }),
  ]);
  const featured = posts.items.slice(0, 4);
  const docs = posts.items.slice(0, 4);
  const heroImage = getAssetUrl(homeBackground.image_url || config.hero_image || "/images/blog-hero.png");
  const heroBackgroundSize = normalizeBackgroundSize(config.hero_image_display);

  return (
    <div className="home-page">
      <section className="home-hero relative isolate flex items-center overflow-hidden bg-[var(--bg)] px-4 py-24 text-white md:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: heroBackgroundSize,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,11,12,0.38),rgba(11,11,12,0.58)_48%,rgba(11,11,12,0.92))]"
        />
        <div className="mx-auto grid w-full max-w-6xl justify-items-center text-center">
          <p className="mb-5 inline-flex rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm font-black text-white/90 shadow-sm backdrop-blur-md">
            {config.hero_badge ?? "个人技术博客"}
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
            {config.hero_title || defaultHeroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/80 md:text-lg">
            {config.hero_description || defaultHeroDescription}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={config.hero_primary_href || "/posts"}
              className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ink shadow-soft hover:bg-honey"
            >
              {config.hero_primary_text || "开始阅读"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={config.hero_secondary_href || "/docs"}
              className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 text-sm font-black text-white shadow-sm backdrop-blur-md hover:bg-white/20"
            >
              {config.hero_secondary_text || "进入知识库"}
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        {showScrollIndicator(config.home_show_scroll_indicator) ? (
          <Link
            href="#home-content"
            className="interactive absolute bottom-5 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-md border border-white/20 bg-white/10 text-white/80 backdrop-blur-md hover:bg-white/20"
            aria-label="向下滚动"
          >
            <ArrowDown className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : null}
      </section>

      <section id="home-content" className="bg-white/50 pb-8 pt-0 dark:bg-[var(--bg)]">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-black text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]">Welcome</p>
            <p className="mt-2 max-w-3xl text-base font-semibold leading-8 text-ink/70 dark:text-[var(--text-secondary)]">
              {config.home_notice_text ||
                "欢迎来到技术札记。这里把排障现场、部署经验、自动化脚本和后端学习沉淀成可复用的个人知识库。"}
            </p>
          </div>
          <Link href="/about" className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-white hover:bg-ocean dark:bg-[var(--primary)] dark:text-[var(--bg)]">
            关于本站
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "已发布文章", value: posts.total, icon: TerminalSquare },
              { label: "知识库条目", value: docs.length, icon: Library },
              { label: "分类主题", value: categories.length, icon: Folder },
              { label: "标签索引", value: tags.length, icon: Tags },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-ink/10 bg-white/80 p-5 shadow-sm dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]">
                  <Icon className="h-5 w-5 text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]" aria-hidden="true" />
                  <p className="mt-4 text-3xl font-black text-ink dark:text-[var(--text)]">{item.value}</p>
                  <p className="mt-1 text-sm font-bold text-ink/55 dark:text-[var(--text-muted)]">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white/45 py-12 dark:bg-[var(--bg-soft)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-ink dark:text-[var(--text)]">最新文章</h2>
              <Link href="/posts" className="text-sm font-bold text-ocean hover:text-ink dark:text-[color-mix(in_srgb,var(--primary)_78%,white)] dark:hover:text-[var(--text)]">
                查看全部
              </Link>
            </div>
            <div className="motion-list grid gap-5">
              {featured.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-ink dark:text-[var(--text)]">最新知识库</h2>
              <Link href="/docs" className="text-sm font-bold text-ocean hover:text-ink dark:text-[color-mix(in_srgb,var(--primary)_78%,white)] dark:hover:text-[var(--text)]">
                进入知识库
              </Link>
            </div>
            <div className="motion-list grid gap-4">
              {docs.map((post) => (
                <Link
                  key={post.id}
                  href={`/docs/${post.slug}`}
                  className="interactive-card rounded-lg border border-ink/10 bg-white/80 p-5 shadow-sm hover:shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]"
                >
                  <p className="text-xs font-black text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]">{post.category?.name ?? "未分类"}</p>
                  <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-ink dark:text-[var(--text)]">{post.title}</h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60 dark:text-[var(--text-secondary)]">{post.summary}</p>
                  <p className="mt-4 text-xs font-bold text-ink/45 dark:text-[var(--text-muted)]">更新于 {formatDate(post.updated_at)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="mb-5 flex items-center gap-2 text-2xl font-black text-ink dark:text-[var(--text)]">
              <Folder className="h-6 w-6 text-moss" aria-hidden="true" />
              分类入口
            </h2>
            <div className="motion-list grid gap-3 sm:grid-cols-2">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="interactive-card rounded-lg border border-ink/10 bg-white/80 p-4 shadow-sm hover:shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-black text-ink dark:text-[var(--text)]">{category.name}</span>
                    <span className="rounded-md bg-paper px-2 py-1 text-xs font-black text-ink/45 dark:bg-[var(--surface-soft)] dark:text-[var(--text-muted)]">{category.post_count ?? 0}</span>
                  </span>
                  {category.description ? <span className="mt-2 block line-clamp-2 text-sm leading-6 text-ink/60 dark:text-[var(--text-secondary)]">{category.description}</span> : null}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-5 flex items-center gap-2 text-2xl font-black text-ink dark:text-[var(--text)]">
              <Database className="h-6 w-6 text-clay dark:text-amber-300" aria-hidden="true" />
              知识库入口
            </h2>
            <div className="rounded-lg border border-ink/10 bg-ink p-6 text-white shadow-soft dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]">
              <p className="text-sm font-bold text-white/62">Docs</p>
              <h3 className="mt-2 text-2xl font-black">按主题连续阅读和回查</h3>
              <p className="mt-4 leading-8 text-white/70">
                将发布文章按分类组织为知识库，更适合沉淀 Docker、Linux、DevOps、数据库和自动化运维笔记。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {tags.slice(0, 8).map((tag) => (
                  <Link key={tag.id} href={`/tags/${tag.slug}`} className="interactive rounded-md bg-white/10 px-3 py-1.5 text-sm font-bold text-white/80 hover:bg-white/20">
                    {tag.name}
                  </Link>
                ))}
              </div>
              <Link href="/docs" className="interactive mt-7 inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-ink hover:bg-honey">
                打开知识库
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
