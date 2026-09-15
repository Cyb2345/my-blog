import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "primary" | "success";

const accentClass = {
  primary: "bg-accent text-accent-foreground",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]",
};

export function MonitorIcon({
  icon,
  accent = "primary",
}: {
  icon: ReactNode;
  accent?: Accent;
}) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
        accentClass[accent],
      )}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
}

export function MonitorCard({
  compact = false,
  title,
  icon,
  accent = "primary",
  children,
}: {
  compact?: boolean;
  title: string;
  icon: ReactNode;
  accent?: Accent;
  children: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className={cn("flex items-center gap-3", compact && "border-b-0 pb-0")}>
        <MonitorIcon icon={icon} accent={accent} />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MetricItem({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
}) {
  return (
    <dl className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-[var(--color-surface-muted)] px-3 py-2">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {icon ? <MonitorIcon icon={icon} accent={accent} /> : null}
        {label}
      </dt>
      <dd className="min-w-0 break-all text-right text-sm font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </dl>
  );
}
