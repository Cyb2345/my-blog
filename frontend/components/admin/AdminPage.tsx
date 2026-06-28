import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminPage({ title, description, actions, children, className }: AdminPageProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {title || description || actions ? (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title ? <h1 className="text-2xl font-black text-foreground">{title}</h1> : null}
            {description ? <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
