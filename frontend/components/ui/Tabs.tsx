import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TabItem<Value extends string> = {
  label: ReactNode;
  value: Value;
  disabled?: boolean;
};

type TabsProps<Value extends string> = {
  value: Value;
  items: Array<TabItem<Value>>;
  onChange: (value: Value) => void;
  className?: string;
};

export function Tabs<Value extends string>({ value, items, onChange, className }: TabsProps<Value>) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-md bg-[var(--color-bg-muted)] p-1", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          disabled={item.disabled}
          onClick={() => onChange(item.value)}
          className={cn(
            "min-h-9 rounded-md px-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            item.value === value ? "bg-[var(--color-surface)] text-[var(--admin-primary)] shadow-sm" : "text-[var(--color-text-subtle)] hover:text-[var(--color-text)]",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
