import { forwardRef, type ReactNode, type SelectHTMLAttributes, useId } from "react";

import { cn } from "@/lib/utils";
import { inputBaseClass } from "@/components/ui/Input";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, hint, error, className, required, options, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = hint || error ? `${selectId}-description` : undefined;

  const select = (
    <select
      id={selectId}
      ref={ref}
      required={required}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={descriptionId}
      className={cn(inputBaseClass, "min-h-10 text-sm", error && "border-[var(--color-danger)] focus:border-[var(--color-danger)]", className)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <label className="grid gap-2 text-sm font-bold text-[var(--color-text)]" htmlFor={selectId}>
      <span>
        {label}
        {required ? <span className="ml-1 text-[var(--color-danger)]">*</span> : null}
      </span>
      {select}
      {error ? <span id={descriptionId} className="text-xs font-bold text-[var(--color-danger)]">{error}</span> : null}
      {!error && hint ? <span id={descriptionId} className="text-xs font-semibold text-[var(--color-text-subtle)]">{hint}</span> : null}
    </label>
  );
});
