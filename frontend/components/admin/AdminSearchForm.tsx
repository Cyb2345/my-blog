"use client";

import type { FormEventHandler, ReactNode } from "react";
import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminSearchFormProps = {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onReset?: () => void;
  actions?: ReactNode;
  submitText?: string;
  resetText?: string;
  loading?: boolean;
  className?: string;
  contentClassName?: string;
};

export function AdminSearchForm({
  children,
  onSubmit,
  onReset,
  actions,
  submitText = "查询",
  resetText = "重置",
  loading = false,
  className,
  contentClassName,
}: AdminSearchFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "rounded-md border border-border bg-card px-4 py-4 text-card-foreground shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "grid items-end gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(220px,1fr))_auto]",
          contentClassName,
        )}
      >
        {children}
        <div className="flex items-end gap-2 sm:col-span-2 sm:justify-end xl:col-span-1 xl:col-start-4">
          {actions ?? (
            <>
              <Button type="submit" loading={loading}>
                <Search className="h-4 w-4" aria-hidden="true" />
                {submitText}
              </Button>
              {onReset ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onReset}
                  disabled={loading}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {resetText}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </form>
  );
}
