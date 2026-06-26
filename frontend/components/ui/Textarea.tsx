import { forwardRef, type ReactNode, type TextareaHTMLAttributes, useId } from "react";

import { cn } from "@/lib/utils";
import { inputBaseClass } from "@/components/ui/Input";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, hint, error, className, required, rows = 4, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const descriptionId = hint || error ? `${textareaId}-description` : undefined;

  const textarea = (
    <textarea
      id={textareaId}
      ref={ref}
      rows={rows}
      required={required}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={descriptionId}
      className={cn(inputBaseClass, "min-h-24 resize-y text-sm", error && "border-[var(--color-danger)] focus:border-[var(--color-danger)]", className)}
      {...props}
    />
  );

  if (!label) return textarea;

  return (
    <label className="grid gap-2 text-sm font-bold text-[var(--color-text)]" htmlFor={textareaId}>
      <span>
        {label}
        {required ? <span className="ml-1 text-[var(--color-danger)]">*</span> : null}
      </span>
      {textarea}
      {error ? <span id={descriptionId} className="text-xs font-bold text-[var(--color-danger)]">{error}</span> : null}
      {!error && hint ? <span id={descriptionId} className="text-xs font-semibold text-[var(--color-text-subtle)]">{hint}</span> : null}
    </label>
  );
});
