import type { CSSProperties, Key, ReactNode } from "react";

import {
  defaultTableSettings,
  tableDensityCellClass,
  type TableSettings,
} from "@/components/admin/DataTableToolbar";
import { TableSkeletonRows } from "@/components/admin/TableSkeletonRows";
import { Empty } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type AdminDataTableColumn<Row> = {
  key: string;
  title: ReactNode;
  dataIndex?: keyof Row;
  width?: number | string;
  minWidth?: number | string;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
  ellipsis?: boolean;
  hidden?: boolean;
  sticky?: "right";
  render?: (row: Row, index: number) => ReactNode;
};

export type AdminDataTableProps<Row> = {
  columns: Array<AdminDataTableColumn<Row>>;
  data: Row[];
  rowKey: keyof Row | ((row: Row) => Key);
  settings?: Partial<TableSettings>;
  loading?: boolean;
  skeletonRows?: number;
  emptyText?: ReactNode;
  minWidth?: number | string;
  selectedRowKeys?: ReadonlySet<Key>;
  onSelectRow?: (row: Row, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  allSelected?: boolean;
  getCheckboxLabel?: (row: Row, index: number) => string;
  rowClassName?: (row: Row, index: number) => string | undefined;
  pagination?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
};

function resolveRowKey<Row>(row: Row, rowKey: keyof Row | ((row: Row) => Key)): Key {
  return typeof rowKey === "function" ? rowKey(row) : (row[rowKey] as Key);
}

function widthStyle(width?: number | string, minWidth?: number | string): CSSProperties | undefined {
  if (!width && !minWidth) return undefined;
  return {
    width: typeof width === "number" ? `${width}px` : width,
    minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth,
  };
}

export function AdminDataTable<Row>({
  columns,
  data,
  rowKey,
  settings,
  loading = false,
  skeletonRows = 6,
  emptyText = "暂无数据",
  minWidth,
  selectedRowKeys,
  onSelectRow,
  onSelectAll,
  allSelected,
  getCheckboxLabel,
  rowClassName,
  pagination,
  toolbar,
  className,
}: AdminDataTableProps<Row>) {
  const mergedSettings: TableSettings = { ...defaultTableSettings, ...settings };
  const visibleColumns = columns.filter((column) => !column.hidden);
  const cellClass = tableDensityCellClass[mergedSettings.density];
  const selectable = Boolean(selectedRowKeys && onSelectRow);
  const columnCount = visibleColumns.length + (selectable ? 1 : 0);

  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}>
      {toolbar ? <div className="border-b border-border px-4 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">
        <table
          className={cn(
            "admin-table w-full table-fixed border-collapse text-sm",
            mergedSettings.bordered &&
              "[&_td]:border-r [&_td]:border-border [&_th]:border-r [&_th]:border-border",
          )}
          style={{ minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth }}
        >
          <colgroup>
            {selectable ? <col className="w-14" /> : null}
            {visibleColumns.map((column) => (
              <col key={column.key} style={widthStyle(column.width, column.minWidth)} />
            ))}
          </colgroup>
          <thead className={cn("text-left text-muted-foreground", mergedSettings.headerBackground && "bg-muted")}>
            <tr>
              {selectable ? (
                <th className={cn("text-center", cellClass)}>
                  <input
                    type="checkbox"
                    checked={Boolean(allSelected)}
                    onChange={(event) => onSelectAll?.(event.target.checked)}
                    aria-label="选择当前页"
                    className="size-4 accent-[var(--primary)]"
                  />
                </th>
              ) : null}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    cellClass,
                    column.sticky === "right" && "sticky right-0 z-10 bg-muted",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.headerClassName,
                  )}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data.length ? <TableSkeletonRows columns={columnCount} rows={skeletonRows} cellClassName={cellClass} /> : null}
            {data.map((row, rowIndex) => {
              const key = resolveRowKey(row, rowKey);
              return (
                <tr
                  key={key}
                  className={cn(
                    "border-t border-border transition-colors hover:bg-[var(--admin-table-hover)]",
                    mergedSettings.striped && rowIndex % 2 === 1 && "bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]",
                    rowClassName?.(row, rowIndex),
                  )}
                >
                  {selectable ? (
                    <td className={cn("text-center", cellClass)}>
                      <input
                        type="checkbox"
                        checked={selectedRowKeys?.has(key)}
                        onChange={(event) => onSelectRow?.(row, event.target.checked)}
                        aria-label={getCheckboxLabel?.(row, rowIndex) ?? `选择第 ${rowIndex + 1} 行`}
                        className="size-4 accent-[var(--primary)]"
                      />
                    </td>
                  ) : null}
                  {visibleColumns.map((column) => {
                    const value = column.render
                      ? column.render(row, rowIndex)
                      : column.dataIndex
                        ? (row[column.dataIndex] as ReactNode)
                        : null;
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          cellClass,
                          column.sticky === "right" && "sticky right-0 bg-card",
                          column.sticky === "right" && mergedSettings.striped && rowIndex % 2 === 1 && "bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))]",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right",
                          column.ellipsis && "truncate",
                          column.className,
                        )}
                        title={column.ellipsis && typeof value === "string" ? value : undefined}
                      >
                        {column.ellipsis ? <span className="block truncate">{value}</span> : value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!data.length && !loading ? (
              <tr>
                <td colSpan={columnCount} className="p-0">
                  <Empty title={emptyText} className="min-h-52 border-0 bg-transparent" />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pagination ? <div className="border-t border-border px-4 py-4">{pagination}</div> : null}
    </section>
  );
}
