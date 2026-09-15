"use client";

import { useId } from "react";

export type TrendPoint = { time: number; values: Array<number | null> };

/** A bounded, time-scaled plot. Missing samples remain gaps, never fake zeros. */
export function TrendChart({ points, labels, percent = false, compact = false }: {
  points: TrendPoint[]; labels: string[]; percent?: boolean; compact?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const width = 600, height = compact ? 90 : 210;
  const end = points.at(-1)?.time ?? 0;
  const start = end - 300_000;
  const max = percent ? 100 : Math.max(1, ...points.flatMap(p => p.values.filter((v): v is number => v !== null && Number.isFinite(v)))) * 1.15;
  const x = (time: number) => Math.max(0, Math.min(width, (time - start) / 300_000 * width));
  const y = (value: number) => height - 4 - Math.min(max, Math.max(0, value)) / max * (height - 8);
  const colors = ["var(--admin-primary)", "var(--color-text-muted)"];
  return <div className="relative min-w-0">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={compact ? "h-16 w-full" : "h-44 w-full"} role="img" aria-label={`${labels.join("、")}，最近五分钟趋势，已采集 ${points.length} 个样本`}>
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
    </svg>
    {!compact && <div className="flex justify-between text-xs text-muted-foreground"><span>5 分钟前</span><span>{points.filter(p => p.values.some(v => v != null)).length < 2 ? "暂无足够历史样本" : "最新采样"}</span></div>}
  </div>;
}
