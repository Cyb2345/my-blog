"use client";

import { AdminPage } from "@/components/admin/AdminPage";
import { PostEditor } from "@/components/admin/PostEditor";

export default function NewPostPage() {
  return (
    <AdminPage title="新建文章" description="创建文章内容、封面、分类标签和发布状态。">
      <PostEditor />
    </AdminPage>
  );
}
