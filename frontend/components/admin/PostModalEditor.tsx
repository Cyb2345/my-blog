"use client";

import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Strikethrough,
  Table2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { normalizeYuqueMarkdown } from "@/lib/markdown";
import { cn, getAssetUrl, normalizeSlug } from "@/lib/utils";
import type { Category, MediaAsset, Post, Tag } from "@/types/blog";

type PostFormState = {
  title: string;
  slug: string;
  summary: string;
  cover_image: string;
  category_id: string;
  tag_ids: number[];
  is_recommended: boolean;
  is_top: boolean;
  status: "draft" | "published";
  content: string;
};

type PostModalEditorProps = {
  open: boolean;
  mode: "create" | "edit";
  post?: Post | null;
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

const emptyForm = (): PostFormState => ({
  title: "",
  slug: "",
  summary: "",
  cover_image: "",
  category_id: "",
  tag_ids: [],
  is_recommended: false,
  is_top: false,
  status: "draft",
  content: "",
});

function postToForm(post: Post): PostFormState {
  return {
    title: post.title,
    slug: post.slug,
    summary: post.summary ?? "",
    cover_image: post.cover_image ?? "",
    category_id: post.category_id ? String(post.category_id) : "",
    tag_ids: post.tags?.map((tag) => tag.id) ?? [],
    is_recommended: Boolean(post.is_recommended),
    is_top: Boolean(post.is_top),
    status: post.status === "published" ? "published" : "draft",
    content: post.content ?? "",
  };
}

function fallbackSlug(title: string) {
  return normalizeSlug(title) || `post-${Date.now()}`;
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <span>
      <span className="text-red-500">*</span> {children}
    </span>
  );
}

