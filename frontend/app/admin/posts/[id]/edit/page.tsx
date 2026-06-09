import { PostEditor } from "@/components/admin/PostEditor";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Edit Post</p>
        <h1 className="mt-2 text-2xl font-black text-ink">编辑文章</h1>
      </div>
      <PostEditor postId={Number(id)} />
    </>
  );
}
