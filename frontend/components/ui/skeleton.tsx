import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]", className)} {...props} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return <div className="grid gap-2">{Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")} />)}</div>;
}
