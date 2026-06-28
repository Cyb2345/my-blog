"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { label?: ReactNode };

export function Checkbox({ label, className, disabled, ...props }: CheckboxProps) {
  return (
    <label className={cn("inline-flex min-h-9 items-center gap-2 text-sm font-bold text-muted-foreground", disabled && "cursor-not-allowed opacity-60", className)}>
      <CheckboxPrimitive.Root disabled={disabled} className="peer size-4 shrink-0 rounded-sm border border-input bg-background text-primary ring-offset-background focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" {...props}>
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
