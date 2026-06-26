import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function getPageNumbers(current: number, total: number) {
  const count = Math.min(Math.max(total, 1), 7);
  let start = Math.max(1, current - Math.floor(count / 2));
  const end = Math.min(Math.max(total, 1), start + count - 1);
  start = Math.max(1, end - count + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  const normalizedTotal = Math.max(totalPages, 1);
  const numbers = getPageNumbers(page, normalizedTotal);

  return (
    <nav className={cn("flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-[var(--color-text-muted)]", className)} aria-label="分页">
      {typeof total === "number" ? <span>共 {total} 条</span> : null}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="interactive inline-flex h-10 items-center gap-1 rounded-md bg-[var(--color-bg-muted)] px-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        上一页
      </button>
      {numbers.map((number) => (
        <button
          key={number}
          type="button"
          onClick={() => onPageChange(number)}
          aria-current={number === page ? "page" : undefined}
          className={cn(
            "interactive h-10 min-w-10 rounded-md px-3",
            number === page ? "bg-[var(--admin-primary)] text-white" : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
          )}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= normalizedTotal}
        onClick={() => onPageChange(page + 1)}
        className="interactive inline-flex h-10 items-center gap-1 rounded-md bg-[var(--color-bg-muted)] px-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        下一页
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
