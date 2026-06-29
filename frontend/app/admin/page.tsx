"use client";

import { useEffect, useState } from "react";

import { AdminPage } from "@/components/admin/AdminPage";
import { Card, CardContent } from "@/components/ui/card";
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
    adminRequest<AdminStats>("/admin/stats")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <AdminPage
      title="后台概览"
      description="查看内容、用户、留言和媒体资源的关键统计。"
    >
      <div className="motion-list grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(labels) as Array<keyof AdminStats>).map((key) => (
          <Card key={key} className="motion-card interactive-card">
            <CardContent className="p-5">
              <p className="text-sm font-bold text-muted-foreground">
                {labels[key]}
              </p>
              <p className="mt-3 text-3xl font-black text-foreground">
                {stats ? stats[key] : "-"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
