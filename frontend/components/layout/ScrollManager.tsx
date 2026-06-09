"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

function ScrollManagerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (!window.location.hash) {
      scrollToTop();
    }
  }, []);

  useEffect(() => {
    if (window.location.hash) return;
    const frame = window.requestAnimationFrame(scrollToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  return null;
}

export function ScrollManager() {
  return (
    <Suspense fallback={null}>
      <ScrollManagerInner />
    </Suspense>
  );
}
