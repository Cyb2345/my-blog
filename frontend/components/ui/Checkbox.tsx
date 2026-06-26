import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("inline-flex min-h-9 items-center gap-2 text-sm font-bold text-[var(--color-text-muted)]", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--admin-primary)]"
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
