import { ArrowRight, Library } from "lucide-react";
import Link from "next/link";

import { DocsNav } from "@/components/docs/DocsNav";
import { EmptyState } from "@/components/ui/empty-state";
import { safeApiFetch } from "@/lib/api";
import { buildDocTree, firstDoc } from "@/lib/docs";
import { fallbackPage } from "@/lib/fallback";
import { formatDate } from "@/lib/utils";
import type { Paginated, Post } from "@/types/blog";

export default async function DocsPage() {
  const posts = await safeApiFetch<Paginated<Post>>(
    "/posts?page_size=100",
    fallbackPage,
  );
  const groups = buildDocTree(posts.items);
  const first = firstDoc(groups);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <DocsNav groups={groups} />
        <main className="min-w-0">
          <div className="motion-surface rounded-lg border border-border bg-card p-6 shadow-soft border-border md:p-9">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-primary text-primary">
              <Library className="h-4 w-4" aria-hidden="true" />
              Docs
            </p>
            <h1 className="mt-3 text-3xl font-black text-foreground text-foreground">
              知识库
            </h1>
            <p className="mt-4 max-w-2xl leading-8 text-muted-foreground text-muted-foreground">
              这里按主题沉淀已发布文章，适合把 Docker、Linux、DevOps
              和数据库笔记当作文档连续阅读。
            </p>
            {first ? (
              <Link
                href={`/docs/${first.slug}`}
                className="interactive mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-black text-white hover:bg-primary bg-primary dark:text-white hover:bg-primary"
              >
                {first.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          {groups.length ? (
            <div className="motion-list mt-6 grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <section
                  key={group.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm border-border "
                >
                  <h2 className="text-lg font-black text-foreground text-foreground">
                    {group.name}
                  </h2>
                  <div className="mt-3 grid gap-2">
                    {group.items.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        href={`/docs/${item.slug}`}
                        className="interactive flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm font-bold text-muted-foreground hover:text-primary bg-accent text-muted-foreground hover:text-primary"
                      >
                        <span className="truncate">{item.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground text-muted-foreground">
                          {formatDate(item.updated_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="暂无文档"
                description="发布文章后，知识库会自动出现内容。"
              />
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
