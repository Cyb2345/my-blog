"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

export type TrendPoint = { time: number; values: Array<number | null> };

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** A bounded, time-scaled plot. Missing samples remain gaps, never fake zeros. */
export function TrendChart({ points, labels, percent = false, compact = false, formatValue }: {
  points: TrendPoint[];
  labels: string[];
  percent?: boolean;
  compact?: boolean;
  formatValue?: (value: number | null, seriesIndex: number) => string;
}) {
  const id = useId().replace(/:/g, "");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 600, height = compact ? 90 : 210;
  const end = points.at(-1)?.time ?? 0;
  const start = end - 300_000;
  const max = percent ? 100 : Math.max(1, ...points.flatMap(p => p.values.filter((v): v is number => v !== null && Number.isFinite(v)))) * 1.15;
  const x = (time: number) => Math.max(0, Math.min(width, (time - start) / 300_000 * width));
  const y = (value: number) => height - 4 - Math.min(max, Math.max(0, value)) / max * (height - 8);
  const colors = ["var(--admin-primary)", "var(--color-text-muted)"];
  const selectablePoints = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.values.some(value => value !== null && Number.isFinite(value)));
  const activePoint = activeIndex === null ? null : points[activeIndex] ?? null;
  const activeLeft = activePoint ? x(activePoint.time) / width * 100 : 0;
  const tooltipTransform = activeLeft < 18 ? "translateX(0)" : activeLeft > 82 ? "translateX(-100%)" : "translateX(-50%)";
  const valueText = (value: number | null, seriesIndex: number) => {
    if (formatValue) return formatValue(value, seriesIndex);
    if (value === null || !Number.isFinite(value)) return "—";
    return percent ? `${value.toFixed(1)}%` : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  };
  const selectNearest = (targetTime: number) => {
    if (!selectablePoints.length) return;
    const nearest = selectablePoints.reduce((best, candidate) =>
      Math.abs(candidate.point.time - targetTime) < Math.abs(best.point.time - targetTime) ? candidate : best,
    );
    setActiveIndex(nearest.index);
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    selectNearest(start + ratio * 300_000);
  };
  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !selectablePoints.length) return;
    event.preventDefault();
    const currentPosition = selectablePoints.findIndex(({ index }) => index === activeIndex);
    if (event.key === "Home") return setActiveIndex(selectablePoints[0].index);
    if (event.key === "End") return setActiveIndex(selectablePoints.at(-1)!.index);
    const nextPosition = event.key === "ArrowLeft"
      ? Math.max(0, currentPosition < 0 ? selectablePoints.length - 1 : currentPosition - 1)
      : Math.min(selectablePoints.length - 1, currentPosition < 0 ? 0 : currentPosition + 1);
    setActiveIndex(selectablePoints[nextPosition].index);
  };

  return <div className="relative min-w-0">
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`${compact ? "h-16" : "h-44"} w-full rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)]`}
      role="img"
      tabIndex={selectablePoints.length ? 0 : -1}
      aria-label={`${labels.join("、")}，最近五分钟趋势，已采集 ${selectablePoints.length} 个有效样本；鼠标悬停或使用左右方向键查看采样详情`}
      aria-describedby={activePoint ? `${id}-tooltip` : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex(current => current ?? selectablePoints.at(-1)?.index ?? null)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={handleKeyDown}
    >
      {(compact ? [] : [0.25, 0.5, 0.75]).map(r => <line key={r} x1="0" x2={width} y1={height*r} y2={height*r} stroke="var(--color-border)" strokeDasharray="3 5" />)}
      {labels.map((label, index) => {
        const segments: Array<Array<[number, number]>> = [];
        let segment: Array<[number, number]> = [];
        points.forEach((point, i) => {
          const value = point.values[index];
          if (value == null || !Number.isFinite(value) || (i > 0 && point.time - points[i-1].time > 45_000)) {
            if (segment.length) segments.push(segment);
            segment = [];
          }
          if (value != null && Number.isFinite(value)) segment.push([x(point.time), y(value)]);
        });
        if (segment.length) segments.push(segment);
        return <g key={label}>
          <defs><linearGradient id={`${id}-${index}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={colors[index % 2]} stopOpacity="0.24"/><stop offset="1" stopColor={colors[index % 2]} stopOpacity="0.02"/></linearGradient></defs>
          {segments.map((coords, i) => {
            const line = coords.map(([a,b], j) => `${j ? "L" : "M"}${a},${b}`).join(" ");
            return <g key={i}><path d={`${line} L${coords.at(-1)![0]},${height} L${coords[0][0]},${height} Z`} fill={`url(#${id}-${index})`} />
              <path d={line} fill="none" stroke={colors[index % 2]} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle cx={coords.at(-1)![0]} cy={coords.at(-1)![1]} r="2" fill={colors[index % 2]} />
            </g>;
          })}
        </g>;
      })}
      {activePoint && <g aria-hidden="true">
        <line x1={x(activePoint.time)} x2={x(activePoint.time)} y1="0" y2={height} stroke="var(--color-border-strong)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        {activePoint.values.map((value, index) => value !== null && Number.isFinite(value) ? <circle
          key={labels[index] ?? index}
          cx={x(activePoint.time)}
          cy={y(value)}
          r="4"
          fill={colors[index % colors.length]}
          stroke="var(--color-surface)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        /> : null)}
      </g>}
    </svg>
    {activePoint && <div
      id={`${id}-tooltip`}
      role="tooltip"
      className={`pointer-events-none absolute z-10 min-w-32 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-popover)] ${compact ? "top-0" : "top-3"}`}
      style={{ left: `${activeLeft}%`, transform: tooltipTransform }}
    >
      <time className="mb-1 block font-medium text-muted-foreground">{timeFormatter.format(activePoint.time)}</time>
      <div className="grid gap-1">
        {labels.map((label, index) => <div key={label} className="flex items-center justify-between gap-4 whitespace-nowrap">
          <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{label}</span>
          <strong className="tabular-nums">{valueText(activePoint.values[index] ?? null, index)}</strong>
        </div>)}
      </div>
    </div>}
    {!compact && <div className="flex justify-between text-xs text-muted-foreground"><span>5 分钟前</span><span>{selectablePoints.length < 2 ? "暂无足够历史样本" : "最新采样"}</span></div>}
  </div>;
}
