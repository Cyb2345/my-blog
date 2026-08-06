"use client";

import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";

import {
  translateAdminText,
  useAdminLayout,
} from "@/components/admin/AdminLayoutContext";

type AdminMotionPreset =
  | "dashboard"
  | "list"
  | "settings"
  | "editor"
  | "media"
  | "monitor";

const motionEase = [0.16, 1, 0.3, 1] as const;

const pageMotionPresets = {
  dashboard: {
    initial: { opacity: 0, y: 6, scale: 0.995 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "tween", duration: 0.22, ease: motionEase },
  },
  list: {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "tween", duration: 0.17, ease: motionEase },
  },
  settings: {
    initial: { opacity: 0, x: 6 },
    animate: { opacity: 1, x: 0 },
    transition: { type: "tween", duration: 0.18, ease: motionEase },
  },
  editor: {
    initial: { opacity: 0, scale: 0.99 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "tween", duration: 0.2, ease: motionEase },
  },
  media: {
    initial: { opacity: 0, y: 4, scale: 0.997 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "tween", duration: 0.19, ease: motionEase },
  },
  monitor: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: "tween", duration: 0.2, ease: "easeOut" },
  },
} as const;

const settingsMotionRoutes = new Set([
  "/admin/settings",
  "/admin/files/config",
  "/admin/system/params",
  "/admin/site/config",
  "/admin/site/home",
  "/admin/site/login",
  "/admin/site/navigation",
  "/admin/site/about",
]);

function resolveAdminMotionPreset(pathname: string): AdminMotionPreset {
  if (pathname === "/admin" || pathname === "/admin/dashboard") {
    return "dashboard";
  }
  if (/^\/admin\/posts\/(new|[^/]+\/edit)$/.test(pathname)) {
    return "editor";
  }
  if (
    pathname === "/admin/media" ||
    pathname.endsWith("/files/list")
  ) {
    return "media";
  }
  if (pathname.includes("/monitor/")) return "monitor";
  if (settingsMotionRoutes.has(pathname)) return "settings";
  return "list";
}

export function AdminPageTransition({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey: string;
}) {
  const { locale } = useAdminLayout();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const presetName = resolveAdminMotionPreset(transitionKey);
  const preset = pageMotionPresets[presetName];
  const textRecords = useRef(
    new WeakMap<Text, { original: string; rendered: string }>(),
  );
  const attributeRecords = useRef(
    new WeakMap<Element, Map<string, { original: string; rendered: string }>>(),
  );

  useEffect(() => {
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
    observe();

    return () => {
      observer.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [locale, transitionKey]);

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        key={transitionKey}
        ref={rootRef}
        initial={reduceMotion ? false : preset.initial}
        animate={preset.animate}
        transition={reduceMotion ? { duration: 0 } : preset.transition}
        data-motion-preset={presetName}
        className="admin-page-transition admin-page-content min-w-0"
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
