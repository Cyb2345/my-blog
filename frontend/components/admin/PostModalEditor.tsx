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
import {
  FormEvent,
  type UIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AdminField } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  PostCategorySelect,
  PostTagEditorSelect,
} from "@/components/admin/PostSelectControls";
import {
  UploadProgress,
  type UploadProgressItem,
} from "@/components/admin/UploadProgress";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function looksLikeHtmlDocument(value: string) {
  return (
    /<\/(p|h[1-6]|ul|ol|li|blockquote|pre|table|div)>/i.test(value) ||
    /<[^>]+data-line=/i.test(value)
  );
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
  if (tag === "blockquote")
    return `${text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}\n\n`;
  if (tag === "code") return `\`${children}\``;
  if (tag === "pre")
    return `\n\`\`\`\n${element.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
  if (tag === "a")
    return `[${children}](${element.getAttribute("href") ?? "#"})`;
  if (tag === "img")
    return `![${element.getAttribute("alt") ?? "图片"}](${element.getAttribute("src") ?? ""})\n\n`;
  if (tag === "li") return `- ${text}\n`;
  if (tag === "ul" || tag === "ol") return `${children}\n`;
  if (tag === "tr")
    return `${Array.from(element.children)
      .map((child) => child.textContent?.trim() ?? "")
      .join(" | ")}\n`;
  if (tag === "table") return `${element.textContent?.trim() ?? children}\n\n`;
  return children;
}

function previewMarkdown(content: string) {
  if (!looksLikeHtmlDocument(content)) return content;
  if (typeof window === "undefined") return content.replace(/<[^>]*>/g, "");
  const document = new DOMParser().parseFromString(content, "text/html");
  return Array.from(document.body.childNodes)
    .map(nodeToMarkdown)
    .join("")
    .trim();
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <span>
      <span className="text-red-500">*</span> {children}
    </span>
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
  const [coverUploadProgress, setCoverUploadProgress] =
    useState<UploadProgressItem | null>(null);
  const [imageUploadProgress, setImageUploadProgress] =
    useState<UploadProgressItem | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverLibraryOpen, setCoverLibraryOpen] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [networkCoverUrl, setNetworkCoverUrl] = useState("");
  const [coverDialogError, setCoverDialogError] = useState("");
  const [coverBroken, setCoverBroken] = useState(false);
  const [editorCategories, setEditorCategories] =
    useState<Category[]>(categories);
  const [categoryError, setCategoryError] = useState("");
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
    setCoverDialogOpen(false);
    setCoverLibraryOpen(false);
    setNetworkCoverUrl("");
    setCoverDialogError("");
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
    if (categories.length) {
      setEditorCategories(categories);
      setCategoryError("");
    }
  }, [categories]);

  useEffect(() => {
    if (!open || categories.length) return;
    setCategoryError("");
    adminRequest<Category[]>("/admin/categories")
      .then((data) => setEditorCategories(data))
      .catch((err: Error) =>
        setCategoryError(err.message || "分类列表加载失败"),
      );
  }, [categories.length, open]);

  useEffect(() => {
    setEditorTags(tags);
  }, [tags]);

  const renderedPreview = useMemo(
    () => previewMarkdown(form.content),
    [form.content],
  );

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
      if (!coverMenuRef.current?.contains(event.target as Node))
        setCoverMenuOpen(false);
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

  function updateField<Key extends keyof PostFormState>(
    key: Key,
    value: PostFormState[Key],
  ) {
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
        contentPastRef.current = [
          ...contentPastRef.current.slice(-79),
          current.content,
        ];
        contentFutureRef.current = [];
      }
      return { ...current, content: nextContent };
    });
  }

  function undoContent() {
    setForm((current) => {
      const previous = contentPastRef.current.pop();
      if (previous === undefined) return current;
      contentFutureRef.current = [
        ...contentFutureRef.current.slice(-79),
        current.content,
      ];
      return { ...current, content: previous };
    });
  }

  function redoContent() {
    setForm((current) => {
      const next = contentFutureRef.current.pop();
      if (next === undefined) return current;
      contentPastRef.current = [
        ...contentPastRef.current.slice(-79),
        current.content,
      ];
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
    preview.scrollTop =
      (editor.scrollTop / editorScrollable) * previewScrollable;
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
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }

  function insertLine(prefix: string, placeholder = "内容") {
    const textarea = textareaRef.current;
    const current = form.content;
    const start = textarea?.selectionStart ?? current.length;
    const end = textarea?.selectionEnd ?? current.length;
    const selected = current.slice(start, end) || placeholder;
    const lines = selected
      .split("\n")
      .map((line) => `${prefix}${line || placeholder}`);
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

  async function uploadArticleImage(file: File | null) {
    if (!file) return;
    setUploadingImage(true);
    setImageUploadProgress({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage_type", "article_image");
    try {
      const asset = await adminUpload<MediaAsset>(
        "/admin/uploads/image",
        formData,
        {
          onProgress: (progress) =>
            setImageUploadProgress({
              fileName: file.name,
              progress,
              status: "uploading",
            }),
        },
      );
      setImageUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "success",
      });
      const alt = asset.original_name?.replace(/\.[^.]+$/, "") || "图片";
      insertMarkdown(`![${alt}](`, ")", asset.url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "正文图片上传失败，请重试";
      setError(message);
      setImageUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "error",
        error: message,
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploadingCover(true);
    setCoverUploadProgress({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usage_type", "post_cover");
    try {
      const asset = await adminUpload<MediaAsset>(
        "/admin/uploads/image",
        formData,
        {
          onProgress: (progress) =>
            setCoverUploadProgress({
              fileName: file.name,
              progress,
              status: "uploading",
            }),
        },
      );
      setCoverUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "success",
      });
      updateField("cover_image", asset.url);
      setCoverMenuOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "封面上传失败，请重试";
      setError(message);
      setCoverUploadProgress({
        fileName: file.name,
        progress: 100,
        status: "error",
        error: message,
      });
    } finally {
      setUploadingCover(false);
    }
  }

  async function loadCoverLibrary() {
    setLoadingLibrary(true);
    setError("");
    setCoverMenuOpen(false);
    setCoverLibraryOpen(true);
    try {
      const assets = await adminRequest<MediaAsset[]>("/admin/media");
      setMediaAssets(
        assets.filter(
          (asset) => asset.is_active && asset.mime_type.startsWith("image/"),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件库图片加载失败");
      setMediaAssets([]);
    } finally {
      setLoadingLibrary(false);
    }
  }

  function applyNetworkCover() {
    const url = networkCoverUrl.trim();
    if (!url) {
      setCoverDialogError("请输入网络图片地址");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setCoverDialogError("网络图片地址需要以 http:// 或 https:// 开头");
      return;
    }
    updateField("cover_image", url);
    setNetworkCoverUrl("");
    setCoverDialogError("");
    setCoverDialogOpen(false);
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
    setEditorTags((current) =>
      current.some((tag) => tag.id === created.id)
        ? current
        : [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
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
      onSaved(
        mode === "edit"
          ? "文章保存成功，列表已刷新。"
          : "文章新增成功，列表已刷新。",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const toolbar = [
    { label: "撤销", icon: Undo2, action: undoContent },
    { label: "重做", icon: Redo2, action: redoContent },
    {
      label: "加粗",
      icon: Bold,
      action: () => insertMarkdown("**", "**", "加粗文本"),
    },
    {
      label: "斜体",
      icon: Italic,
      action: () => insertMarkdown("*", "*", "斜体文本"),
    },
    {
      label: "删除线",
      icon: Strikethrough,
      action: () => insertMarkdown("~~", "~~", "删除文本"),
    },
    {
      label: "一级标题",
      icon: Heading1,
      action: () => insertLine("# ", "一级标题"),
    },
    {
      label: "二级标题",
      icon: Heading2,
      action: () => insertLine("## ", "二级标题"),
    },
    {
      label: "三级标题",
      icon: Heading3,
      action: () => insertLine("### ", "三级标题"),
    },
    { label: "引用", icon: Quote, action: () => insertLine("> ", "引用内容") },
    { label: "无序列表", icon: List, action: () => insertLine("- ", "列表项") },
    {
      label: "有序列表",
      icon: ListOrdered,
      action: () => insertLine("1. ", "列表项"),
    },
    {
      label: "任务列表",
      icon: ListChecks,
      action: () => insertLine("- [ ] ", "待办项"),
    },
    {
      label: "行内代码",
      icon: Code,
      action: () => insertMarkdown("`", "`", "code"),
    },
    {
      label: "代码块",
      icon: Code2,
      action: () => insertMarkdown("```bash\n", "\n```", "echo hello"),
    },
    {
      label: "链接",
      icon: LinkIcon,
      action: () => insertMarkdown("[", "](https://example.com)", "链接文本"),
    },
    {
      label: "表格",
      icon: Table2,
      action: () =>
        insertLine("| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |", ""),
    },
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
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            type="submit"
            form="post-modal-editor-form"
            disabled={saving || loadingPost}
          >
            {saving ? "提交中..." : "提交"}
          </Button>
        </>
      }
    >
      <form
        id="post-modal-editor-form"
        onSubmit={handleSubmit}
        className="grid gap-4"
      >
        <ModalError message={error} />
        {loadingPost ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm font-bold text-muted-foreground bg-accent text-muted-foreground">
            正在加载文章内容...
          </p>
        ) : null}

        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 border-border ">
          <h3 className="text-sm font-black text-foreground text-foreground">
            基础信息
          </h3>
          <label className="grid gap-2 text-sm font-bold text-foreground text-foreground">
            <span>
              <RequiredLabel>文章标题</RequiredLabel>
            </span>
            <Input
              value={form.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              required
              placeholder="请输入文章标题"
            />
          </label>
          <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_180px]">
            <div className="grid gap-2 text-sm font-bold text-foreground text-foreground">
              <span>文章分类</span>
              <PostCategorySelect
                value={form.category_id}
                onChange={(value) => updateField("category_id", value)}
                categories={editorCategories}
              />
              {categoryError ? (
                <span className="text-xs font-bold text-destructive ">
                  {categoryError}
                </span>
              ) : null}
            </div>
            <div className="grid gap-2 text-sm font-bold text-foreground text-foreground">
              <span>文章标签</span>
              <PostTagEditorSelect
                value={form.tag_ids}
                onChange={(value) => updateField("tag_ids", value)}
                tags={editorTags}
                onCreateTag={createTag}
              />
            </div>
            <AdminField label="上架状态">
              <CustomSelect
                value={form.status}
                onChange={(value) =>
                  updateField("status", value as PostFormState["status"])
                }
                options={[
                  { label: "草稿", value: "draft" },
                  { label: "上架", value: "published" },
                ]}
              />
            </AdminField>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 border-border ">
          <h3 className="text-sm font-black text-foreground text-foreground">
            文章封面
          </h3>
          {form.cover_image ? (
            <div className="group relative grid h-[156px] w-[280px] max-w-full place-items-center overflow-hidden rounded-lg border border-border bg-muted text-xs font-bold text-muted-foreground border-border text-muted-foreground">
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
              <button
                type="button"
                onClick={() => updateField("cover_image", "")}
                className="interactive absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-destructive/100 text-white opacity-0 shadow-lg transition-opacity duration-150 hover:bg-destructive focus:opacity-100 group-hover:opacity-100"
                aria-label="删除封面"
                title="删除封面"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div ref={coverMenuRef} className="relative w-fit">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCoverMenuOpen((value) => !value)}
                disabled={uploadingCover}
                className="w-fit"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                {uploadingCover ? "上传中..." : "选择封面"}
              </Button>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingCover}
                onChange={(event) => {
                  void uploadCover(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <div
                className={cn(
                  "absolute left-0 top-[calc(100%+0.5rem)] z-[80] min-w-56 origin-top rounded-lg border border-border bg-card p-2 shadow-xl transition-all duration-200 motion-reduce:transition-none border-border ",
                  coverMenuOpen
                    ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
                )}
              >
                <button
                  type="button"
                  disabled
                  className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-md px-3 text-left text-sm font-black text-muted-foreground text-muted-foreground"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  从正文选择
                  <span className="ml-auto text-xs">后续支持</span>
                </button>
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  className="interactive flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-black text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-accent"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  本地上传
                </button>
                <button
                  type="button"
                  onClick={() => void loadCoverLibrary()}
                  className="interactive flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-black text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-accent"
                >
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                  文件库选择
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverMenuOpen(false);
                    setNetworkCoverUrl("");
                    setCoverDialogError("");
                    setCoverDialogOpen(true);
                  }}
                  className="interactive flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-black text-muted-foreground hover:bg-muted text-muted-foreground hover:bg-accent"
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  网络图片
                </button>
              </div>
            </div>
          )}
          <UploadProgress item={coverUploadProgress} />
        </section>

        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 border-border ">
          <h3 className="text-sm font-black text-foreground text-foreground">
            文章简介
          </h3>
          <label className="grid gap-2 text-sm font-bold text-foreground text-foreground">
            <Textarea
              value={form.summary}
              onChange={(event) =>
                updateField("summary", event.target.value.slice(0, 300))
              }
              rows={4}
              placeholder="请输入文章简介"
            />
          </label>
        </section>

        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 border-border ">
          <span className="text-sm font-bold text-foreground text-foreground">
            <RequiredLabel>文章内容</RequiredLabel>
          </span>
          <div
            className={cn(
              "overflow-hidden rounded-lg border border-border bg-muted transition-all duration-200 motion-reduce:transition-none border-border ",
              fullscreen &&
                "fixed inset-2 z-[70] flex flex-col rounded-xl bg-card shadow-2xl sm:inset-4",
            )}
          >
            <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-2 border-border ">
              {fullscreen ? (
                <span className="mr-2 text-sm font-black text-foreground text-foreground">
                  Markdown 全屏编辑
                </span>
              ) : null}
              {toolbar.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="interactive grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
              <label
                className="interactive grid h-9 w-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="插入图片"
                title="插入图片"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={(event) =>
                    void uploadArticleImage(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => setContent(normalizeYuqueMarkdown(form.content))}
                className="interactive ml-0 inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-black text-muted-foreground hover:bg-muted hover:text-primary text-muted-foreground hover:bg-accent hover:text-primary md:ml-2"
                title="整理语雀文本"
              >
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
                整理语雀文本
              </button>
              <span className="ml-auto text-xs font-bold text-muted-foreground text-muted-foreground">
                {uploadingImage
                  ? "图片上传中..."
                  : `${form.content.length} 字符`}
              </span>
              {fullscreen ? (
                <Button
                  type="submit"
                  form="post-modal-editor-form"
                  disabled={saving || loadingPost}
                  className="min-h-9 px-3 py-1 text-xs"
                >
                  {saving ? "提交中..." : "提交"}
                </Button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className={cn(
                  "interactive grid h-9 w-9 place-items-center rounded-md",
                  showPreview
                    ? "bg-muted text-foreground bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-label={showPreview ? "隐藏预览" : "显示预览"}
                title={showPreview ? "隐藏预览" : "显示预览"}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreen((value) => !value)}
                className="interactive grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={fullscreen ? "退出全屏" : "全屏编辑"}
                title={fullscreen ? "退出全屏" : "全屏编辑"}
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <UploadProgress item={imageUploadProgress} />
            <div
              className={cn(
                "grid",
                showPreview && "lg:grid-cols-2",
                fullscreen && "min-h-0 flex-1",
              )}
            >
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(event) => setContent(event.target.value)}
                onScroll={handleEditorScroll}
                required
                spellCheck={false}
                className={cn(
                  "min-h-[460px] resize-y border-0 bg-card px-4 py-4 font-mono text-sm leading-7 text-foreground outline-none ring-[var(--admin-focus-ring)] focus:ring-4",
                  fullscreen && "h-full min-h-0 resize-none overflow-auto",
                )}
                placeholder="在这里编写 Markdown 内容..."
              />
              {showPreview ? (
                <div
                  ref={previewRef}
                  className={cn(
                    "markdown-editor-preview min-h-[460px] overflow-auto border-t border-border bg-card px-5 py-4 border-border lg:border-l lg:border-t-0",
                    fullscreen && "h-full min-h-0",
                  )}
                >
                  {form.content.trim() ? (
                    <MarkdownView content={renderedPreview} />
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground text-muted-foreground">
                      Markdown 预览会显示在这里
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground border-border text-muted-foreground">
              <span>字数：{form.content.length}</span>
              <button
                type="button"
                onClick={() => setSyncScroll((value) => !value)}
                disabled={!showPreview}
                className={cn(
                  "interactive inline-flex min-h-8 items-center gap-2 rounded-md px-3 transition-all duration-200",
                  syncScroll
                    ? "bg-primary text-white bg-primary dark:text-white"
                    : "bg-muted text-muted-foreground ring-1 ring-border bg-accent text-muted-foreground ring-border",
                  !showPreview && "cursor-not-allowed opacity-50",
                )}
                aria-pressed={syncScroll}
              >
                {syncScroll ? "同步滚动：开" : "同步滚动：关"}
              </button>
            </div>
          </div>
        </section>
      </form>
      {coverLibraryOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="关闭文件库选择弹窗"
            onClick={() => setCoverLibraryOpen(false)}
          />
          <section className="relative flex max-h-[82vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-card shadow-2xl border-border ">
            <header className="flex items-center justify-between border-b border-border px-5 py-4 border-border">
              <div>
                <h3 className="text-lg font-black text-foreground text-foreground">
                  文件库选择
                </h3>
                <p className="mt-1 text-xs font-bold text-muted-foreground text-muted-foreground">
                  仅展示已有图片资源，点击图片后设为文章封面。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoverLibraryOpen(false)}
                className="interactive grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="关闭"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto p-5">
              {loadingLibrary ? (
                <p className="rounded-md bg-muted px-3 py-3 text-sm font-bold text-muted-foreground bg-accent text-muted-foreground">
                  正在加载文件库图片...
                </p>
              ) : mediaAssets.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {mediaAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        updateField("cover_image", asset.url);
                        setCoverLibraryOpen(false);
                      }}
                      className="group grid gap-2 rounded-lg border border-border bg-muted p-2 text-left transition-all duration-150 hover:border-primary hover:shadow-md"
                    >
                      <span className="grid h-28 place-items-center overflow-hidden rounded-md bg-card text-xs font-bold text-muted-foreground text-muted-foreground">
                        <img
                          src={getAssetUrl(asset.url)}
                          alt={asset.original_name}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      </span>
                      <span className="truncate text-xs font-bold text-muted-foreground text-muted-foreground">
                        {asset.original_name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-muted px-3 py-3 text-sm font-bold text-muted-foreground bg-accent text-muted-foreground">
                  文件库暂无可选图片
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
      {coverDialogOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="关闭添加网络图片弹窗"
            onClick={() => setCoverDialogOpen(false)}
          />
          <section className="relative w-full max-w-lg rounded-lg border border-border bg-card shadow-2xl border-border ">
            <header className="flex items-center justify-between border-b border-border px-5 py-4 border-border">
              <h3 className="text-lg font-black text-foreground text-foreground">
                添加网络图片
              </h3>
              <button
                type="button"
                onClick={() => setCoverDialogOpen(false)}
                className="interactive grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="关闭"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="grid gap-3 px-5 py-4">
              <label className="grid gap-2 text-sm font-bold text-foreground text-foreground">
                请输入网络图片地址
                <Input
                  value={networkCoverUrl}
                  onChange={(event) => {
                    setNetworkCoverUrl(event.target.value);
                    setCoverDialogError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyNetworkCover();
                    }
                  }}
                  autoFocus
                  placeholder="https://img.ccby.us/images/example.png"
                />
              </label>
              {coverDialogError ? (
                <p className="text-sm font-bold text-destructive ">
                  {coverDialogError}
                </p>
              ) : null}
            </div>
            <footer className="flex justify-end gap-2 border-t border-border px-5 py-4 border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCoverDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="button" onClick={applyNetworkCover}>
                确定
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </AdminModal>
  );
}
