"use client";

import { Columns3, RefreshCw, Rows3, Settings } from "lucide-react";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAdminLayout } from "@/components/admin/AdminLayoutContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TableDensity = "compact" | "default" | "loose";

export type TableSettings = {
  bordered: boolean;
  striped: boolean;
  headerBackground: boolean;
  density: TableDensity;
  visibleColumns: string[];
};

export type TableColumnOption = {
  key: string;
  label: string;
  locked?: boolean;
};

type TablePanel = "density" | "columns" | "style" | null;

type DataTableToolbarProps = {
  settings: TableSettings;
  onSettingsChange: Dispatch<SetStateAction<TableSettings>>;
  columns?: TableColumnOption[];
  onRefresh?: () => void;
  refreshing?: boolean;
  enableRefresh?: boolean;
  enableDensity?: boolean;
  enableColumns?: boolean;
  enableStyle?: boolean;
};

const densityOptions: Array<{ value: TableDensity; label: string }> = [
  { value: "compact", label: "紧凑" },
  { value: "default", label: "默认" },
  { value: "loose", label: "宽松" },
];

export const tableDensityCellClass: Record<TableDensity, string> = {
  compact: "p-2",
  default: "p-3",
  loose: "p-5",
};

export const defaultTableSettings: TableSettings = {
  bordered: true,
  striped: false,
  headerBackground: true,
  density: "default",
  visibleColumns: [],
};

function normalizeSettings(value: unknown, fallback: TableSettings, columns?: TableColumnOption[]) {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Partial<TableSettings>;
  const columnKeys = columns?.map((column) => column.key) ?? fallback.visibleColumns;
  const visibleColumns = Array.isArray(record.visibleColumns)
    ? record.visibleColumns.filter((key): key is string => typeof key === "string" && columnKeys.includes(key))
    : fallback.visibleColumns;
  const lockedColumns = columns?.filter((column) => column.locked).map((column) => column.key) ?? [];

  return {
    bordered: typeof record.bordered === "boolean" ? record.bordered : fallback.bordered,
    striped: typeof record.striped === "boolean" ? record.striped : fallback.striped,
    headerBackground: typeof record.headerBackground === "boolean" ? record.headerBackground : fallback.headerBackground,
    density: record.density && densityOptions.some((option) => option.value === record.density) ? record.density : fallback.density,
    visibleColumns: Array.from(new Set([...visibleColumns, ...lockedColumns])),
  };
}

export function useTableSettings(
  storageKey: string,
  fallbackSettings: TableSettings,
  columns?: TableColumnOption[],
): [TableSettings, Dispatch<SetStateAction<TableSettings>>] {
  const [settings, setSettings] = useState<TableSettings>(fallbackSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setSettings(raw ? normalizeSettings(JSON.parse(raw), fallbackSettings, columns) : fallbackSettings);
    } catch {
      setSettings(fallbackSettings);
    } finally {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [ready, settings, storageKey]);

  return [settings, setSettings];
}

function ToolPopover({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover
      open={open}
      className={cn("right-0 top-[calc(100%+0.5rem)] min-w-44", className)}
    >
      {children}
    </Popover>
  );
}

