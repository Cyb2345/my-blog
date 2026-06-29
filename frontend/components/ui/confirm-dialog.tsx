"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title = "删除确认",
  description,
  error,
  loading = false,
  confirmText = "确定",
  cancelText = "取消",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  function handleClose() {
    if (!loading) onClose();
  }

  return (
    <Dialog
      open={open}
      title={title}
      size="sm"
      onClose={handleClose}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? (
          <p className="rounded-md bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] px-3 py-2 text-sm font-bold text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-destructive">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <p className="text-base font-black text-foreground">{description}</p>
        </div>
      </div>
    </Dialog>
  );
}
