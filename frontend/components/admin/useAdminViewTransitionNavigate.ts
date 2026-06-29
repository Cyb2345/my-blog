"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import type { AdminPageTransition } from "@/components/admin/AdminLayoutContext";

type ViewTransition = {
  finished: Promise<void>;
  ready: Promise<void>;
  skipTransition: () => void;
  updateCallbackDone: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    callback: () => void | Promise<void>,
  ) => ViewTransition;
};

const pageTransitionValues = new Set<AdminPageTransition>([
  "none",
  "fade",
  "slide-right",
  "slide-up",
  "slide-down",
  "zoom",
]);

function getStoredPageTransition(): AdminPageTransition {
  if (typeof window === "undefined") return "fade";

  const stored = window.localStorage.getItem("admin_page_transition");
  if (pageTransitionValues.has(stored as AdminPageTransition))
    return stored as AdminPageTransition;

  const root = document.documentElement;
  const datasetValue =
    root.dataset.pageTransition ?? root.dataset.adminTransition;
  if (pageTransitionValues.has(datasetValue as AdminPageTransition))
    return datasetValue as AdminPageTransition;

  return "fade";
}

function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );
}

export function useAdminViewTransitionNavigate() {
  const router = useRouter();

  return useCallback(
    (to: string) => {
      if (!to) return;

      const transitionMode = getStoredPageTransition();
      const transitionDocument = document as ViewTransitionDocument;

      if (
        transitionMode === "none" ||
        prefersReducedMotion() ||
        !transitionDocument.startViewTransition
      ) {
        router.push(to);
        return;
      }

      const root = document.documentElement;
      root.classList.add("admin-view-transitioning");
      root.dataset.pageTransition = transitionMode;

      try {
        const transition = transitionDocument.startViewTransition(() => {
          router.push(to);
        });
        void transition.finished.finally(() => {
          root.classList.remove("admin-view-transitioning");
        });
      } catch {
        root.classList.remove("admin-view-transitioning");
        router.push(to);
      }
    },
    [router],
  );
}