function ToolIconButton({
  active,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "secondary"}
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export function TableDensitySelector({
  settings,
  onSettingsChange,
  onClose,
}: {
  settings: TableSettings;
  onSettingsChange: Dispatch<SetStateAction<TableSettings>>;
  onClose: () => void;
}) {
  const { t } = useAdminLayout();
  return (
    <div className="grid gap-1">
      {densityOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onSettingsChange((current) => ({ ...current, density: option.value }));
            onClose();
          }}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
            settings.density === option.value ? "bg-accent text-accent-foreground" : "text-muted-foreground",
          )}
        >
          {t(option.label)}
          {settings.density === option.value ? <span>✓</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ColumnVisibilityPopover({
  settings,
  onSettingsChange,
  columns,
}: {
  settings: TableSettings;
  onSettingsChange: Dispatch<SetStateAction<TableSettings>>;
  columns: TableColumnOption[];
}) {
  const { t } = useAdminLayout();
  return (
    <div className="grid gap-1">
      {columns.map((column) => {
        const checked = settings.visibleColumns.includes(column.key);
        return (
          <div
            key={column.key}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
              checked ? "text-primary" : "text-muted-foreground",
              column.locked && "opacity-80",
            )}
          >
            <Checkbox
              checked={checked}
              disabled={column.locked}
              onCheckedChange={() => {
                if (column.locked) return;
                onSettingsChange((current) => {
                  const visible = new Set(current.visibleColumns);
                  if (visible.has(column.key)) visible.delete(column.key);
                  else visible.add(column.key);
                  return { ...current, visibleColumns: Array.from(visible) };
                });
              }}
            />
            {t(column.label)}
          </div>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onSettingsChange((current) => ({ ...current, visibleColumns: columns.map((column) => column.key) }))}
        className="mt-1 w-full justify-start"
      >
        {t("恢复默认列")}
      </Button>
    </div>
  );
}

export function TableStyleSettings({
  settings,
  onSettingsChange,
}: {
  settings: TableSettings;
  onSettingsChange: Dispatch<SetStateAction<TableSettings>>;
}) {
  const { t } = useAdminLayout();
  return (
    <div className="grid gap-1">
      {[
        { key: "bordered" as const, label: "边框" },
        { key: "striped" as const, label: "斑马纹" },
        { key: "headerBackground" as const, label: "表头背景" },
      ].map((option) => (
        <div
          key={option.key}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
            settings[option.key] ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Checkbox
            checked={settings[option.key]}
            onCheckedChange={() => onSettingsChange((current) => ({ ...current, [option.key]: !current[option.key] }))}
          />
          {t(option.label)}
        </div>
      ))}
    </div>
  );
}

export function DataTableToolbar({
  settings,
  onSettingsChange,
  columns = [],
  onRefresh,
  refreshing,
  enableRefresh = true,
  enableDensity = true,
  enableColumns = true,
  enableStyle = true,
}: DataTableToolbarProps) {
  const { t } = useAdminLayout();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [activePanel, setActivePanel] = useState<TablePanel>(null);

  useEffect(() => {
    if (!activePanel) return;

    function handlePointerDown(event: PointerEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) setActivePanel(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePanel(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePanel]);

  function togglePanel(panel: Exclude<TablePanel, null>) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  return (
    <div ref={toolbarRef} className="flex flex-wrap items-center gap-2">
      {enableRefresh ? (
        <ToolIconButton label={t("刷新")} onClick={() => onRefresh?.()}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
        </ToolIconButton>
      ) : null}
      {enableDensity ? (
        <div className="relative">
          <ToolIconButton active={activePanel === "density"} label={t("行高 / 密度设置")} onClick={() => togglePanel("density")}>
            <Rows3 className="h-4 w-4" aria-hidden="true" />
          </ToolIconButton>
          <ToolPopover open={activePanel === "density"}>
            <TableDensitySelector settings={settings} onSettingsChange={onSettingsChange} onClose={() => setActivePanel(null)} />
          </ToolPopover>
        </div>
      ) : null}
      {enableColumns && columns.length ? (
        <div className="relative">
          <ToolIconButton active={activePanel === "columns"} label={t("列显示设置")} onClick={() => togglePanel("columns")}>
            <Columns3 className="h-4 w-4" aria-hidden="true" />
          </ToolIconButton>
          <ToolPopover open={activePanel === "columns"} className="min-w-56">
            <ColumnVisibilityPopover settings={settings} onSettingsChange={onSettingsChange} columns={columns} />
          </ToolPopover>
        </div>
      ) : null}
      {enableStyle ? (
        <div className="relative">
          <ToolIconButton active={activePanel === "style"} label={t("表格样式设置")} onClick={() => togglePanel("style")}>
            <Settings className="h-4 w-4" aria-hidden="true" />
          </ToolIconButton>
          <ToolPopover open={activePanel === "style"} className="min-w-52">
            <TableStyleSettings settings={settings} onSettingsChange={onSettingsChange} />
          </ToolPopover>
        </div>
      ) : null}
    </div>
  );
}
