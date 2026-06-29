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
        "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] max-h-72 origin-top overflow-auto rounded-lg border border-border bg-card p-1 shadow-xl transition-all duration-200 motion-reduce:transition-none border-border ",
        open
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
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
        "flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition-colors duration-150 hover:bg-muted hover:bg-accent",
        active
          ? "bg-accent text-primary bg-primary/15 text-primary"
          : "text-muted-foreground text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      {active ? (
        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
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
  const selected = categories.find(
    (category) => String(category.id) === normalizedValue,
  );

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
          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-bold outline-none ring-[var(--admin-focus-ring)] transition-all duration-200 hover:border-ocean/40 focus:ring-4 border-border text-foreground dark:ring-sky-300/20 dark:hover:border-sky-300/40",
          open && "border-ocean/70 dark:border-sky-300/70",
        )}
      >
        <span
          className={cn(
            "truncate",
            selected
              ? "text-foreground text-foreground"
              : "text-muted-foreground text-muted-foreground",
          )}
        >
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 text-muted-foreground",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
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
          <p className="px-3 py-2 text-sm font-bold text-muted-foreground text-muted-foreground">
            暂无可选分类
          </p>
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
  const extraSelectedCount = Math.max(
    selectedTags.length - visibleSelectedTags.length,
    0,
  );

  function toggle(tag: SelectOption) {
    onChange(
      selectedIds.has(tag.id)
        ? value.filter((id) => id !== tag.id)
        : [...value, tag.id],
    );
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
          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-bold outline-none ring-[var(--admin-focus-ring)] transition-all duration-200 hover:border-ocean/40 focus:ring-4 border-border text-foreground dark:ring-sky-300/20 dark:hover:border-sky-300/40",
          open && "border-ocean/70 dark:border-sky-300/70",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {selectedTags.length ? (
            <>
              {visibleSelectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex max-w-[7rem] shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-black text-primary bg-primary/15 text-primary"
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
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-sm hover:bg-primary/10 hover:bg-accent"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </span>
                </span>
              ))}
              {extraSelectedCount ? (
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-black text-muted-foreground bg-accent text-muted-foreground">
                  +{extraSelectedCount}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground text-muted-foreground">
              {placeholder}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 text-muted-foreground",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </div>
      <DropdownPanel open={open}>
        {tags.length ? (
          tags.map((tag) => (
            <OptionButton
              key={tag.id}
              active={selectedIds.has(tag.id)}
              onClick={() => toggle(tag)}
            >
              {tag.name}
            </OptionButton>
          ))
        ) : (
          <p className="px-3 py-2 text-sm font-bold text-muted-foreground text-muted-foreground">
            暂无标签
          </p>
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
  const extraSelectedCount = Math.max(
    selectedTags.length - visibleSelectedTags.length,
    0,
  );

  function toggleTag(tag: Tag) {
    onChange(
      selectedIds.has(tag.id)
        ? value.filter((id) => id !== tag.id)
        : [...value, tag.id],
    );
  }

  async function createCustomTag() {
    const name = draft.trim();
    if (!name || !onCreateTag || creating) return;
    const existing = tags.find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase(),
    );
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
      <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 border-border ">
        {selectedTags.length ? (
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {visibleSelectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex max-w-[7rem] shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-black text-primary bg-primary/15 text-primary"
              >
                <span className="truncate">{tag.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((id) => id !== tag.id))}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-sm hover:bg-primary/10 hover:bg-accent"
                  aria-label={`移除 ${tag.name}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {extraSelectedCount ? (
              <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-black text-muted-foreground bg-accent text-muted-foreground">
                +{extraSelectedCount}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground text-muted-foreground">
            暂未选择标签
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "interactive ml-auto inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm font-black ring-1 transition-all duration-200",
            open
              ? "bg-primary text-white ring-ocean bg-primary dark:text-white dark:ring-sky-300"
              : "bg-muted text-primary ring-[var(--admin-focus-ring)] hover:ring-ocean/50 bg-accent text-primary dark:ring-sky-300/20",
          )}
        >
          添加标签
        </button>
      </div>
      <div
        className={cn(
          "absolute left-0 top-[calc(100%+0.5rem)] z-[80] w-full min-w-[20rem] max-w-[min(36rem,calc(100vw-3rem))] origin-top rounded-lg border border-border bg-card p-4 shadow-xl transition-all duration-200 motion-reduce:transition-none border-border ",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-foreground text-foreground">
            标签
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground text-muted-foreground hover:text-foreground"
            aria-label="关闭标签面板"
          >
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
          className="min-h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-bold outline-none ring-[var(--admin-focus-ring)] focus:ring-4 border-border text-foreground dark:ring-sky-300/20"
        />
        {panelError ? (
          <p className="mt-2 text-xs font-bold text-destructive ">
            {panelError}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-black text-muted-foreground text-muted-foreground">
          {creating ? "正在添加标签..." : "添加标签"}
        </p>
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
                      ? "bg-primary text-white bg-primary dark:text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground bg-accent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <span className="text-sm font-bold text-muted-foreground text-muted-foreground">
                暂无标签
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
