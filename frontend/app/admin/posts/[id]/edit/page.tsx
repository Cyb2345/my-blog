import { AdminPage } from "@/components/admin/AdminPage";
import { PostEditor } from "@/components/admin/PostEditor";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPage title="编辑文章" description="更新文章内容、封面、分类标签和发布状态。">
      <PostEditor postId={Number(id)} />
    </AdminPage>
  );
}
