"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Category, Tag } from "@/types/blog";

type SelectOption = {
  id: number;
  name: string;
};

function useCloseOnOutside(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return ref;
}

function DropdownPanel({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] max-h-72 origin-top overflow-auto rounded-lg border border-ink/10 bg-white p-1 shadow-xl transition-all duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-900",
        open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
      )}
    >
      {children}
    </div>
  );
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition-colors duration-150 hover:bg-paper dark:hover:bg-white/10",
        active ? "bg-ocean/10 text-ocean dark:bg-sky-400/15 dark:text-sky-200" : "text-ink/70 dark:text-slate-300",
      )}
    >
      <span className="truncate">{children}</span>
      {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}

export function PostCategorySelect({
  value,
  onChange,
  categories,
  placeholder = "请选择文章分类",
}: {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useCloseOnOutside(open, () => setOpen(false));
  const normalizedValue = value ? String(value) : "";
  const selected = categories.find((category) => String(category.id) === normalizedValue);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        aria-expanded={open}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-left text-sm font-bold outline-none ring-ocean/20 transition-all duration-200 hover:border-ocean/40 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20 dark:hover:border-sky-300/40",
          open && "border-ocean/70 dark:border-sky-300/70",
        )}
      >
        <span className={cn("truncate", selected ? "text-ink dark:text-slate-100" : "text-ink/40 dark:text-slate-500")}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink/45 transition-transform duration-200 dark:text-slate-500", open && "rotate-180")} aria-hidden="true" />
      </div>
      <DropdownPanel open={open}>
        <OptionButton
          active={!normalizedValue}
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          不限分类
        </OptionButton>
        {categories.length ? (
          categories.map((category) => (
            <OptionButton
              key={category.id}
              active={String(category.id) === normalizedValue}
              onClick={() => {
                onChange(String(category.id));
                setOpen(false);
              }}
            >
              {category.name}
            </OptionButton>
          ))
        ) : (
          <p className="px-3 py-2 text-sm font-bold text-ink/45 dark:text-slate-500">暂无可选分类</p>
        )}
      </DropdownPanel>
    </div>
  );
}

