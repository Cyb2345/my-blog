import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from "react";

import { cn } from "@/lib/utils";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  controlSize?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "min-h-9 text-xs",
  md: "min-h-10 text-sm",
  lg: "min-h-11 text-base",
};

export const inputBaseClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, className, controlSize = "md", required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = hint || error ? `${inputId}-description` : undefined;
  const input = (
    <input
      id={inputId}
      ref={ref}
      required={required}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={descriptionId}
      className={cn(
        inputBaseClass,
        sizeClass[controlSize],
        error && "border-destructive focus:border-destructive",
        className,
      )}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label
      className="grid gap-2 text-sm font-bold text-foreground"
      htmlFor={inputId}
    >
      <span>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </span>
      {input}
      {error ? (
        <span id={descriptionId} className="text-xs font-bold text-destructive">
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
});
