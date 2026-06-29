import {
  forwardRef,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
} from "react";

import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { id, label, hint, error, className, required, ...props },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const descriptionId =
      hint || error ? `${textareaId}-description` : undefined;
    const textarea = (
      <textarea
        id={textareaId}
        ref={ref}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={descriptionId}
        className={cn(
          "min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-destructive focus:border-destructive",
          className,
        )}
        {...props}
      />
    );

    if (!label) return textarea;

    return (
      <label
        className="grid gap-2 text-sm font-bold text-foreground"
        htmlFor={textareaId}
      >
        <span>
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </span>
        {textarea}
        {error ? (
          <span
            id={descriptionId}
            className="text-xs font-bold text-destructive"
          >
            {error}
          </span>
        ) : null}
        {!error && hint ? (
          <span
            id={descriptionId}
            className="text-xs font-semibold text-muted-foreground"
          >
            {hint}
          </span>
        ) : null}
      </label>
    );
  },
);
