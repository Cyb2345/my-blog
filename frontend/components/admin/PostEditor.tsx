"use client";

import { Columns2, Eye, Image as ImageIcon, PencilLine, Save, Upload, WandSparkles, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { UploadProgress, type UploadProgressItem } from "@/components/admin/UploadProgress";
import { useAdminViewTransitionNavigate } from "@/components/admin/useAdminViewTransitionNavigate";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL, adminRequest, adminUpload } from "@/lib/auth";
import { normalizeYuqueMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import type { Category, MediaAsset, Post, Tag } from "@/types/blog";

type Props = {
  postId?: number;
};

type EditorMode = "edit" | "split" | "preview";

const editorModes: Array<{
  value: EditorMode;
  label: string;
  icon: typeof PencilLine;
}> = [
  { value: "edit", label: "编辑", icon: PencilLine },
  { value: "split", label: "分屏", icon: Columns2 },
  { value: "preview", label: "预览", icon: Eye },
];

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

function resolveAssetUrl(url: string) {
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

export function PostEditor({ postId }: Props) {
  const navigate = useAdminViewTransitionNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [contentDraft, setContentDraft] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("split");
  const [coverImage, setCoverImage] = useState("/images/blog-hero.png");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("draft");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingArticleImage, setUploadingArticleImage] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState<UploadProgressItem | null>(null);
  const [articleUploadProgress, setArticleUploadProgress] = useState<UploadProgressItem | null>(null);

  useEffect(() => {
    Promise.all([
      adminRequest<Category[]>("/admin/categories"),
      adminRequest<Tag[]>("/admin/tags"),
      postId ? adminRequest<Post>(`/admin/posts/${postId}`) : Promise.resolve(null),
    ])
      .then(([categoryData, tagData, postData]) => {
        setCategories(categoryData);
        setTags(tagData);
        setPost(postData);
      })
      .catch((err: Error) => setError(err.message));
  }, [postId]);

  useEffect(() => {
    setContentDraft(post?.content ?? "");
    setCoverImage(post?.cover_image ?? "/images/blog-hero.png");
    setCategoryId(post?.category_id ? String(post.category_id) : "");
    setStatus(post?.status ?? "draft");
  }, [post]);

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploadingCover(true);
    setCoverUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage_type", "post_cover");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", formData, {
        onProgress: (progress) => setCoverUploadProgress({ fileName: file.name, progress, status: "uploading" }),
      });
      setCoverUploadProgress({ fileName: file.name, progress: 100, status: "success" });
      setCoverImage(asset.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "封面上传失败";
      setError(message);
      setCoverUploadProgress({ fileName: file.name, progress: 100, status: "error", error: message });
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadArticleImage(file: File | null) {
    if (!file) return;
    setUploadingArticleImage(true);
    setArticleUploadProgress({ fileName: file.name, progress: 0, status: "uploading" });
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage_type", "article_image");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", formData, {
        onProgress: (progress) => setArticleUploadProgress({ fileName: file.name, progress, status: "uploading" }),
      });
      setArticleUploadProgress({ fileName: file.name, progress: 100, status: "success" });
      const alt = asset.original_name?.replace(/\.[^.]+$/, "") || "图片";
      setContentDraft((value) => `${value}${value.endsWith("\n") || !value ? "" : "\n\n"}![${alt}](${asset.url})\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "正文图片上传失败";
      setError(message);
      setArticleUploadProgress({ fileName: file.name, progress: 100, status: "error", error: message });
    } finally {
      setUploadingArticleImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contentDraft.trim()) {
      setError("Markdown 正文不能为空");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const selectedTags = form.getAll("tag_ids").map((value) => Number(value));
    const categoryValue = form.get("category_id")?.toString() || "";
    const payload = {
      title: form.get("title"),
      slug: form.get("slug"),
      summary: form.get("summary") || null,
      content: contentDraft,
      cover_image: coverImage || null,
      status: form.get("status"),
      category_id: categoryValue ? Number(categoryValue) : null,
      tag_ids: selectedTags,
    };
    try {
      if (postId) {
        await adminRequest<Post>(`/admin/posts/${postId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await adminRequest<Post>("/admin/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      navigate("/admin/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  const selectedTagIds = new Set(post?.tags?.map((tag) => tag.id) ?? []);
  const showEditor = editorMode === "edit" || editorMode === "split";
  const showPreview = editorMode === "preview" || editorMode === "split";

  return (
    <Card className="motion-panel">
      <CardContent className="p-5">
        <form key={post?.id ?? "new"} onSubmit={handleSubmit} className="grid gap-5">
          {error ? <p className="motion-notice rounded-md bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="标题">
              <input name="title" required defaultValue={post?.title ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="Slug">
              <input name="slug" required defaultValue={post?.slug ?? ""} className={inputClass} />
            </AdminField>
          </div>
          <AdminField label="摘要">
            <textarea name="summary" rows={3} defaultValue={post?.summary ?? ""} className={inputClass} />
          </AdminField>
          <div className="grid gap-4 md:grid-cols-3">
            <AdminField label="封面图">
              <div className="grid gap-2">
                <input
                  name="cover_image"
                  value={coverImage}
                  onChange={(event) => setCoverImage(event.target.value)}
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  <label className={cn(buttonVariants({ variant: "secondary", size: "default" }), "cursor-pointer")}>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {uploadingCover ? "上传中..." : "上传封面"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)}
                      disabled={uploadingCover}
                    />
                  </label>
                  {coverImage ? (
                    <Button type="button" variant="secondary" onClick={() => setCoverImage("")}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      清空
                    </Button>
                  ) : null}
                </div>
                <UploadProgress item={coverUploadProgress} />
                {coverImage ? (
                  <div className="overflow-hidden rounded-md border border-border bg-muted">
                    <img src={resolveAssetUrl(coverImage)} alt="文章封面预览" className="aspect-[16/9] w-full object-cover" />
                  </div>
                ) : (
                  <div className="grid aspect-[16/9] place-items-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
                    <ImageIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
              </div>
            </AdminField>
            <AdminField label="分类">
              <CustomSelect
                name="category_id"
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { label: "未分类", value: "" },
                  ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
                ]}
              />
            </AdminField>
            <AdminField label="状态">
              <CustomSelect
                name="status"
                value={status}
                onChange={setStatus}
                options={[
                  { label: "草稿", value: "draft" },
                  { label: "发布", value: "published" },
                ]}
              />
            </AdminField>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-foreground">标签</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Checkbox
                  key={tag.id}
                  name="tag_ids"
                  value={String(tag.id)}
                  defaultChecked={selectedTagIds.has(tag.id)}
                  label={tag.name}
                  className="rounded-md bg-muted px-3 py-2 text-foreground"
                />
              ))}
            </div>
          </div>
          <AdminField label="Markdown 正文">
            <div className="overflow-hidden rounded-lg border border-border bg-muted/70">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
                <div className="inline-flex rounded-md bg-muted p-1">
                  {editorModes.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setEditorMode(mode.value)}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-black text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                          editorMode === mode.value && "bg-background text-primary shadow-sm",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setContentDraft((value) => normalizeYuqueMarkdown(value))}
                    title="将语雀渲染页复制出来的纯文本整理为更标准的 Markdown"
                  >
                    <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    整理语雀文本
                  </Button>
                  <label className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer")}>
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    {uploadingArticleImage ? "上传中..." : "正文图片"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => void uploadArticleImage(event.target.files?.[0] ?? null)}
                      disabled={uploadingArticleImage}
                    />
                  </label>
                  <span className="text-xs font-bold text-muted-foreground">{contentDraft.length} 字符</span>
                </div>
              </div>
              <UploadProgress item={articleUploadProgress} />
              <div
                className={cn(
                  "grid gap-0 overflow-hidden",
                  editorMode === "split" && "lg:grid-cols-2",
                )}
              >
                {showEditor ? (
                  <textarea
                    name="content"
                    required
                    rows={22}
                    value={contentDraft}
                    onChange={(event) => setContentDraft(event.target.value)}
                    className="min-h-[32rem] resize-y border-0 bg-background px-4 py-4 font-mono text-sm leading-7 text-foreground outline-none ring-[var(--admin-focus-ring)] focus:ring-4"
                  />
                ) : null}
                {showPreview ? (
                  <div className="markdown-editor-preview min-h-[32rem] overflow-auto border-t border-border bg-background px-5 py-4 lg:border-l lg:border-t-0">
                    {contentDraft.trim() ? (
                      <MarkdownView content={contentDraft} />
                    ) : (
                      <p className="text-sm font-bold text-muted-foreground">Markdown 预览会显示在这里</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </AdminField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" aria-hidden="true" />
              保存
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/admin/posts")}>
              返回
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
