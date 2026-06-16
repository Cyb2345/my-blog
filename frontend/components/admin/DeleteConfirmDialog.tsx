"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";

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
  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <AdminModal
      open={open}
      title="删除确认"
      size="sm"
      onClose={handleClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "删除中..." : confirmText}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <ModalError message={error} />
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-rose-500/15 dark:text-rose-200">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-base font-black text-ink dark:text-slate-100">{description}</p>
        </div>
      </div>
    </AdminModal>
  );
}
