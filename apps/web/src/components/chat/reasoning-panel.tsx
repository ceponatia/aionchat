import { useMemo, useState } from "react";
import { Brain, ChevronDown } from "lucide-react";

import { MarkdownContent } from "@/components/chat/markdown-content";
import { cn } from "@/lib/utils";
import type { AionReasoningDetail } from "@/lib/types";

interface ReasoningPanelProps {
  details: AionReasoningDetail[];
}

function normalizeReasoning(details: AionReasoningDetail[]): string {
  return details
    .map((detail) => detail.content.trim())
    .filter((content) => content.length > 0)
    .join("\n\n");
}

export function ReasoningPanel({ details }: ReasoningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reasoningMarkdown = useMemo(
    () => normalizeReasoning(details),
    [details],
  );

  if (!reasoningMarkdown) {
    return null;
  }

  return (
    <section className="mb-3 rounded-[22px] border border-white/10 bg-slate-950/45 backdrop-blur-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs uppercase tracking-[0.24em] text-slate-300 transition-colors hover:bg-white/5"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse reasoning" : "Expand reasoning"}
      >
        <span className="inline-flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" />
          Reasoning
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "grid overflow-hidden px-3 transition-[grid-template-rows,opacity] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 pb-3">
          <MarkdownContent
            content={reasoningMarkdown}
            className="px-1 text-xs text-slate-300 [&_pre]:bg-slate-950"
          />
        </div>
      </div>
    </section>
  );
}
