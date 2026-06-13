"use client";

import {
  Bold,
  Code,
  Code2,
  Eye,
  FileText,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Trash2,
  Undo2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, type UIEvent, useEffect, useMemo, useRef, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { PostCategorySelect, PostTagEditorSelect } from "@/components/admin/PostSelectControls";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { normalizeYuqueMarkdown } from "@/lib/markdown";
import { cn, getAssetUrl, normalizeSlug } from "@/lib/utils";
import type { Category, MediaAsset, Paginated, Post, Tag } from "@/types/blog";

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

function looksLikeHtmlDocument(value: string) {
  return /<\/(p|h[1-6]|ul|ol|li|blockquote|pre|table|div)>/i.test(value) || /<[^>]+data-line=/i.test(value);
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType !== 1) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(nodeToMarkdown).join("");
  const text = children.trim();

  if (!text && tag !== "br" && tag !== "hr") return "";
  if (tag === "br") return "\n";
  if (tag === "hr") return "\n---\n\n";
  if (tag === "p" || tag === "div") return `${children.trim()}\n\n`;
  if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${text}\n\n`;
  if (tag === "strong" || tag === "b") return `**${children}**`;
  if (tag === "em" || tag === "i") return `*${children}*`;
  if (tag === "del" || tag === "s") return `~~${children}~~`;
  if (tag === "blockquote") return `${text.split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
  if (tag === "code") return `\`${children}\``;
  if (tag === "pre") return `\n\`\`\`\n${element.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
  if (tag === "a") return `[${children}](${element.getAttribute("href") ?? "#"})`;
  if (tag === "img") return `![${element.getAttribute("alt") ?? "图片"}](${element.getAttribute("src") ?? ""})\n\n`;
  if (tag === "li") return `- ${text}\n`;
  if (tag === "ul" || tag === "ol") return `${children}\n`;
  if (tag === "tr") return `${Array.from(element.children).map((child) => child.textContent?.trim() ?? "").join(" | ")}\n`;
  if (tag === "table") return `${element.textContent?.trim() ?? children}\n\n`;
  return children;
}

function previewMarkdown(content: string) {
  if (!looksLikeHtmlDocument(content)) return content;
  if (typeof window === "undefined") return content.replace(/<[^>]*>/g, "");
  const document = new DOMParser().parseFromString(content, "text/html");
  return Array.from(document.body.childNodes).map(nodeToMarkdown).join("").trim();
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
  const [syncScroll, setSyncScroll] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [coverLibraryOpen, setCoverLibraryOpen] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [networkCoverUrl, setNetworkCoverUrl] = useState("");
  const [coverBroken, setCoverBroken] = useState(false);
  const [editorTags, setEditorTags] = useState<Tag[]>(tags);
  const coverMenuRef = useRef<HTMLDivElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef(false);
  const contentPastRef = useRef<string[]>([]);
  const contentFutureRef = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setFullscreen(false);
    setCoverMenuOpen(false);
    setCoverLibraryOpen(false);
    setNetworkCoverUrl("");
    setCoverBroken(false);
    setShowPreview(true);
    contentPastRef.current = [];
    contentFutureRef.current = [];

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

  useEffect(() => {
    setEditorTags(tags);
  }, [tags]);

  const renderedPreview = useMemo(() => previewMarkdown(form.content), [form.content]);

  useEffect(() => {
    if (!fullscreen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    setCoverBroken(false);
  }, [form.cover_image]);

  useEffect(() => {
    if (!coverMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!coverMenuRef.current?.contains(event.target as Node)) setCoverMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCoverMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [coverMenuOpen]);

  function updateField<Key extends keyof PostFormState>(key: Key, value: PostFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
    }));
  }

  function setContent(nextContent: string, recordHistory = true) {
    setForm((current) => {
      if (recordHistory && current.content !== nextContent) {
        contentPastRef.current = [...contentPastRef.current.slice(-79), current.content];
        contentFutureRef.current = [];
      }
      return { ...current, content: nextContent };
    });
  }

  function undoContent() {
    setForm((current) => {
      const previous = contentPastRef.current.pop();
      if (previous === undefined) return current;
      contentFutureRef.current = [...contentFutureRef.current.slice(-79), current.content];
      return { ...current, content: previous };
    });
  }

  function redoContent() {
    setForm((current) => {
      const next = contentFutureRef.current.pop();
      if (next === undefined) return current;
      contentPastRef.current = [...contentPastRef.current.slice(-79), current.content];
      return { ...current, content: next };
    });
  }

  function handleEditorScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (!syncScroll || syncingScrollRef.current || !previewRef.current) return;
    const editor = event.currentTarget;
    const preview = previewRef.current;
    const editorScrollable = editor.scrollHeight - editor.clientHeight;
    const previewScrollable = preview.scrollHeight - preview.clientHeight;
    if (editorScrollable <= 0 || previewScrollable <= 0) return;

    syncingScrollRef.current = true;
    preview.scrollTop = (editor.scrollTop / editorScrollable) * previewScrollable;
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
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
    setCoverMenuOpen(false);
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
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
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

  async function loadMediaLibrary() {
    setCoverLibraryOpen(true);
    setCoverMenuOpen(false);
    if (mediaAssets.length) return;
    setLoadingLibrary(true);
    setError("");
    try {
      const data = await adminRequest<Paginated<MediaAsset>>("/admin/files?file_type=image&page=1&page_size=24");
      setMediaAssets(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件库加载失败");
    } finally {
      setLoadingLibrary(false);
    }
  }

  function applyNetworkCover() {
    const url = networkCoverUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("网络图片地址需要以 http:// 或 https:// 开头");
      return;
    }
    updateField("cover_image", url);
    setNetworkCoverUrl("");
    setCoverMenuOpen(false);
  }

  async function createTag(name: string) {
    const baseSlug = normalizeSlug(name) || `tag-${Date.now()}`;
    const created = await adminRequest<Tag>("/admin/tags", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        slug: baseSlug,
        description: null,
      }),
    });
    setEditorTags((current) => (current.some((tag) => tag.id === created.id) ? current : [...current, created].sort((a, b) => a.name.localeCompare(b.name))));
    return created;
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
    { label: "撤销", icon: Undo2, action: undoContent },
    { label: "重做", icon: Redo2, action: redoContent },
    { label: "加粗", icon: Bold, action: () => insertMarkdown("**", "**", "加粗文本") },
    { label: "斜体", icon: Italic, action: () => insertMarkdown("*", "*", "斜体文本") },
    { label: "删除线", icon: Strikethrough, action: () => insertMarkdown("~~", "~~", "删除文本") },
    { label: "一级标题", icon: Heading1, action: () => insertLine("# ", "一级标题") },
    { label: "二级标题", icon: Heading2, action: () => insertLine("## ", "二级标题") },
    { label: "三级标题", icon: Heading3, action: () => insertLine("### ", "三级标题") },
    { label: "引用", icon: Quote, action: () => insertLine("> ", "引用内容") },
    { label: "无序列表", icon: List, action: () => insertLine("- ", "列表项") },
    { label: "有序列表", icon: ListOrdered, action: () => insertLine("1. ", "列表项") },
    { label: "任务列表", icon: ListChecks, action: () => insertLine("- [ ] ", "待办项") },
    { label: "行内代码", icon: Code, action: () => insertMarkdown("`", "`", "code") },
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

        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="grid content-start gap-2 text-sm font-bold text-ink dark:text-slate-200">
            <span>文章封面</span>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadingCover}
              onChange={(event) => void uploadCover(event.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              {form.cover_image ? (
                <div className="group relative grid h-[104px] w-[184px] place-items-center overflow-hidden rounded-lg border border-ink/10 bg-paper text-xs font-bold text-ink/40 dark:border-white/10 dark:bg-slate-950 dark:text-slate-500">
                  {!coverBroken ? (
                    <img
                      src={getAssetUrl(form.cover_image)}
                      alt="文章封面预览"
                      className="h-full w-full object-cover"
                      onError={() => setCoverBroken(true)}
                    />
                  ) : (
                    <span>加载失败</span>
                  )}
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => updateField("cover_image", "")}
                      className="interactive grid h-10 w-10 place-items-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                      aria-label="删除封面"
                      title="删除封面"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}
              <div ref={coverMenuRef} className="relative">
                <Button type="button" variant="ghost" onClick={() => setCoverMenuOpen((value) => !value)} disabled={uploadingCover}>
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  {form.cover_image ? "更换封面" : uploadingCover ? "上传中..." : "选择封面"}
                </Button>
                <div
                  className={cn(
                    "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 origin-top rounded-lg border border-ink/10 bg-white p-2 shadow-xl transition-all duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-900",
                    coverMenuOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
                  )}
                >
                  <button
                    type="button"
                    disabled
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-ink/35 dark:text-slate-600"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    <span>从正文选择</span>
                    <span className="ml-auto text-xs">后续支持</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-ink/70 transition-colors hover:bg-paper dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    本地上传
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadMediaLibrary()}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-ink/70 transition-colors hover:bg-paper dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <FolderOpen className="h-4 w-4" aria-hidden="true" />
                    文件库选择
                  </button>
                  <div className="mt-2 rounded-md bg-paper p-2 dark:bg-slate-950/70">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black text-ink/50 dark:text-slate-400">
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      网络图片
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={networkCoverUrl}
                        onChange={(event) => setNetworkCoverUrl(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            applyNetworkCover();
                          }
                        }}
                        placeholder="https://..."
                        className="min-h-9 min-w-0 flex-1 rounded-md border border-ink/10 bg-white px-2 text-xs font-bold outline-none ring-ocean/20 focus:ring-2 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={applyNetworkCover}
                        className="interactive rounded-md bg-ocean px-3 text-xs font-black text-white dark:bg-sky-400 dark:text-slate-950"
                      >
                        使用
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <AdminField label="文章简介">
            <textarea
              value={form.summary}
              onChange={(event) => updateField("summary", event.target.value.slice(0, 300))}
              rows={4}
              placeholder="请输入文章简介"
              className={inputClass}
            />
          </AdminField>
          {coverLibraryOpen ? (
            <div className="notice-pop grid gap-3 rounded-lg border border-ink/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/70 lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-ink dark:text-slate-100">文件库选择</p>
                <button type="button" onClick={() => setCoverLibraryOpen(false)} className="text-ink/45 hover:text-ink dark:text-slate-500 dark:hover:text-slate-100" aria-label="关闭文件库">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {loadingLibrary ? (
                <p className="rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink/50 dark:bg-white/10 dark:text-slate-400">正在加载图片资源...</p>
              ) : (
                <div className="grid max-h-64 grid-cols-2 gap-3 overflow-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {mediaAssets.length ? (
                    mediaAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          updateField("cover_image", asset.url);
                          setCoverLibraryOpen(false);
                        }}
                        className="group grid gap-2 rounded-lg border border-ink/10 bg-paper p-2 text-left transition-all duration-150 hover:border-ocean/50 dark:border-white/10 dark:bg-slate-900 dark:hover:border-sky-300/50"
                      >
                        <span className="grid h-20 place-items-center overflow-hidden rounded-md bg-white text-xs font-bold text-ink/40 dark:bg-slate-950 dark:text-slate-500">
                          <img src={getAssetUrl(asset.url)} alt={asset.original_name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        </span>
                        <span className="truncate text-xs font-bold text-ink/60 dark:text-slate-400">{asset.original_name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="col-span-full rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink/50 dark:bg-white/10 dark:text-slate-400">文件库暂无图片</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.7fr)_minmax(180px,0.6fr)]">
          <AdminField label="分类">
            <PostCategorySelect
              value={form.category_id}
              onChange={(value) => updateField("category_id", value)}
              categories={categories}
            />
          </AdminField>
          <div className="grid gap-2 text-sm font-bold text-ink dark:text-slate-200">
            <span>标签</span>
            <PostTagEditorSelect
              value={form.tag_ids}
              onChange={(value) => updateField("tag_ids", value)}
              tags={editorTags}
              onCreateTag={createTag}
            />
          </div>
          <AdminField label="上架状态">
            <select value={form.status} onChange={(event) => updateField("status", event.target.value as PostFormState["status"])} className={inputClass}>
              <option value="draft">草稿</option>
              <option value="published">上架</option>
            </select>
          </AdminField>
        </div>

        <div className="flex flex-wrap gap-6 rounded-lg border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-slate-950/60">
          <SwitchField checked={form.is_recommended} label="是否推荐" onChange={(checked) => updateField("is_recommended", checked)} />
          <SwitchField checked={form.is_top} label="是否置顶" onChange={(checked) => updateField("is_top", checked)} />
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-bold text-ink dark:text-slate-200">
            <RequiredLabel>文章内容</RequiredLabel>
          </span>
          <div
            className={cn(
              "overflow-hidden rounded-lg border border-ink/10 bg-paper/60 transition-all duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950/60",
              fullscreen && "fixed inset-2 z-[70] flex flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-950 sm:inset-4",
            )}
          >
            <div className="flex flex-wrap items-center gap-1 border-b border-ink/10 bg-white/90 px-3 py-2 dark:border-white/10 dark:bg-slate-900/95">
              {fullscreen ? (
                <span className="mr-2 text-sm font-black text-ink dark:text-slate-100">Markdown 全屏编辑</span>
              ) : null}
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
              {fullscreen ? (
                <Button type="submit" form="post-modal-editor-form" disabled={saving || loadingPost} className="min-h-9 px-3 py-1 text-xs">
                  {saving ? "提交中..." : "提交"}
                </Button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className={cn(
                  "interactive grid h-9 w-9 place-items-center rounded-md",
                  showPreview
                    ? "bg-paper text-ink dark:bg-white/10 dark:text-slate-100"
                    : "text-ink/60 hover:bg-paper hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100",
                )}
                aria-label={showPreview ? "隐藏预览" : "显示预览"}
                title={showPreview ? "隐藏预览" : "显示预览"}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
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
            <div className={cn("grid", showPreview && "lg:grid-cols-2", fullscreen && "min-h-0 flex-1")}>
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(event) => setContent(event.target.value)}
                onScroll={handleEditorScroll}
                required
                spellCheck={false}
                className={cn(
                  "min-h-[460px] resize-y border-0 bg-white px-4 py-4 font-mono text-sm leading-7 text-ink outline-none ring-ocean/20 focus:ring-4 dark:bg-slate-950 dark:text-slate-100 dark:ring-sky-300/20",
                  fullscreen && "h-full min-h-0 resize-none overflow-auto",
                )}
                placeholder="在这里编写 Markdown 内容..."
              />
              {showPreview ? (
                <div
                  ref={previewRef}
                  className={cn(
                    "markdown-editor-preview min-h-[460px] overflow-auto border-t border-ink/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-950 lg:border-l lg:border-t-0",
                    fullscreen && "h-full min-h-0",
                  )}
                >
                  {form.content.trim() ? (
                    <MarkdownView content={renderedPreview} />
                  ) : (
                    <p className="text-sm font-bold text-ink/45 dark:text-slate-500">Markdown 预览会显示在这里</p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white/90 px-3 py-2 text-xs font-bold text-ink/45 dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-500">
              <span>字数：{form.content.length}</span>
              <button
                type="button"
                onClick={() => setSyncScroll((value) => !value)}
                disabled={!showPreview}
                className={cn(
                  "interactive inline-flex min-h-8 items-center gap-2 rounded-md px-3 transition-all duration-200",
                  syncScroll
                    ? "bg-ocean text-white dark:bg-sky-400 dark:text-slate-950"
                    : "bg-paper text-ink/60 ring-1 ring-ink/10 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10",
                  !showPreview && "cursor-not-allowed opacity-50",
                )}
                aria-pressed={syncScroll}
              >
                {syncScroll ? "同步滚动：开" : "同步滚动：关"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}
