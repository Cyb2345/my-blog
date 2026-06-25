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
    <div
      className={cn(
        "absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-44 origin-top-right rounded-lg border border-ink/10 bg-white p-2 shadow-xl transition-all duration-200 motion-reduce:transition-none dark:border-[var(--border-soft)] dark:bg-[var(--surface-card)]",
        open ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100" : "invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        className,
      )}
      aria-hidden={!open}
    >
      {children}
    </div>
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "interactive grid h-10 w-10 place-items-center rounded-md transition-all duration-200",
        active
          ? "bg-ocean text-white dark:bg-[var(--primary)] dark:text-white"
          : "bg-paper text-ink/55 hover:text-ink dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)] dark:hover:text-[var(--text)]",
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
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
            "flex min-h-10 w-full items-center justify-between rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-paper dark:hover:bg-white/10",
            settings.density === option.value ? "bg-ocean/10 text-ocean dark:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]" : "text-ink/65 dark:text-[var(--text-secondary)]",
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
          <label
            key={column.key}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-paper dark:hover:bg-white/10",
              checked ? "text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]" : "text-ink/60 dark:text-[var(--text-muted)]",
              column.locked && "opacity-80",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={column.locked}
              onChange={() => {
                if (column.locked) return;
                onSettingsChange((current) => {
                  const visible = new Set(current.visibleColumns);
                  if (visible.has(column.key)) visible.delete(column.key);
                  else visible.add(column.key);
                  return { ...current, visibleColumns: Array.from(visible) };
                });
              }}
              className="h-4 w-4 accent-blue-500"
            />
            {t(column.label)}
          </label>
        );
      })}
      <button
        type="button"
        onClick={() => onSettingsChange((current) => ({ ...current, visibleColumns: columns.map((column) => column.key) }))}
        className="mt-1 min-h-9 rounded-md bg-paper px-3 text-sm font-black text-ink/65 transition-colors duration-150 hover:text-ink dark:bg-[var(--surface-soft)] dark:text-[var(--text-secondary)]"
      >
        {t("恢复默认列")}
      </button>
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
        <label
          key={option.key}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-black transition-colors duration-150 hover:bg-paper dark:hover:bg-white/10",
            settings[option.key] ? "text-ocean dark:text-[color-mix(in_srgb,var(--primary)_78%,white)]" : "text-ink/60 dark:text-[var(--text-muted)]",
          )}
        >
          <input
            type="checkbox"
            checked={settings[option.key]}
            onChange={() => onSettingsChange((current) => ({ ...current, [option.key]: !current[option.key] }))}
            className="h-4 w-4 accent-blue-500"
          />
          {t(option.label)}
        </label>
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
