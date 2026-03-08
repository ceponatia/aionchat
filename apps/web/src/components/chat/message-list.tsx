import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/chat/empty-state";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { ConversationMessage } from "@/lib/types";

interface PendingAssistantPlacement {
  anchorId: string | null;
}

interface MessageListProps {
  messages: ConversationMessage[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  isActionsDisabled: boolean;
  pendingAssistantPlacement: PendingAssistantPlacement | null;
  onLoadMore: () => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onRegenerateMessage: (messageId: string) => Promise<void>;
  onBranchMessage: (messageId: string, content: string) => Promise<void>;
  onResendMessage: (messageId: string) => Promise<void>;
  hasAnyConversations: boolean;
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-[22px] rounded-bl-md border border-white/10 bg-slate-900/70 px-4 py-3 text-xs text-slate-300 backdrop-blur-md">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function findLastAssistantId(
  messages: ConversationMessage[],
): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return message.id;
    }
  }

  return undefined;
}

function shouldRenderPendingBubbleAtBottom(
  pendingAssistantPlacement: PendingAssistantPlacement | null,
  messages: ConversationMessage[],
): boolean {
  return (
    pendingAssistantPlacement !== null &&
    (pendingAssistantPlacement.anchorId === null ||
      !messages.some(
        (message) => message.id === pendingAssistantPlacement.anchorId,
      ))
  );
}

// eslint-disable-next-line max-lines-per-function -- preserves scroll behavior while coordinating pagination and per-message actions
export function MessageList({
  messages,
  isLoading,
  hasMore,
  isLoadingMore,
  isActionsDisabled,
  pendingAssistantPlacement,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
  onRegenerateMessage,
  onBranchMessage,
  onResendMessage,
  hasAnyConversations,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousFirstIdRef = useRef<string | null>(null);
  const previousLastIdRef = useRef<string | null>(null);
  const lastAssistantId = findLastAssistantId(messages);
  const shouldRenderPendingAtBottom = shouldRenderPendingBubbleAtBottom(
    pendingAssistantPlacement,
    messages,
  );

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
      try {
        await onLoadMore();
      } catch (error) {
        // Handle and surface the error instead of letting the promise rejection go unhandled.
        // This can be replaced with a toast or other UI feedback mechanism if desired.
        console.error("Failed to load more messages:", error);
      }
      return;
    }

    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;

    try {
      await onLoadMore();
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      // Restore scroll position safely even if loading fails.
      requestAnimationFrame(() => {
        const nextHeight = container.scrollHeight;
        container.scrollTop = previousTop + (nextHeight - previousHeight);
      });
    }
  }

  return (
    <div
      ref={listRef}
      className="safe-area-pb flex-1 overflow-y-auto px-4 py-4 [-webkit-overflow-scrolling:touch] [overflow-anchor:auto] sm:px-6 lg:px-8"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-muted-foreground transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoadingMore}
              onClick={() => {
                void handleLoadMore();
              }}
            >
              {isLoadingMore
                ? "Loading earlier messages..."
                : "Load earlier messages"}
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
          <div key={message.id} className="contents">
            <MessageBubble
              message={message}
              isLastAssistant={message.id === lastAssistantId}
              isDisabled={isActionsDisabled}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onRegenerate={onRegenerateMessage}
              onBranch={onBranchMessage}
              onResend={onResendMessage}
            />

            {pendingAssistantPlacement?.anchorId === message.id ? (
              <LoadingBubble />
            ) : null}
          </div>
        ))}

        {!isLoading && shouldRenderPendingAtBottom ? <LoadingBubble /> : null}

        {isLoading ? <LoadingBubble /> : null}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
