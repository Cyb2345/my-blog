"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export const PopoverRoot = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent(
  { className, align = "center", sideOffset = 6, ...props },
  ref,
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-popover)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

type PopoverProps = HTMLAttributes<HTMLDivElement> & { open: boolean };

export function Popover({ open, className, ...props }: PopoverProps) {
  return (
    <div
      className={cn(
        "absolute z-40 min-w-44 origin-top-right rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-popover)] transition-all duration-[var(--motion-normal)]",
        open
          ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        className,
      )}
      aria-hidden={!open}
      {...props}
    />
  );
}
