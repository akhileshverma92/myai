"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize from "rehype-sanitize"
import { cn } from "@/lib/utils"

type MarkdownContentProps = {
  content: string
  className?: string
  /** Compact mode for compare cards */
  compact?: boolean
}

export function MarkdownContent({ content, className, compact = false }: MarkdownContentProps) {
  const text = content?.trim() ? content : ""

  return (
    <div
      className={cn(
        "aura-markdown break-words text-[15px] leading-7 text-[var(--aura-fg)]",
        compact && "text-sm leading-6",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => (
            <h1 className={cn("font-semibold tracking-tight", compact ? "mb-2 mt-3 text-lg" : "mb-3 mt-5 text-xl first:mt-0")}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn("font-semibold tracking-tight", compact ? "mb-2 mt-3 text-base" : "mb-2.5 mt-4 text-lg first:mt-0")}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn("font-semibold tracking-tight", compact ? "mb-1.5 mt-2.5 text-sm" : "mb-2 mt-3.5 text-base first:mt-0")}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0 marker:text-[var(--aura-muted)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0 marker:text-[var(--aura-muted)]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-[var(--aura-fg)]">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:decoration-sky-600 dark:text-sky-400"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[var(--aura-border)] pl-3 text-[var(--aura-muted)] italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-[var(--aura-border)]" />,
          code: ({ className: codeClassName, children }) => {
            const isBlock = Boolean(codeClassName?.includes("language-")) || String(children).includes("\n")
            if (isBlock) {
              return (
                <code className={cn("block font-mono text-[13px] leading-6", codeClassName)}>{children}</code>
              )
            }
            return (
              <code className="rounded-md bg-[var(--aura-surface-strong)] px-1.5 py-0.5 font-mono text-[0.86em]">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl border border-[var(--aura-border)] bg-[var(--aura-surface)] p-3 text-[13px] leading-6">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-[var(--aura-border)]">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[var(--aura-surface)]">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-[var(--aura-border)] px-3 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--aura-border)] px-3 py-2 align-top">{children}</td>
          ),
          tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
