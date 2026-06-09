"use client";

import hljs from "highlight.js";
import { Check, Copy } from "lucide-react";
import { createElement, isValidElement, type ReactNode, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { headingId } from "@/lib/markdown";

type MarkdownNode = {
  position?: {
    start?: {
      line?: number;
    };
  };
};

function getPlainText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(getPlainText).join("");
  if (isValidElement(value)) {
    const props = value.props as { children?: ReactNode };
    return getPlainText(props.children);
  }
  return "";
}

function CodePanel({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  let className = "";
  let rawCode = "";

  if (isValidElement(children)) {
    const props = children.props as { className?: string; children?: ReactNode };
    className = props.className ?? "";
    rawCode = getPlainText(props.children);
  } else {
    rawCode = getPlainText(children);
  }

  const code = rawCode.replace(/\n$/, "");
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? "text";
  const highlighted =
    language !== "text" && hljs.getLanguage(language)
      ? hljs.highlight(code, { language }).value
      : hljs.highlightAuto(code).value;
  const lines = highlighted.split("\n");

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <figure className="code-panel">
      <figcaption className="code-panel__bar">
        <span>{language}</span>
        <button type="button" onClick={copyCode} className="code-panel__copy">
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "已复制" : "复制"}
        </button>
      </figcaption>
      <pre className="code-panel__pre">
        <code>
          {lines.map((line, index) => (
            <span className="code-panel__line" key={`${index}-${line}`}>
              <span className="code-panel__number">{index + 1}</span>
              <span
                className="code-panel__content"
                dangerouslySetInnerHTML={{ __html: line || " " }}
              />
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  return function Heading({
    children,
    className,
    node,
    ...props
  }: JSX.IntrinsicElements["h2"] & { children?: ReactNode; node?: MarkdownNode }) {
    const text = getPlainText(children);
    const id = headingId(text, node?.position?.start?.line);

    return createElement(
      `h${level}`,
      {
        ...props,
        id,
        className: ["markdown-heading group scroll-mt-24", className].filter(Boolean).join(" "),
      },
      createElement(
        "a",
        {
          href: `#${id}`,
          className: "markdown-heading__anchor",
          "aria-label": `定位到 ${text}`,
        },
        "#",
      ),
      children,
    );
  };
}

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="reading">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: createHeading(1),
          h2: createHeading(2),
          h3: createHeading(3),
          h4: createHeading(4),
          h5: createHeading(5),
          h6: createHeading(6),
          pre({ children }) {
            return <CodePanel>{children}</CodePanel>;
          },
          code({ className, children }) {
            return <code className={className}>{children}</code>;
          },
          a({ children, href }) {
            return (
              <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {children}
              </a>
            );
          },
        } satisfies Components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
