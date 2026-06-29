import { cn } from "@/lib/utils";

export function TableSkeletonRows({
  columns,
  rows = 6,
  cellClassName,
}: {
  columns: number;
  rows?: number;
  cellClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-border">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex} className={cellClassName}>
              <span
                className={cn(
                  "block h-4 rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
                  columnIndex === 0 && "mx-auto w-5",
                  columnIndex === columns - 1 && "mx-auto w-16",
                  columnIndex !== 0 &&
                    columnIndex !== columns - 1 &&
                    "w-full max-w-[9rem]",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
