import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/chat/empty-state";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { AionReasoningDetail } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningDetails?: AionReasoningDetail[] | null;
  createdAt: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  hasAnyConversations: boolean;
}

export function MessageList({
  messages,
  isLoading,
  hasAnyConversations,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  return (
    <div
      className="safe-area-pb flex-1 overflow-y-auto px-4 py-6 [-webkit-overflow-scrolling:touch] sm:px-6"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {messages.length === 0 ? (
          <EmptyState
            variant={
              hasAnyConversations ? "new-conversation" : "no-conversations"
            }
          />
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-slate-800 px-4 py-3 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
