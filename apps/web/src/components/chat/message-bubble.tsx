import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { MarkdownContent } from "@/components/chat/markdown-content";
import { ReasoningPanel } from "@/components/chat/reasoning-panel";
import type { AionReasoningDetail } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningDetails?: AionReasoningDetail[] | null;
  createdAt: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [didCopy, setDidCopy] = useState(false);

  useEffect(() => {
    if (!didCopy) {
      return;
    }

    const timeoutId = window.setTimeout(() => setDidCopy(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [didCopy]);

  async function handleCopy(): Promise<void> {
    const text = message.content;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Position off-screen to avoid affecting layout
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("Fallback copy command was unsuccessful");
        }
      }

      setDidCopy(true);
    } catch (error) {
      // Avoid unhandled rejections and surface the failure for debugging
      // UI will simply not show "Copied" on failure.
      // eslint-disable-next-line no-console
      console.error("Failed to copy text to clipboard:", error);
    }
  }

  return (
    <article className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "group max-w-[85%] rounded-2xl rounded-br-md bg-sky-500 px-4 py-3 text-sm text-slate-950 shadow-sm"
            : "group max-w-[85%] rounded-2xl rounded-bl-md bg-slate-800 px-4 py-3 text-sm text-slate-100 shadow-sm"
        }
      >
        <div className="mb-2 flex justify-end sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-inherit/80 hover:bg-black/10 hover:text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
            aria-label="Copy message"
          >
            {didCopy ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </div>

        {!isUser && message.reasoningDetails?.length ? (
          <ReasoningPanel details={message.reasoningDetails} />
        ) : null}

        <MarkdownContent content={message.content} />
      </div>
    </article>
  );
}
