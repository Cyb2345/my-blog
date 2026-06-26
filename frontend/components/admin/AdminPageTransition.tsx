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
  const textRecords = useRef(new WeakMap<Text, { original: string; rendered: string }>());
  const attributeRecords = useRef(new WeakMap<Element, Map<string, { original: string; rendered: string }>>());
  const [animating, setAnimating] = useState(() => pageTransition !== "none");

  useEffect(() => {
    if (pageTransition === "none") setAnimating(false);
  }, [pageTransition]);

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
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target) setAnimating(false);
      }}
      className={cn(
        "admin-page-transition min-w-0",
        animating && "admin-page-transition--entering",
        `admin-page-transition--${pageTransition}`,
      )}
    >
      {children}
    </div>
  );
}
