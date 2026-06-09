"use client";

import { useEffect, useState } from "react";

import { adminRequest } from "@/lib/auth";
import type { AdminStats } from "@/types/blog";

const labels: Record<keyof AdminStats, string> = {
  total_posts: "文章总数",
  published_posts: "已发布",
  draft_posts: "草稿",
  categories: "分类",
  tags: "标签",
  comments: "留言",
  pending_comments: "待审核留言",
  links: "友链",
  users: "用户",
  media: "媒体",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminRequest<AdminStats>("/admin/stats").then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Dashboard</p>
        <h1 className="mt-2 text-2xl font-black text-ink">后台概览</h1>
      </div>
      <div className="motion-list grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(labels) as Array<keyof AdminStats>).map((key) => (
          <div key={key} className="interactive-card rounded-lg border border-ink/10 bg-white p-5 shadow-sm hover:shadow-soft">
            <p className="text-sm font-bold text-ink/50">{labels[key]}</p>
            <p className="mt-3 text-3xl font-black text-ink">{stats ? stats[key] : "-"}</p>
          </div>
        ))}
      </div>
    </>
  );
}
