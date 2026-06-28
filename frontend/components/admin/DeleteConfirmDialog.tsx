"use client";
import type { ReactNode } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type DeleteConfirmDialogProps = {
  open: boolean;
  description: ReactNode;
  error?: string;
  loading?: boolean;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  open,
  description,
  error,
  loading = false,
  confirmText = "确定",
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="删除确认"
      description={description}
      error={error}
      loading={loading}
      confirmText={loading ? "删除中..." : confirmText}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
