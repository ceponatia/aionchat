/* eslint-disable @next/next/no-img-element */

import { memo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const markdownRemarkPlugins = [remarkGfm];
const markdownRehypePlugins = [rehypeHighlight];

const markdownComponents: Components = {
  a: (props) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-200 underline decoration-cyan-300/55 underline-offset-4 hover:text-cyan-100"
    />
  ),
  img: (props) => (
    <img
      {...props}
      alt={props.alt ?? "Markdown image"}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
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
          "rounded-full bg-slate-950/55 px-2 py-0.5 font-mono text-[0.85em] text-slate-100 ring-1 ring-white/8",
          className,
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
};

function MarkdownContentComponent({
  content,
  className,
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "max-w-none wrap-break-word text-sm leading-7 text-inherit [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-300/30 [&_blockquote]:pl-4 [&_blockquote]:text-inherit/85 [&_h1]:my-3 [&_h1]:font-display [&_h1]:text-base [&_h1]:font-semibold [&_h2]:my-3 [&_h2]:font-display [&_h2]:text-sm [&_h2]:font-semibold [&_hr]:my-4 [&_hr]:border-white/10 [&_li]:ml-5 [&_li]:whitespace-pre-wrap [&_ol]:my-2 [&_p]:my-2 [&_p]:whitespace-pre-wrap [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-slate-950/85 [&_pre]:p-4 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/6 [&_th]:px-2 [&_th]:py-1.5 [&_ul]:my-2",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(
  MarkdownContentComponent,
  (previousProps, nextProps) =>
    previousProps.content === nextProps.content &&
    previousProps.className === nextProps.className,
);
