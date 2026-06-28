"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type TabItem<Value extends string> = { label: ReactNode; value: Value; disabled?: boolean };
type TabsProps<Value extends string> = { value: Value; items: Array<TabItem<Value>>; onChange: (value: Value) => void; className?: string };

export const TabsRoot = TabsPrimitive.Root;
export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  function TabsList({ className, ...props }, ref) {
    return <TabsPrimitive.List ref={ref} className={cn("inline-flex min-h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />;
  },
);
export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  function TabsTrigger({ className, ...props }, ref) {
    return <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-black ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-focus-ring)] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm", className)} {...props} />;
  },
);
export const TabsContent = TabsPrimitive.Content;

export function Tabs<Value extends string>({ value, items, onChange, className }: TabsProps<Value>) {
  return <TabsRoot value={value} onValueChange={(nextValue) => onChange(nextValue as Value)}><TabsList className={cn("flex flex-wrap gap-1", className)}>{items.map((item) => <TabsTrigger key={item.value} value={item.value} disabled={item.disabled}>{item.label}</TabsTrigger>)}</TabsList></TabsRoot>;
}
