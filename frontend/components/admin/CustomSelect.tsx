"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type CustomSelectOption = {
  label: string;
  value: string;
  description?: string;
  thumbnail?: string;
};

type CustomSelectProps = {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  searchable?: boolean;
  emptyLabel?: string;
};

function Thumbnail({ src, label }: { src?: string; label: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="grid h-10 w-16 shrink-0 place-items-center rounded-md bg-muted text-xs font-black text-muted-foreground ring-1 ring-border dark:bg-[var(--surface-soft)] dark:text-[var(--text-muted)] dark:ring-[var(--border-soft)]">
        无图
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={label}
      className="h-10 w-16 shrink-0 rounded-md object-cover ring-1 ring-border dark:ring-[var(--border-soft)]"
      onError={() => setFailed(true)}
    />
  );
}

export function CustomSelect({
  value,
  options,
  onChange,
  name,
  placeholder = "请选择",
  disabled = false,
  className,
  panelClassName,
  searchable = false,
  emptyLabel = "暂无选项",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = keyword.trim()
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ""}`
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      )
    : options;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "interactive flex min-h-10 w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm font-bold text-foreground outline-none ring-[var(--admin-focus-ring)] hover:border-ocean disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)] dark:ring-[color-mix(in_srgb,var(--primary)_24%,transparent)] dark:hover:border-[var(--primary)]",
          open && "border-ocean ring-4 dark:border-[var(--primary)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.thumbnail ? (
          <Thumbnail src={selected.thumbnail} label={selected.label} />
        ) : null}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate",
              !selected &&
                "text-muted-foreground dark:text-[var(--text-muted)]",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          {selected?.description ? (
            <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground dark:text-[var(--text-muted)]">
              {selected.description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform dark:text-[var(--text-muted)]",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[60] overflow-hidden rounded-lg border border-border bg-card shadow-2xl dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]",
            panelClassName,
          )}
        >
          {searchable ? (
            <div className="border-b border-border p-2 dark:border-[var(--border-soft)]">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索"
                className="min-h-9 w-full rounded-md border border-border bg-muted px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-[var(--admin-focus-ring)] dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)] dark:text-[var(--text)]"
              />
            </div>
          ) : null}
          <div className="max-h-72 overflow-y-auto p-1" role="listbox">
            {filtered.length ? (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value || "__empty"}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setKeyword("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition-colors",
                      active
                        ? "bg-primary text-white dark:bg-[var(--primary)] dark:text-white"
                        : "text-foreground/72 hover:bg-muted dark:text-[var(--text-secondary)] dark:hover:bg-[var(--hover)]",
                    )}
                  >
                    {option.thumbnail ? (
                      <Thumbnail src={option.thumbnail} label={option.label} />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-xs font-semibold",
                            active
                              ? "text-white/72"
                              : "text-muted-foreground dark:text-[var(--text-muted)]",
                          )}
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-sm font-bold text-muted-foreground dark:text-[var(--text-muted)]">
                {emptyLabel}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
