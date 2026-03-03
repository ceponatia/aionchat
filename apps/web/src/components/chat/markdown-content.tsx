/* eslint-disable @next/next/no-img-element */

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const markdownComponents: Components = {
  a: (props) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-300 underline decoration-sky-400/60 underline-offset-2 hover:text-sky-200"
    />
  ),
  img: (props) => (
    <img
      {...props}
      alt={props.alt ?? "Markdown image"}
      className="my-2 max-h-80 w-auto rounded-md border border-border"
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={cn("block overflow-x-auto p-0", className)} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className={cn(
          "rounded bg-slate-700/70 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-100",
          className,
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "max-w-none wrap-break-word text-sm leading-6 text-inherit [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_h1]:my-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-sm [&_h2]:font-semibold [&_hr]:my-3 [&_hr]:border-border [&_li]:ml-5 [&_ol]:my-2 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-slate-900 [&_pre]:p-3 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-slate-700/40 [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
