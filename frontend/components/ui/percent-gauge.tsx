import { cn } from "@/lib/utils";

const arc = "M 43.43 156.57 A 80 80 0 1 1 156.57 156.57";

export function PercentGauge({
  value,
  label,
  tone = "success",
}: {
  value: number;
  label: string;
  tone?: "success" | "warning" | "danger";
}) {
  const valid = Number.isFinite(value);
  const percent = valid ? Math.min(100, Math.max(0, value)) : 0;
  const text = valid ? `${percent.toFixed(1)}%` : "暂无数据";

  return (
    <div
      className="relative mx-auto h-44 w-48 shrink-0"
      role={valid ? "meter" : "img"}
      aria-label={valid ? label : `${label}：暂无数据`}
      aria-valuemin={valid ? 0 : undefined}
      aria-valuemax={valid ? 100 : undefined}
      aria-valuenow={valid ? percent : undefined}
      aria-valuetext={valid ? text : undefined}
    >
      <svg
        viewBox="0 0 200 180"
        className="h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        <path
          d={arc}
          stroke="var(--border)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={arc}
          pathLength="100"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="100 100"
          strokeDashoffset={100 - percent}
          visibility={percent > 0 ? "visible" : "hidden"}
          className={cn(
            "percent-gauge-arc",
            tone === "success" && "text-[var(--color-success)]",
            tone === "warning" && "text-[var(--color-warning)]",
            tone === "danger" && "text-destructive",
          )}
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 pt-4"
        aria-hidden="true"
      >
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {text}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
