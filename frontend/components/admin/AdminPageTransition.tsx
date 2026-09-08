"use client";


import { type ReactNode, useEffect, useRef } from "react";

import {
  translateAdminText,
  useAdminLayout,
} from "@/components/admin/AdminLayoutContext";

export function AdminPageTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  const { locale } = useAdminLayout();
  const rootRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(transitionKey);
  const translated = useRef(false);

  // Keep this DOM node stable: a route key here would remount the entire page
  // subtree in addition to the App Router's own segment lifecycle.
  useEffect(() => {
    if (previousPath.current === transitionKey) return;
    previousPath.current = transitionKey;
    const node = rootRef.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || media.matches || typeof node.animate !== "function") return;
    const style = getComputedStyle(node);
    const animation = node.animate([{ opacity: 0.94 }, { opacity: 1 }], {
      duration: parseFloat(style.getPropertyValue("--admin-motion-enter")) || 160,
      easing: style.getPropertyValue("--ease-out").trim() || "ease-out",
    });
    const stop = () => { if (media.matches) animation.cancel(); };
    media.addEventListener("change", stop);
    return () => {
      animation.cancel();
      media.removeEventListener("change", stop);
    };
  }, [transitionKey]);
  const textRecords = useRef(
    new WeakMap<Text, { original: string; rendered: string }>(),
  );
  const attributeRecords = useRef(
    new WeakMap<Element, Map<string, { original: string; rendered: string }>>(),
  );

  useEffect(() => {
    // Chinese source text needs no DOM traversal or mutation observer.
    if (locale === "zh-CN" && !translated.current) return;
    const currentContainer = rootRef.current;
    if (!currentContainer) return;
    const container: HTMLDivElement = currentContainer;
    const pendingNodes = new Set<Node>();
    const pendingAttributeElements = new Set<Element>();
    let animationFrame: number | null = null;

    function translateTextNode(node: Text) {
      const current = node.nodeValue ?? "";
      const trimmed = current.trim();
      if (!trimmed) return;
      const existing = textRecords.current.get(node);
      const original =
        existing &&
        (current === existing.rendered || current === existing.original)
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
        const original =
          existing &&
          (current === existing.rendered || current === existing.original)
            ? existing.original
            : current;
        const rendered = translateAdminText(original, locale);
        records.set(attribute, { original, rendered });
        if (current !== rendered) element.setAttribute(attribute, rendered);
      });
      attributeRecords.current.set(element, records);
    }

    function translateSubtree(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text);
        return;
      }

      if (root instanceof Element) {
        translateAttributes(root);
        root
          .querySelectorAll("[placeholder], [title], [aria-label]")
          .forEach(translateAttributes);
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        translateTextNode(node as Text);
        node = walker.nextNode();
      }
    }

    function observe() {
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "title", "aria-label"],
      });
    }

    function flushPendingTranslations() {
      animationFrame = null;
      observer.disconnect();

      pendingNodes.forEach((node) => {
        if (node === container || container.contains(node)) {
          translateSubtree(node);
        }
      });
      pendingAttributeElements.forEach((element) => {
        if (container.contains(element)) translateAttributes(element);
      });
      pendingNodes.clear();
      pendingAttributeElements.clear();

      observe();
    }

    function scheduleTranslationFlush() {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(flushPendingTranslations);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          pendingAttributeElements.add(mutation.target as Element);
          return;
        }
        if (mutation.type === "characterData") {
          pendingNodes.add(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => pendingNodes.add(node));
      });
      if (pendingNodes.size || pendingAttributeElements.size) {
        scheduleTranslationFlush();
      }
    });

    translateSubtree(container);
    translated.current = locale !== "zh-CN";
    if (translated.current) observe();

    return () => {
      observer.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [locale, transitionKey]);

  return (
    <div
      ref={rootRef}
      className="admin-page-transition admin-page-content min-w-0"
    >
      {children}
    </div>
  );
}
