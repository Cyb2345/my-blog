import { SearchX } from "lucide-react";

export function EmptyState({ title = "暂时没有内容", description }: { title?: string; description?: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-ink/15 bg-white/55 p-8 text-center">
      <SearchX className="mb-3 h-9 w-9 text-ocean" aria-hidden="true" />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-ink/60">{description}</p> : null}
    </div>
  );
}
