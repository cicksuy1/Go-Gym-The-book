// Dark-theme markdown renderer with hand-rolled prose classes (no
// @tailwindcss/typography). Go code blocks are syntax-highlighted via
// rehype-highlight; highlight.js theme is imported in index.css.

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownProps {
  children: string
  /** Smaller type scale for the tutor chat vs the lesson body. */
  compact?: boolean
}

// Block elements carry dir="auto" so each one picks its direction from its own
// text (first strong character) — Hebrew prose renders RTL, English LTR, in the
// same message. Code is pinned dir="ltr"; logical utilities (ps-*, border-s-*,
// text-start) let indents and borders flip with the resolved direction.
const components: Components = {
  h1: ({ children }) => (
    <h1 dir="auto" className="mt-2 mb-4 text-3xl font-bold tracking-tight text-zinc-50">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 dir="auto" className="mt-8 mb-3 border-b border-zinc-800 pb-2 text-2xl font-semibold text-zinc-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 dir="auto" className="mt-6 mb-2 text-xl font-semibold text-zinc-100">{children}</h3>
  ),
  p: ({ children }) => (
    <p dir="auto" className="my-4 leading-7 text-zinc-300">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-emerald-400 underline decoration-emerald-700 underline-offset-2 hover:text-emerald-300"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul dir="auto" className="my-4 list-disc space-y-1 ps-6 text-zinc-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol dir="auto" className="my-4 list-decimal space-y-1 ps-6 text-zinc-300">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote dir="auto" className="my-5 rounded-e-md border-s-4 border-emerald-600 bg-emerald-950/30 py-1 pe-3 ps-4 text-zinc-300 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full border-collapse text-sm text-zinc-300">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-800/70 text-zinc-100">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-zinc-800 [&>tr:nth-child(even)]:bg-zinc-900/40">
      {children}
    </tbody>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th dir="auto" className="border-b border-zinc-700 px-3 py-2 text-start font-semibold tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td dir="auto" className="px-3 py-2 align-top leading-6">{children}</td>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      // <pre> wrapper styles the block; keep hljs class for highlighting.
      return <code className={className}>{children}</code>
    }
    return (
      <code dir="ltr" className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-300">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre dir="ltr" className="my-5 overflow-x-auto rounded-lg border border-zinc-800 bg-[#0b0f14] p-4 text-sm leading-6">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-zinc-800" />,
}

export function Markdown({ children, compact = false }: MarkdownProps) {
  return (
    <div className={compact ? 'text-sm' : 'text-base'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
