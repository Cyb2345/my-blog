import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyProps = { title?: ReactNode; description?: ReactNode; action?: ReactNode; className?: string };

export function Empty({ title = "暂无数据", description, action, className }: EmptyProps) {
  return (
    <div className={cn("flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center", className)}>
      <SearchX className="mb-3 size-9 text-primary" aria-hidden="true" />
      <h3 className="text-lg font-bold text-card-foreground">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm font-semibold text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
