"use client";

import { PostEditor } from "@/components/admin/PostEditor";

export default function NewPostPage() {
  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">New Post</p>
        <h1 className="mt-2 text-2xl font-black text-ink">新建文章</h1>
      </div>
      <PostEditor />
    </>
  );
}
