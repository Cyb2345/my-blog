"use client";

import { Columns2, Eye, Image as ImageIcon, PencilLine, Save, Upload, WandSparkles, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { UploadProgress, type UploadProgressItem } from "@/components/admin/UploadProgress";
import { useAdminViewTransitionNavigate } from "@/components/admin/useAdminViewTransitionNavigate";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { Button } from "@/components/ui/button";
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
    <form key={post?.id ?? "new"} onSubmit={handleSubmit} className="motion-surface grid gap-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      {error ? <p className="notice-pop rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
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
              <label className="interactive inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
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
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="interactive inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  清空
                </button>
              ) : null}
            </div>
            <UploadProgress item={coverUploadProgress} />
            {coverImage ? (
              <div className="overflow-hidden rounded-md border border-ink/10 bg-paper dark:border-white/10 dark:bg-slate-950">
                <img src={resolveAssetUrl(coverImage)} alt="文章封面预览" className="aspect-[16/9] w-full object-cover" />
              </div>
            ) : (
              <div className="grid aspect-[16/9] place-items-center rounded-md border border-dashed border-ink/15 bg-paper text-ink/45 dark:border-white/10 dark:bg-slate-950 dark:text-slate-500">
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
        <p className="mb-2 text-sm font-bold text-ink">标签</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label key={tag.id} className="inline-flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink/70">
              <input name="tag_ids" type="checkbox" value={tag.id} defaultChecked={selectedTagIds.has(tag.id)} />
              {tag.name}
            </label>
          ))}
        </div>
      </div>
      <AdminField label="Markdown 正文">
        <div className="rounded-lg border border-ink/10 bg-paper/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-white/75 px-3 py-2">
            <div className="inline-flex rounded-md bg-paper p-1">
              {editorModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setEditorMode(mode.value)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-black text-ink/60 hover:text-ink",
                      editorMode === mode.value && "bg-white text-ocean shadow-sm",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setContentDraft((value) => normalizeYuqueMarkdown(value))}
                className="interactive inline-flex min-h-9 items-center gap-2 rounded-md bg-white px-3 text-xs font-black text-ink/60 shadow-sm ring-1 ring-ink/10 hover:text-ocean"
                title="将语雀渲染页复制出来的纯文本整理为更标准的 Markdown"
              >
                <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                整理语雀文本
              </button>
              <label className="interactive inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md bg-white px-3 text-xs font-black text-ink/60 shadow-sm ring-1 ring-ink/10 hover:text-ocean">
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
              <span className="text-xs font-bold text-ink/45">{contentDraft.length} 字符</span>
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
                className="min-h-[32rem] resize-y border-0 bg-white px-4 py-4 font-mono text-sm leading-7 text-ink outline-none ring-ocean/20 focus:ring-4"
              />
            ) : null}
            {showPreview ? (
              <div className="markdown-editor-preview min-h-[32rem] overflow-auto border-t border-ink/10 bg-white px-5 py-4 lg:border-l lg:border-t-0">
                {contentDraft.trim() ? (
                  <MarkdownView content={contentDraft} />
                ) : (
                  <p className="text-sm font-bold text-ink/45">Markdown 预览会显示在这里</p>
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
  );
}
