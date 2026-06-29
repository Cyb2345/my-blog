import { MessageCircle } from "lucide-react";

import { MessageForm } from "@/components/blog/MessageForm";
import { safeApiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { CommentItem } from "@/types/blog";

export default async function MessagePage() {
  const [comments, runtime] = await Promise.all([
    safeApiFetch<CommentItem[]>("/comments", []),
    safeApiFetch<{ open_message?: boolean }>("/site/runtime-options", {
      open_message: true,
    }),
  ]);
  const enabled = runtime.open_message !== false;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-bold text-primary">Message</p>
      <h1 className="mt-2 text-3xl font-black text-foreground">留言</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
        可以留下建议、问题或者只是打个招呼。邮箱只用于后台查看，不会在前台公开。
      </p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        {enabled ? (
          <MessageForm />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm font-bold text-muted-foreground dark:border-[var(--border-soft)] dark:bg-[var(--surface)] dark:text-[var(--text-muted)]">
            留言功能暂未开放
          </div>
        )}
        <div className="motion-list space-y-3">
          {comments.length ? (
            comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <MessageCircle
                    className="h-4 w-4 text-[var(--color-success)]"
                    aria-hidden="true"
                  />
                  {comment.nickname}
                  <span className="font-medium text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {comment.content}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              暂时还没有公开留言。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
