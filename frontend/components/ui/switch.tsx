"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type {
  ComponentPropsWithoutRef,
  ElementRef,
  InputHTMLAttributes,
} from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const SwitchControl = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function SwitchControl({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
});

type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({
  label,
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold text-muted-foreground",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        {...props}
      />
      <SwitchControl
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