function SwitchField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm font-bold text-ink dark:text-slate-200"
      aria-pressed={checked}
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
        )}
      >
        <span
          className={cn(
            "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function PostModalEditor({
  open,
  mode,
  post,
  categories,
  tags,
  onClose,
  onSaved,
}: PostModalEditorProps) {
  const [form, setForm] = useState<PostFormState>(emptyForm);
  const [error, setError] = useState("");
  const [loadingPost, setLoadingPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setFullscreen(false);
    setSlugTouched(mode === "edit");

    if (mode === "create") {
      setForm(emptyForm());
      return;
    }

    if (!post) return;
    setForm(postToForm(post));
    if (post.content) return;

    setLoadingPost(true);
    adminRequest<Post>(`/admin/posts/${post.id}`)
      .then((data) => setForm(postToForm(data)))
      .catch((err: Error) => setError(err.message || "文章加载失败"))
      .finally(() => setLoadingPost(false));
  }, [mode, open, post]);

  const selectedTagIds = useMemo(() => new Set(form.tag_ids), [form.tag_ids]);

  function updateField<Key extends keyof PostFormState>(key: Key, value: PostFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : normalizeSlug(value),
    }));
  }

  function toggleTag(tagId: number) {
    setForm((current) => ({
      ...current,
      tag_ids: current.tag_ids.includes(tagId)
        ? current.tag_ids.filter((id) => id !== tagId)
        : [...current.tag_ids, tagId],
    }));
  }

  function setContent(nextContent: string) {
    setForm((current) => ({ ...current, content: nextContent }));
  }

  function insertMarkdown(before: string, after = "", placeholder = "文本") {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(`${form.content}${before}${placeholder}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || placeholder;
    const nextContent = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;
    setContent(nextContent);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function insertLine(prefix: string, placeholder = "内容") {
    const textarea = textareaRef.current;
    const current = form.content;
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || placeholder;
    const lines = selected.split("\n").map((line) => `${prefix}${line || placeholder}`);
    const insert = lines.join("\n");
    const needsLead = start > 0 && current[start - 1] !== "\n";
    const needsTrail = end < current.length && current[end] !== "\n";
    const nextContent = `${current.slice(0, start)}${needsLead ? "\n" : ""}${insert}${needsTrail ? "\n" : ""}${current.slice(end)}`;
    setContent(nextContent);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      const offset = start + (needsLead ? 1 : 0);
      textarea?.setSelectionRange(offset, offset + insert.length);
    });
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploadingCover(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage_type", "post_cover");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", formData);
      updateField("cover_image", asset.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "封面上传失败，请重试");
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadArticleImage(file: File | null) {
    if (!file) return;
    setUploadingImage(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage_type", "article_image");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", formData);
      const alt = asset.original_name?.replace(/\.[^.]+$/, "") || "图片";
      insertMarkdown(`![${alt}](`, ")", asset.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "正文图片上传失败，请重试");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    const slug = (form.slug.trim() || fallbackSlug(title)).toLowerCase();

    if (!title) {
      setError("文章标题不能为空");
      return;
    }
    if (!content) {
      setError("Markdown 正文不能为空");
      return;
    }

    setSaving(true);
    setError("");
    const payload = {
      title,
      slug,
      summary: form.summary.trim() || null,
      content,
      cover_image: form.cover_image.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      tag_ids: form.tag_ids,
      is_recommended: form.is_recommended,
      is_top: form.is_top,
      status: form.status,
    };

    try {
      if (mode === "edit" && post) {
        await adminRequest<Post>(`/admin/posts/${post.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await adminRequest<Post>("/admin/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved(mode === "edit" ? "文章保存成功，列表已刷新。" : "文章新增成功，列表已刷新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const toolbar = [
    { label: "加粗", icon: Bold, action: () => insertMarkdown("**", "**", "加粗文本") },
    { label: "斜体", icon: Italic, action: () => insertMarkdown("*", "*", "斜体文本") },
    { label: "删除线", icon: Strikethrough, action: () => insertMarkdown("~~", "~~", "删除文本") },
    { label: "一级标题", icon: Heading1, action: () => insertLine("# ", "一级标题") },
    { label: "二级标题", icon: Heading2, action: () => insertLine("## ", "二级标题") },
    { label: "三级标题", icon: Heading3, action: () => insertLine("### ", "三级标题") },
    { label: "引用", icon: Quote, action: () => insertLine("> ", "引用内容") },
    { label: "无序列表", icon: List, action: () => insertLine("- ", "列表项") },
    { label: "有序列表", icon: ListOrdered, action: () => insertLine("1. ", "列表项") },
    { label: "代码块", icon: Code2, action: () => insertMarkdown("```bash\n", "\n```", "echo hello") },
    { label: "链接", icon: LinkIcon, action: () => insertMarkdown("[", "](https://example.com)", "链接文本") },
    { label: "表格", icon: Table2, action: () => insertLine("| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |", "") },
    { label: "分割线", icon: Minus, action: () => insertLine("---", "") },
  ];

  return (
    <AdminModal
      open={open}
      title={mode === "edit" ? "编辑文章" : "新增文章"}
      size={fullscreen ? "full" : "xl"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" form="post-modal-editor-form" disabled={saving || loadingPost}>
            {saving ? "提交中..." : "提交"}
          </Button>
        </>
      }
    >
      <form id="post-modal-editor-form" onSubmit={handleSubmit} className="grid gap-4">
        <ModalError message={error} />
        {loadingPost ? <p className="rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink/60 dark:bg-white/10 dark:text-slate-300">正在加载文章内容...</p> : null}

        <label className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
          <span className="text-sm font-bold text-ink dark:text-slate-200">
            <RequiredLabel>文章标题</RequiredLabel>
          </span>
          <input
            value={form.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            required
            placeholder="请输入文章标题"
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          <AdminField label="文章别名 Slug">
            <input
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                updateField("slug", normalizeSlug(event.target.value));
              }}
              placeholder="docker-basic"
              className={inputClass}
            />
          </AdminField>
          <AdminField label="分类">
            <select value={form.category_id} onChange={(event) => updateField("category_id", event.target.value)} className={inputClass}>
              <option value="">请选择文章分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="上架状态">
            <select value={form.status} onChange={(event) => updateField("status", event.target.value as PostFormState["status"])} className={inputClass}>
              <option value="draft">草稿</option>
              <option value="published">上架</option>
            </select>
          </AdminField>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <AdminField label="文章封面">
            <div className="grid gap-3">
              <div className="grid h-[158px] place-items-center overflow-hidden rounded-lg border border-ink/10 bg-paper dark:border-white/10 dark:bg-slate-950">
                {form.cover_image ? (
                  <img src={getAssetUrl(form.cover_image)} alt="文章封面预览" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-ink/40 dark:text-slate-500">暂无封面</span>
                )}
              </div>
              <input
                value={form.cover_image}
                onChange={(event) => updateField("cover_image", event.target.value)}
                placeholder="上传后自动填入 R2 图片 URL"
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
                    disabled={uploadingCover}
                    onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)}
                  />
                </label>
                <Button type="button" variant="ghost" onClick={() => updateField("cover_image", "")}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  清空
                </Button>
              </div>
            </div>
          </AdminField>

          <div className="grid gap-4">
            <AdminField label="文章简介">
              <textarea
                value={form.summary}
                onChange={(event) => updateField("summary", event.target.value.slice(0, 300))}
                rows={5}
                placeholder="请输入文章简介"
                className={inputClass}
              />
            </AdminField>
            <div className="grid gap-3 rounded-lg border border-ink/10 bg-paper/50 p-3 dark:border-white/10 dark:bg-slate-950/40">
              <p className="text-sm font-bold text-ink dark:text-slate-200">标签</p>
              <div className="flex flex-wrap gap-2">
                {tags.length ? (
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "interactive min-h-9 rounded-md px-3 text-sm font-bold ring-1 ring-ink/10 dark:ring-white/10",
                        selectedTagIds.has(tag.id)
                          ? "bg-ocean text-white ring-ocean dark:bg-sky-400 dark:text-slate-950"
                          : "bg-white text-ink/65 hover:text-ink dark:bg-white/10 dark:text-slate-300",
                      )}
                    >
                      {tag.name}
                    </button>
                  ))
                ) : (
                  <span className="text-sm font-bold text-ink/45 dark:text-slate-500">暂无标签</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-6 rounded-lg border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-slate-950/60">
              <SwitchField checked={form.is_recommended} label="是否推荐" onChange={(checked) => updateField("is_recommended", checked)} />
              <SwitchField checked={form.is_top} label="是否置顶" onChange={(checked) => updateField("is_top", checked)} />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-bold text-ink dark:text-slate-200">
            <RequiredLabel>文章内容</RequiredLabel>
          </span>
          <div className="overflow-hidden rounded-lg border border-ink/10 bg-paper/60 dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex flex-wrap items-center gap-1 border-b border-ink/10 bg-white/90 px-3 py-2 dark:border-white/10 dark:bg-slate-900/95">
              {toolbar.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="interactive grid h-9 w-9 place-items-center rounded-md text-ink/60 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
              <label
                className="interactive grid h-9 w-9 cursor-pointer place-items-center rounded-md text-ink/60 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
                aria-label="插入图片"
                title="插入图片"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={(event) => void uploadArticleImage(event.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={() => setContent(normalizeYuqueMarkdown(form.content))}
                className="interactive ml-0 inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-black text-ink/60 hover:bg-paper hover:text-ocean dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-sky-300 md:ml-2"
                title="整理语雀文本"
              >
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                整理语雀文本
              </button>
              <span className="ml-auto text-xs font-bold text-ink/45 dark:text-slate-500">
                {uploadingImage ? "图片上传中..." : `${form.content.length} 字符`}
              </span>
              <button
                type="button"
                onClick={() => setFullscreen((value) => !value)}
                className="interactive grid h-9 w-9 place-items-center rounded-md text-ink/60 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
                aria-label={fullscreen ? "退出全屏" : "全屏编辑"}
                title={fullscreen ? "退出全屏" : "全屏编辑"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <div className="grid lg:grid-cols-2">
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(event) => setContent(event.target.value)}
                required
                spellCheck={false}
                className={cn(
                  "min-h-[420px] resize-y border-0 bg-white px-4 py-4 font-mono text-sm leading-7 text-ink outline-none ring-ocean/20 focus:ring-4 dark:bg-slate-950 dark:text-slate-100 dark:ring-sky-300/20",
                  fullscreen && "min-h-[62vh]",
                )}
                placeholder="在这里编写 Markdown 内容..."
              />
              <div
                className={cn(
                  "markdown-editor-preview min-h-[420px] overflow-auto border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-950 lg:border-l lg:border-t-0",
                  fullscreen && "min-h-[62vh]",
                )}
              >
                {form.content.trim() ? (
                  <MarkdownView content={form.content} />
                ) : (
                  <p className="text-sm font-bold text-ink/45 dark:text-slate-500">Markdown 预览会显示在这里</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}
