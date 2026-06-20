"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";

type ViewTransition = {
  finished: Promise<void>;
  ready: Promise<void>;
  skipTransition: () => void;
  updateCallbackDone: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
};

type ThemeAnimationOptions = KeyframeAnimationOptions & {
  pseudoElement?: string;
};

const THEME_STORAGE_KEY = "personal-blog-theme";
const THEME_TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
const THEME_TRANSITION_MS = 1200;

function applyTheme(nextTheme: ThemeMode, setTheme: (theme: string) => void) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(nextTheme);
  root.style.colorScheme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  setTheme(nextTheme);
}

function createFallbackMask(nextTheme: ThemeMode, x: number, y: number) {
  const mask = document.createElement("div");
  mask.className = `theme-transition-mask theme-transition-mask--${nextTheme}`;
  mask.style.setProperty("--x", `${x}px`);
  mask.style.setProperty("--y", `${y}px`);
  document.body.appendChild(mask);
  window.requestAnimationFrame(() => mask.classList.add("active"));
  return mask;
}

function getThemeTransitionOrigin(nextTheme: ThemeMode) {
  return nextTheme === "light"
    ? { x: window.innerWidth, y: 0 }
    : { x: 0, y: window.innerHeight };
}

export function ThemeToggle({ compact = false, hero = false }: { compact?: boolean; hero?: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitioningRef = useRef(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "切换到白天模式" : "切换到黑夜模式";

  async function toggleThemeWithTransition() {
    if (!mounted || transitioningRef.current) return;

    const currentTheme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    const { x, y } = getThemeTransitionOrigin(nextTheme);
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const finishTransition = () => {
      root.classList.remove("theme-transitioning");
      transitioningRef.current = false;
      setTransitioning(false);
    };

    transitioningRef.current = true;
    setTransitioning(true);
    root.classList.add("theme-transitioning");

    if (reducedMotion) {
      applyTheme(nextTheme, setTheme);
      window.setTimeout(finishTransition, 80);
      return;
    }

    const transitionDocument = document as ViewTransitionDocument;
    if (!transitionDocument.startViewTransition) {
      const mask = createFallbackMask(nextTheme, x, y);
      window.setTimeout(() => applyTheme(nextTheme, setTheme), THEME_TRANSITION_MS * 0.42);
      window.setTimeout(() => {
        mask.remove();
        finishTransition();
      }, THEME_TRANSITION_MS + 80);
      return;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const transition = transitionDocument.startViewTransition(() => applyTheme(nextTheme, setTheme));

    try {
      await transition.ready;
      const animation = document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: THEME_TRANSITION_MS,
          easing: THEME_TRANSITION_EASING,
          pseudoElement: "::view-transition-new(root)",
        } as ThemeAnimationOptions,
      );
      await animation.finished;
      await transition.finished;
    } finally {
      finishTransition();
    }
  }

  return (
    <div className="theme-toggle">
      <button
        type="button"
        className={cn(
          "interactive grid h-10 w-10 place-items-center rounded-md bg-white/80 text-ink shadow-sm ring-1 ring-ink/10 hover:text-ocean disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 dark:bg-[var(--surface-soft)] dark:text-[var(--text)] dark:ring-[var(--border-soft)] dark:hover:text-[color-mix(in_srgb,var(--primary)_78%,white)]",
          hero && "bg-white/10 text-white ring-white/20 hover:bg-white/20 hover:text-white dark:bg-white/10 dark:text-white dark:ring-white/20 dark:hover:text-white",
          !compact && "md:h-10 md:w-10",
        )}
        onClick={toggleThemeWithTransition}
        disabled={!mounted || transitioning}
        aria-label={label}
        title={label}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
