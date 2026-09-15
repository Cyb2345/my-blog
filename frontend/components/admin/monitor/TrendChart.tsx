"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

export type TrendPoint = { time: number; values: Array<number | null> };

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function smoothPath(coords: Array<[number, number]>) {
  if (coords.length < 2) return coords.map(([x, y]) => `M${x},${y}`).join(" ");
  const commands = [`M${coords[0][0]},${coords[0][1]}`];
  for (let index = 0; index < coords.length - 1; index += 1) {
    const previous = coords[index - 1] ?? coords[index];
    const current = coords[index];
    const next = coords[index + 1];
    const following = coords[index + 2] ?? next;
    const minY = Math.min(current[1], next[1]);
    const maxY = Math.max(current[1], next[1]);
    const controlOneX = current[0] + (next[0] - previous[0]) / 6;
    const controlOneY = Math.max(minY, Math.min(maxY, current[1] + (next[1] - previous[1]) / 6));
    const controlTwoX = next[0] - (following[0] - current[0]) / 6;
    const controlTwoY = Math.max(minY, Math.min(maxY, next[1] - (following[1] - current[1]) / 6));
    commands.push(`C${controlOneX},${controlOneY} ${controlTwoX},${controlTwoY} ${next[0]},${next[1]}`);
  }
  return commands.join(" ");
}

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
  const [activePosition, setActivePosition] = useState({ left: 50, top: 50 });
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
  const horizontalTransform = activePosition.left < 18 ? "0" : activePosition.left > 82 ? "-100%" : "-50%";
  const verticalTransform = activePosition.top < 35 ? "0" : activePosition.top > 65 ? "-100%" : "-50%";
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
    const horizontalRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const verticalRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    setActivePosition({ left: horizontalRatio * 100, top: verticalRatio * 100 });
    selectNearest(start + horizontalRatio * 300_000);
  };
  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !selectablePoints.length) return;
    event.preventDefault();
    const currentPosition = selectablePoints.findIndex(({ index }) => index === activeIndex);
    const activate = (index: number) => {
      const point = points[index];
      const firstValue = point.values.find((value): value is number => value !== null && Number.isFinite(value));
      setActiveIndex(index);
      setActivePosition({ left: x(point.time) / width * 100, top: firstValue === undefined ? 50 : y(firstValue) / height * 100 });
    };
    if (event.key === "Home") return activate(selectablePoints[0].index);
    if (event.key === "End") return activate(selectablePoints.at(-1)!.index);
    const nextPosition = event.key === "ArrowLeft"
      ? Math.max(0, currentPosition < 0 ? selectablePoints.length - 1 : currentPosition - 1)
      : Math.min(selectablePoints.length - 1, currentPosition < 0 ? 0 : currentPosition + 1);
    activate(selectablePoints[nextPosition].index);
  };

  return <div className="relative min-w-0">
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`${compact ? "h-16" : "h-44"} w-full cursor-crosshair rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)]`}
      role="img"
      tabIndex={selectablePoints.length ? 0 : -1}
      aria-label={`${labels.join("、")}，最近五分钟趋势，已采集 ${selectablePoints.length} 个有效样本；鼠标悬停或使用左右方向键查看采样详情`}
      aria-describedby={activePoint ? `${id}-tooltip` : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => {
        const latest = selectablePoints.at(-1);
        if (!latest) return;
        const firstValue = latest.point.values.find((value): value is number => value !== null && Number.isFinite(value));
        setActiveIndex(current => current ?? latest.index);
        setActivePosition({ left: x(latest.point.time) / width * 100, top: firstValue === undefined ? 50 : y(firstValue) / height * 100 });
      }}
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
            const line = smoothPath(coords);
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
      className="pointer-events-none absolute z-10 min-w-32 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-popover)]"
      style={{ left: `${activePosition.left}%`, top: `${activePosition.top}%`, transform: `translate(${horizontalTransform}, ${verticalTransform})` }}
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
