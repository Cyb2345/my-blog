"use client";

import { Edit, ExternalLink, EyeOff, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, LinkButton } from "@/components/ui/Button";
import { adminRequest } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { Paginated, Post } from "@/types/blog";

const emptyPage: Paginated<Post> = { items: [], total: 0, page: 1, page_size: 20, pages: 0 };

export default function AdminPostsPage() {
  const [page, setPage] = useState<Paginated<Post>>(emptyPage);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      setPage(await adminRequest<Paginated<Post>>("/admin/posts?page_size=50"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(path: string, message: string, method = "POST") {
    if (method === "DELETE" && !window.confirm("确认删除这篇文章吗？")) return;
    setError("");
    setNotice("");
    try {
      await adminRequest(path, { method });
      await load();
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ocean">Posts</p>
          <h1 className="mt-2 text-2xl font-black text-ink">文章管理</h1>
        </div>
        <LinkButton href="/admin/posts/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          新建文章
        </LinkButton>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700">{notice}</p> : null}
      <div className="motion-surface overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm">
        <table className="admin-table w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-paper text-left text-ink/60">
            <tr>
              <th className="p-3">标题</th>
              <th className="p-3">分类</th>
              <th className="p-3">标签</th>
              <th className="p-3">状态</th>
              <th className="p-3">阅读</th>
              <th className="p-3">更新时间</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((post) => (
              <tr key={post.id} className="border-t border-ink/10">
                <td className="p-3 font-bold text-ink">{post.title}</td>
                <td className="p-3 text-ink/65">{post.category?.name ?? "-"}</td>
                <td className="p-3 text-ink/65">
                  <div className="flex flex-wrap gap-1">
                    {post.tags?.length ? (
                      post.tags.map((tag) => (
                        <span key={tag.id} className="rounded-md bg-paper px-2 py-1 text-xs font-bold">
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className="rounded-md bg-ocean/10 px-2 py-1 text-xs font-bold text-ocean">
                    {post.status === "published" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="p-3 text-ink/65">{post.view_count}</td>
                <td className="p-3 text-ink/65">{formatDate(post.updated_at)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/posts/${post.id}/edit`} className="interactive grid h-9 w-9 place-items-center rounded-md bg-paper text-ink" title="编辑" aria-label="编辑">
                      <Edit className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/posts/${post.slug}`}
                      target="_blank"
                      className="interactive grid h-9 w-9 place-items-center rounded-md bg-paper text-ink"
                      title="预览"
                      aria-label="预览"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    {post.status === "published" ? (
                      <Button variant="ghost" className="h-9 min-h-9 px-3" onClick={() => action(`/admin/posts/${post.id}/unpublish`, "文章已下线，列表已刷新。")}>
                        <EyeOff className="h-4 w-4" />
                        下线
                      </Button>
                    ) : (
                      <Button variant="ghost" className="h-9 min-h-9 px-3" onClick={() => action(`/admin/posts/${post.id}/publish`, "文章已发布，列表已刷新。")}>
                        <Send className="h-4 w-4" />
                        发布
                      </Button>
                    )}
                    <Button variant="danger" className="h-9 min-h-9 px-3" onClick={() => action(`/admin/posts/${post.id}`, "文章已删除，列表已刷新。", "DELETE")}>
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
