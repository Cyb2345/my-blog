import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
};

function getPageNumbers(current: number, total: number) {
  const count = Math.min(Math.max(total, 1), 7);
  let start = Math.max(1, current - Math.floor(count / 2));
  const end = Math.min(Math.max(total, 1), start + count - 1);
  start = Math.max(1, end - count + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  loading = false,
  disabled = false,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const normalizedTotal = Math.max(totalPages, 1);
  const numbers = getPageNumbers(page, normalizedTotal);
  const [jumpPage, setJumpPage] = useState(String(page || 1));
  const isDisabled = disabled || loading;

  useEffect(() => {
    setJumpPage(String(page || 1));
  }, [page]);

  function goToPage(nextPage: number) {
    if (!Number.isFinite(nextPage)) return;
    onPageChange(Math.min(Math.max(nextPage, 1), normalizedTotal));
  }

  return (
    <nav className={cn("flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-[var(--color-text-muted)]", className)} aria-label="分页">
      {typeof total === "number" ? <span>共 {total} 条</span> : null}
      {pageSize && onPageSizeChange ? (
        <Select
          aria-label="每页条数"
          value={String(pageSize)}
          disabled={isDisabled}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          options={pageSizeOptions.map((value) => ({ label: `${value}条/页`, value: String(value) }))}
          className="h-10 w-32"
        />
      ) : null}
      <button
        type="button"
        disabled={isDisabled || page <= 1}
        onClick={() => goToPage(page - 1)}
        className="interactive inline-flex h-10 items-center gap-1 rounded-md bg-[var(--color-bg-muted)] px-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        上一页
      </button>
      {numbers.map((number) => (
        <button
          key={number}
          type="button"
          disabled={isDisabled}
          onClick={() => goToPage(number)}
          aria-current={number === page ? "page" : undefined}
          className={cn(
            "interactive h-10 min-w-10 rounded-md px-3 disabled:cursor-not-allowed disabled:opacity-50",
            number === page ? "bg-[var(--admin-primary)] text-white" : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
          )}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        disabled={isDisabled || page >= normalizedTotal}
        onClick={() => goToPage(page + 1)}
        className="interactive inline-flex h-10 items-center gap-1 rounded-md bg-[var(--color-bg-muted)] px-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        下一页
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <span>前往</span>
      <input
        value={jumpPage}
        onChange={(event) => setJumpPage(event.target.value.replace(/\D/g, ""))}
        onKeyDown={(event) => {
          if (event.key === "Enter") goToPage(Number(jumpPage));
        }}
        disabled={isDisabled}
        className="h-10 w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[var(--color-text)] outline-none focus:border-[var(--admin-primary)] focus:ring-4 focus:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="跳转页码"
      />
      <span>页</span>
      <Button type="button" variant="ghost" size="sm" disabled={isDisabled} onClick={() => goToPage(Number(jumpPage))}>
        跳转
      </Button>
    </nav>
  );
}