export function PostTagMultiSelect({
  value,
  onChange,
  tags,
  placeholder = "请选择文章标签",
}: {
  value: number[];
  onChange: (value: number[]) => void;
  tags: Tag[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useCloseOnOutside(open, () => setOpen(false));
  const selectedIds = useMemo(() => new Set(value), [value]);
  const selectedTags = tags.filter((tag) => selectedIds.has(tag.id));
  const visibleSelectedTags = selectedTags.slice(0, 2);
  const extraSelectedCount = Math.max(selectedTags.length - visibleSelectedTags.length, 0);

  function toggle(tag: SelectOption) {
    onChange(selectedIds.has(tag.id) ? value.filter((id) => id !== tag.id) : [...value, tag.id]);
  }

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        aria-expanded={open}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-left text-sm font-bold outline-none ring-ocean/20 transition-all duration-200 hover:border-ocean/40 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20 dark:hover:border-sky-300/40",
          open && "border-ocean/70 dark:border-sky-300/70",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {selectedTags.length ? (
            <>
              {visibleSelectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex max-w-[7rem] shrink-0 items-center gap-1 rounded-md bg-ocean/10 px-2 py-1 text-xs font-black text-ocean dark:bg-sky-400/15 dark:text-sky-200"
                >
                  <span className="truncate">{tag.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`移除 ${tag.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(value.filter((id) => id !== tag.id));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onChange(value.filter((id) => id !== tag.id));
                      }
                    }}
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-sm hover:bg-ocean/10 dark:hover:bg-white/10"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </span>
                </span>
              ))}
              {extraSelectedCount ? <span className="shrink-0 rounded-md bg-paper px-2 py-1 text-xs font-black text-ink/50 dark:bg-white/10 dark:text-slate-400">+{extraSelectedCount}</span> : null}
            </>
          ) : (
            <span className="text-ink/40 dark:text-slate-500">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink/45 transition-transform duration-200 dark:text-slate-500", open && "rotate-180")} aria-hidden="true" />
      </div>
      <DropdownPanel open={open}>
        {tags.length ? (
          tags.map((tag) => (
            <OptionButton key={tag.id} active={selectedIds.has(tag.id)} onClick={() => toggle(tag)}>
              {tag.name}
            </OptionButton>
          ))
        ) : (
          <p className="px-3 py-2 text-sm font-bold text-ink/45 dark:text-slate-500">暂无标签</p>
        )}
      </DropdownPanel>
    </div>
  );
}

export function PostTagEditorSelect({
  value,
  onChange,
  tags,
  onCreateTag,
}: {
  value: number[];
  onChange: (value: number[]) => void;
  tags: Tag[];
  onCreateTag?: (name: string) => Promise<Tag>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [panelError, setPanelError] = useState("");
  const ref = useCloseOnOutside(open, () => setOpen(false));
  const selectedIds = useMemo(() => new Set(value), [value]);
  const selectedTags = tags.filter((tag) => selectedIds.has(tag.id));
  const visibleSelectedTags = selectedTags.slice(0, 3);
  const extraSelectedCount = Math.max(selectedTags.length - visibleSelectedTags.length, 0);

  function toggleTag(tag: Tag) {
    onChange(selectedIds.has(tag.id) ? value.filter((id) => id !== tag.id) : [...value, tag.id]);
  }

  async function createCustomTag() {
    const name = draft.trim();
    if (!name || !onCreateTag || creating) return;
    const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.has(existing.id)) onChange([...value, existing.id]);
      setDraft("");
      setPanelError("");
      return;
    }

    setCreating(true);
    setPanelError("");
    try {
      const created = await onCreateTag(name);
      onChange([...value, created.id]);
      setDraft("");
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "标签创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex h-10 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-slate-950/70">
        {selectedTags.length ? (
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {visibleSelectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex max-w-[7rem] shrink-0 items-center gap-1 rounded-md bg-ocean/10 px-2 py-1 text-xs font-black text-ocean dark:bg-sky-400/15 dark:text-sky-200"
              >
                <span className="truncate">{tag.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((id) => id !== tag.id))}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-sm hover:bg-ocean/10 dark:hover:bg-white/10"
                  aria-label={`移除 ${tag.name}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {extraSelectedCount ? <span className="shrink-0 rounded-md bg-paper px-2 py-1 text-xs font-black text-ink/50 dark:bg-white/10 dark:text-slate-400">+{extraSelectedCount}</span> : null}
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink/40 dark:text-slate-500">暂未选择标签</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "interactive ml-auto inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm font-black ring-1 transition-all duration-200",
            open
              ? "bg-ocean text-white ring-ocean dark:bg-sky-400 dark:text-white dark:ring-sky-300"
              : "bg-paper text-ocean ring-ocean/20 hover:ring-ocean/50 dark:bg-white/10 dark:text-sky-200 dark:ring-sky-300/20",
          )}
        >
          添加标签
        </button>
      </div>
      <div
        className={cn(
          "absolute left-0 top-[calc(100%+0.5rem)] z-[80] w-full min-w-[20rem] max-w-[min(36rem,calc(100vw-3rem))] origin-top rounded-lg border border-ink/10 bg-white p-4 shadow-xl transition-all duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-900",
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-ink dark:text-slate-100">标签</p>
          <button type="button" onClick={() => setOpen(false)} className="text-ink/45 hover:text-ink dark:text-slate-500 dark:hover:text-slate-100" aria-label="关闭标签面板">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void createCustomTag();
            }
          }}
          placeholder="请输入标签名，enter 添加自定义标签"
          className="min-h-10 w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-bold outline-none ring-ocean/20 focus:ring-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:ring-sky-300/20"
        />
        {panelError ? <p className="mt-2 text-xs font-bold text-red-600 dark:text-rose-300">{panelError}</p> : null}
        <p className="mt-3 text-xs font-black text-ink/50 dark:text-slate-400">{creating ? "正在添加标签..." : "添加标签"}</p>
        <div className="mt-2 max-h-52 overflow-auto pr-1">
          <div className="flex flex-wrap gap-2">
            {tags.length ? (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "interactive rounded-md px-2.5 py-1.5 text-xs font-black transition-all duration-150",
                    selectedIds.has(tag.id)
                      ? "bg-ocean text-white dark:bg-sky-400 dark:text-white"
                      : "bg-paper text-ink/65 hover:text-ink dark:bg-white/10 dark:text-slate-300 dark:hover:text-slate-100",
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
      </div>
    </div>
  );
}
