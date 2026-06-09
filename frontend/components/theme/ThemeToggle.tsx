"use client";

import { Check, Laptop, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  icon: LucideIcon;
};

const options: ThemeOption[] = [
  { value: "light", label: "白天模式", icon: Sun },
  { value: "dark", label: "黑夜模式", icon: Moon },
  { value: "system", label: "跟随系统", icon: Laptop },
];

export function ThemeToggle({ compact = false, hero = false }: { compact?: boolean; hero?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const currentTheme = (theme ?? "system") as ThemeOption["value"];
  const CurrentIcon = !mounted ? Laptop : resolvedTheme === "dark" ? Moon : resolvedTheme === "light" ? Sun : Laptop;

  return (
    <div className="theme-toggle" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "interactive grid h-10 w-10 place-items-center rounded-md bg-white/80 text-ink shadow-sm ring-1 ring-ink/10 hover:text-ocean dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:text-sky-300",
          hero && "bg-white/10 text-white ring-white/20 hover:bg-white/20 hover:text-white dark:bg-white/10 dark:text-white dark:ring-white/20 dark:hover:text-white",
          !compact && "md:h-10 md:w-10",
        )}
        onClick={() => setOpen((value) => !value)}
        aria-label="切换主题模式"
        aria-expanded={open}
        title="切换主题模式"
      >
        <CurrentIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div className="theme-menu motion-surface" role="menu">
          {options.map((option) => {
            const Icon = option.icon;
            const active = mounted && currentTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cn("theme-menu__item", active && "theme-menu__item--active")}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{option.label}</span>
                {active ? <Check className="ml-auto h-4 w-4" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
