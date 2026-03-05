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
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
  hasAnyConversations: boolean;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  hasAnyConversations,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousFirstIdRef = useRef<string | null>(null);
  const previousLastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const firstId = messages[0]?.id ?? null;
    const lastId = messages[messages.length - 1]?.id ?? null;
    const wasPrepend =
      previousFirstIdRef.current !== null &&
      firstId !== previousFirstIdRef.current &&
      lastId === previousLastIdRef.current;

    if (!wasPrepend) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    previousFirstIdRef.current = firstId;
    previousLastIdRef.current = lastId;
  }, [messages, isLoading]);

  async function handleLoadMore(): Promise<void> {
    const container = listRef.current;
    if (isLoadingMore) {
      return;
    }
    if (!container) {
      await onLoadMore();
      return;
    }

    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;

    await onLoadMore();

    requestAnimationFrame(() => {
      const nextHeight = container.scrollHeight;
      container.scrollTop = previousTop + (nextHeight - previousHeight);
    });
  }

  return (
    <div
      ref={listRef}
      className="safe-area-pb flex-1 overflow-y-auto px-4 py-6 [-webkit-overflow-scrolling:touch] [overflow-anchor:auto] sm:px-6"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoadingMore}
              onClick={() => {
                void handleLoadMore();
              }}
            >
              {isLoadingMore ? "Loading earlier messages..." : "Load earlier messages"}
            </button>
          </div>
        ) : null}

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
