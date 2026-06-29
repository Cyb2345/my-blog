"use client";

import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type UploadProgressStatus = "idle" | "uploading" | "success" | "error";

export type UploadProgressItem = {
  fileName: string;
  progress: number;
  status: UploadProgressStatus;
  error?: string;
};

const statusText: Record<UploadProgressStatus, string> = {
  idle: "等待上传",
  uploading: "上传中",
  success: "成功",
  error: "失败",
};

function StatusIcon({ status }: { status: UploadProgressStatus }) {
  if (status === "success")
    return (
      <CheckCircle2
        className="h-4 w-4 text-[var(--color-success)] dark:text-[var(--success)]"
        aria-hidden="true"
      />
    );
  if (status === "error")
    return (
      <CircleAlert
        className="h-4 w-4 text-destructive dark:text-[var(--danger)]"
        aria-hidden="true"
      />
    );
  return (
    <LoaderCircle
      className={cn(
        "h-4 w-4 text-primary dark:text-[var(--primary)]",
        status === "uploading" && "animate-spin",
      )}
      aria-hidden="true"
    />
  );
}

export function UploadProgress({ item }: { item?: UploadProgressItem | null }) {
  if (!item) return null;
  const progress = Math.max(0, Math.min(100, Math.round(item.progress || 0)));
  return (
    <div className="notice-pop rounded-lg border border-border bg-muted p-3 dark:border-[var(--border-soft)] dark:bg-[var(--bg-soft)]">
      <div className="flex items-center justify-between gap-3 text-sm font-bold">
        <span className="flex min-w-0 items-center gap-2 text-foreground dark:text-[var(--text)]">
          <StatusIcon status={item.status} />
          <span className="truncate" title={item.fileName}>
            {item.fileName}
          </span>
        </span>
        <span className="shrink-0 text-muted-foreground dark:text-[var(--text-muted)]">
          {statusText[item.status]} · {progress}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10 dark:bg-black/30">
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-300",
            item.status === "error"
              ? "bg-destructive/100 dark:bg-[var(--danger)]"
              : "bg-primary dark:bg-[var(--primary)]",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      {item.error ? (
        <p className="mt-2 text-xs font-bold text-destructive dark:text-[var(--danger)]">
          {item.error}
        </p>
      ) : null}
    </div>
  );
}
