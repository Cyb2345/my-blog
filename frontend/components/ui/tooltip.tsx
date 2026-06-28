"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<ElementRef<typeof TooltipPrimitive.Content>, ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  function TooltipContent({ className, sideOffset = 6, ...props }, ref) {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 overflow-hidden rounded-md bg-foreground px-2 py-1 text-xs font-bold text-background shadow-[var(--shadow-popover)] animate-in fade-in-0 zoom-in-95", className)} {...props} />
      </TooltipPrimitive.Portal>
    );
  },
);

type TooltipProps = { label: ReactNode; children: ReactNode; className?: string };

export function Tooltip({ label, children, className }: TooltipProps) {
  return <TooltipProvider delayDuration={250}><TooltipRoot><TooltipTrigger asChild><span className={cn("inline-flex", className)}>{children}</span></TooltipTrigger><TooltipContent>{label}</TooltipContent></TooltipRoot></TooltipProvider>;
}
