import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ label, className, checked, onCheckedChange, disabled, ...props }: SwitchProps) {
  return (
    <label className={cn("inline-flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold text-[var(--color-text-muted)]", disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        {...props}
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-text)_16%,transparent)] transition-colors peer-checked:bg-[var(--admin-primary)]">
        <span className="absolute top-1 h-4 w-4 translate-x-1 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-6" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
