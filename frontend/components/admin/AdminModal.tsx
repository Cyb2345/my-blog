"use client";

import { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";

type AdminModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  footer?: ReactNode;
};

export function AdminModal({
  open,
  title,
  children,
  onClose,
  size = "md",
  footer,
}: AdminModalProps) {
  return (
    <Dialog
      open={open}
      title={title}
      size={size}
      footer={footer}
      onClose={onClose}
    >
      {children}
    </Dialog>
  );
}

export function ModalError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] px-3 py-2 text-sm font-bold text-destructive">
      {message}
    </p>
  );
}
