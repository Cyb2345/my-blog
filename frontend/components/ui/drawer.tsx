"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type DrawerProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  onClose: () => void;
};

export function Drawer({
  open,
  title,
  children,
  footer,
  side = "right",
  onClose,
}: DrawerProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent side={side} className="p-0">
        <header className="flex h-16 items-center justify-between border-b border-border px-5">
          <SheetHeader>
            <SheetTitle className="text-base">{title}</SheetTitle>
          </SheetHeader>
          <IconButton label="关闭" variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <SheetFooter className="border-t border-border px-5 py-4">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
