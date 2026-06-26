"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  type AdminPageTransition as AdminPageTransitionMode,
  translateAdminText,
  useAdminLayout,
} from "@/components/admin/AdminLayoutContext";
import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const sync = () => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return prefersReducedMotion;
}

export function AdminPageTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  const { locale, settings } = useAdminLayout();
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageTransition: AdminPageTransitionMode = prefersReducedMotion ? "none" : settings.pageTransition;
  const rootRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef<HTMLDivElement>(null);
  const exitLayerRef = useRef<HTMLDivElement>(null);
  const zoomSwitchingTimer = useRef<number | null>(null);
  const textRecords = useRef(new WeakMap<Text, { original: string; rendered: string }>());
  const attributeRecords = useRef(new WeakMap<Element, Map<string, { original: string; rendered: string }>>());
  const [animationState, setAnimationState] = useState(() => ({
    animating: pageTransition !== "none",
    key: transitionKey,
  }));

  const routeChanged = animationState.key !== transitionKey;
  const animating = pageTransition !== "none" && (routeChanged || animationState.animating);

  useEffect(() => {
    setAnimationState((current) => {
      if (current.key === transitionKey) {
        if (pageTransition === "none" && current.animating) return { ...current, animating: false };
        return current;
      }
      return { animating: pageTransition !== "none", key: transitionKey };
    });
  }, [pageTransition, transitionKey]);

  useEffect(() => {
    if (pageTransition !== "none") return;
    if (zoomSwitchingTimer.current) {
      window.clearTimeout(zoomSwitchingTimer.current);
      zoomSwitchingTimer.current = null;
    }
    exitLayerRef.current?.replaceChildren();
  }, [pageTransition]);

  useEffect(() => () => {
    if (zoomSwitchingTimer.current) window.clearTimeout(zoomSwitchingTimer.current);
  }, []);

  useEffect(() => {
    function captureZoomExitSnapshot() {
      if (pageTransition !== "zoom" || prefersReducedMotion) return;
      const source = currentPageRef.current;
      const exitLayer = exitLayerRef.current;
      if (!source || !exitLayer) return;

      const snapshot = source.cloneNode(true) as HTMLElement;
      snapshot.className = "admin-page-transition__snapshot";
      snapshot.setAttribute("aria-hidden", "true");
      snapshot.setAttribute("inert", "");
      snapshot.addEventListener("animationend", () => snapshot.remove(), { once: true });

      if (zoomSwitchingTimer.current) window.clearTimeout(zoomSwitchingTimer.current);
      exitLayer.replaceChildren(snapshot);
      zoomSwitchingTimer.current = window.setTimeout(() => {
        exitLayer.replaceChildren();
        zoomSwitchingTimer.current = null;
      }, 280);
    }

    window.addEventListener("admin:page-transition-capture", captureZoomExitSnapshot);
    return () => window.removeEventListener("admin:page-transition-capture", captureZoomExitSnapshot);
  }, [pageTransition, prefersReducedMotion]);

  useEffect(() => {
    const currentContainer = rootRef.current;
    if (!currentContainer) return;
    const container: HTMLDivElement = currentContainer;
    let applying = false;

    function translateTextNode(node: Text) {
      const current = node.nodeValue ?? "";
      const trimmed = current.trim();
      if (!trimmed) return;
      const existing = textRecords.current.get(node);
      const original = existing && (current === existing.rendered || current === existing.original)
        ? existing.original
        : trimmed;
      const translated = translateAdminText(original, locale);
      const rendered = current.replace(trimmed, translated);
      textRecords.current.set(node, { original, rendered });
      if (current !== rendered) node.nodeValue = rendered;
    }

    function translateAttributes(element: Element) {
      const attributes = ["placeholder", "title", "aria-label"];
      const records = attributeRecords.current.get(element) ?? new Map();
      attributes.forEach((attribute) => {
        const current = element.getAttribute(attribute);
        if (!current) return;
        const existing = records.get(attribute);
        const original = existing && (current === existing.rendered || current === existing.original)
          ? existing.original
          : current;
        const rendered = translateAdminText(original, locale);
        records.set(attribute, { original, rendered });
        if (current !== rendered) element.setAttribute(attribute, rendered);
      });
      attributeRecords.current.set(element, records);
    }

    function applyTranslations() {
      if (applying) return;
      applying = true;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        translateTextNode(node as Text);
        node = walker.nextNode();
      }
      container.querySelectorAll("[placeholder], [title], [aria-label]").forEach(translateAttributes);
      applying = false;
    }

    applyTranslations();
    const observer = new MutationObserver(() => applyTranslations());
    observer.observe(container, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [locale, transitionKey]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "admin-page-transition min-w-0",
        `admin-page-transition--${pageTransition}`,
      )}
    >
      <div ref={exitLayerRef} className="admin-page-transition__exit-layer" aria-hidden="true" />
      <div
        key={transitionKey}
        ref={currentPageRef}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;
          setAnimationState((current) => current.key === transitionKey ? { ...current, animating: false } : current);
          if (zoomSwitchingTimer.current) {
            window.clearTimeout(zoomSwitchingTimer.current);
            zoomSwitchingTimer.current = null;
            exitLayerRef.current?.replaceChildren();
          }
        }}
        className={cn(
          "admin-page-transition__page min-w-0",
          animating && "admin-page-transition--entering",
          `admin-page-transition--${pageTransition}`,
        )}
      >
        {children}
      </div>
    </div>
  );
}
