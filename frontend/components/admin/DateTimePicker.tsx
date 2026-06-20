"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
const hourOptions = Array.from({ length: 24 }, (_, index) => index);
const minuteOptions = Array.from({ length: 60 }, (_, index) => index);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function nowParts(): DateParts {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: 0,
  };
}

function parseValue(value: string): DateParts | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };
  const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  if (
    date.getFullYear() !== parts.year ||
    date.getMonth() !== parts.month - 1 ||
    date.getDate() !== parts.day
  ) {
    return null;
  }
  return parts;
}

function serialize(parts: DateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

function displayValue(value: string) {
  const parts = parseValue(value);
  if (!parts) return "";
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function moveMonth(year: number, month: number, offset: number) {
  const next = new Date(year, month - 1 + offset, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "请选择时间",
  disabled = false,
}: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = parseValue(value);
  const base = selected ?? nowParts();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(base.year);
  const [viewMonth, setViewMonth] = useState(base.month);

  useEffect(() => {
    if (!open) return;
    const next = parseValue(value) ?? nowParts();
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const firstWeekDay = new Date(viewYear, viewMonth - 1, 1).getDay();
    const totalDays = daysInMonth(viewYear, viewMonth);
    return [
      ...Array.from({ length: firstWeekDay }, () => null),
      ...Array.from({ length: totalDays }, (_, index) => index + 1),
    ];
  }, [viewMonth, viewYear]);

  function updateParts(next: Partial<DateParts>) {
    const current = selected ?? { ...nowParts(), year: viewYear, month: viewMonth, day: 1 };
    onChange(serialize({ ...current, ...next }));
  }

  function updateMonth(offset: number) {
    const next = moveMonth(viewYear, viewMonth, offset);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function selectToday() {
    const next = nowParts();
    setViewYear(next.year);
    setViewMonth(next.month);
    onChange(serialize(next));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-left text-sm font-bold text-ink outline-none transition-colors duration-150",
          "hover:border-ocean/40 focus-visible:border-ocean focus-visible:ring-2 focus-visible:ring-ocean/20",
          "disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-sky-300/40",
          !value && "text-ink/45 dark:text-slate-500",
        )}
      >
        <span className="truncate">{displayValue(value) || placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-ink/45 dark:text-slate-400" aria-hidden="true" />
      </button>

      <div
        className={cn(
          "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] origin-top-left rounded-lg border border-ink/10 bg-white p-3 shadow-xl transition-all duration-200 motion-reduce:transition-none dark:border-white/10 dark:bg-slate-900",
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => updateMonth(-1)}
            className="interactive grid h-9 w-9 place-items-center rounded-md bg-paper text-ink/65 hover:text-ink dark:bg-white/10 dark:text-slate-300"
            aria-label="上个月"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="text-sm font-black text-ink dark:text-slate-100">
            {viewYear} 年 {viewMonth} 月
          </div>
          <button
            type="button"
            onClick={() => updateMonth(1)}
            className="interactive grid h-9 w-9 place-items-center rounded-md bg-paper text-ink/65 hover:text-ink dark:bg-white/10 dark:text-slate-300"
            aria-label="下个月"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-ink/45 dark:text-slate-500">
          {weekDays.map((item) => (
            <span key={item} className="py-1">{item}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const active = Boolean(selected && selected.year === viewYear && selected.month === viewMonth && selected.day === day);
            return day ? (
              <button
                key={day}
                type="button"
                onClick={() => updateParts({ year: viewYear, month: viewMonth, day })}
                className={cn(
                  "interactive h-9 rounded-md text-sm font-black transition-colors duration-150",
                  active
                    ? "bg-ocean text-white dark:bg-sky-400 dark:text-slate-950"
                    : "bg-paper/60 text-ink/70 hover:bg-ocean/10 hover:text-ocean dark:bg-white/5 dark:text-slate-300 dark:hover:bg-sky-400/10 dark:hover:text-sky-200",
                )}
              >
                {day}
              </button>
            ) : (
              <span key={`blank-${index}`} className="h-9" />
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 rounded-md bg-paper p-3 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs font-black text-ink/50 dark:text-slate-500">
            <Clock className="h-4 w-4" aria-hidden="true" />
            时间
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["hour", "时", hourOptions],
              ["minute", "分", minuteOptions],
              ["second", "秒", minuteOptions],
            ].map(([key, label, options]) => (
              <label key={key as string} className="grid gap-1 text-xs font-bold text-ink/50 dark:text-slate-400">
                {label as string}
                <select
                  value={(selected ?? base)[key as keyof Pick<DateParts, "hour" | "minute" | "second">]}
                  onChange={(event) => updateParts({ [key as string]: Number(event.target.value) } as Partial<DateParts>)}
                  className="h-9 rounded-md border border-ink/10 bg-white px-2 text-sm font-bold text-ink outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                >
                  {(options as number[]).map((option) => (
                    <option key={option} value={option}>{pad(option)}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={selectToday}
            className="interactive min-h-9 rounded-md bg-paper px-3 text-sm font-black text-ink/65 hover:text-ink dark:bg-white/10 dark:text-slate-300"
          >
            此刻
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange("")}
              className="interactive inline-flex min-h-9 items-center gap-1 rounded-md bg-paper px-3 text-sm font-black text-ink/55 hover:text-ink dark:bg-white/10 dark:text-slate-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              清空
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="interactive min-h-9 rounded-md bg-ocean px-3 text-sm font-black text-white dark:bg-sky-400 dark:text-slate-950"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
