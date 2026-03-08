"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { readTextStream } from "@/lib/streaming-client";
import type { ConversationMessage } from "@/lib/types";

interface ApiErrorResponse {
  error?: string;
}

const RETRY_DELAY_MS = 3000;
const MAX_SEND_RETRIES = 3;

class ChatSendError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ChatSendError";
    this.retryable = retryable;
  }
}

function buildUserMessage(content: string): ConversationMessage {
  return {
    id: `local-user-${crypto.randomUUID()}`,
    role: "user",
    content,
    reasoningDetails: null,
    createdAt: new Date().toISOString(),
  };
}

function buildStreamingAssistantMessage(): ConversationMessage {
  return {
    id: `stream-assistant-${crypto.randomUUID()}`,
    role: "assistant",
    content: "",
    reasoningDetails: null,
    createdAt: new Date().toISOString(),
  };
}

function generateTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 60) return trimmed;
  const truncated = trimmed.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 20
    ? `${truncated.slice(0, lastSpace)}...`
    : `${truncated}...`;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function toFinalSendError(error: unknown): string {
  if (error instanceof ChatSendError && !error.retryable) {
    return error.message;
  }

  const baseMessage =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Message failed. Please try again.";

  return `Message failed after ${MAX_SEND_RETRIES} automatic retries. ${baseMessage}`;
}

interface UseChatMessagesOptions {
  activeId: string | null;
  messages: ConversationMessage[];
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  createConversation: (
    title?: string,
    options?: { select?: boolean },
  ) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
}

interface UseChatMessagesReturn {
  messages: ConversationMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
  setInput: (value: string) => void;
  setError: (value: string | null) => void;
  handleSend: () => Promise<void>;
  clearMessages: () => void;
}

export function useChatMessages({
  activeId,
  messages,
  setMessages,
  createConversation,
  selectConversation,
  loadConversations,
  loadMessages,
  renameConversation,
}: UseChatMessagesOptions): UseChatMessagesReturn {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    const shouldAutotitle = !activeId;
    const conversationId =
      activeId ?? (await createConversation(undefined, { select: false }));
    const localUserMessage = buildUserMessage(content);
    const streamingAssistant = buildStreamingAssistantMessage();

    setMessages((prev) => [...prev, localUserMessage, streamingAssistant]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      let lastError: unknown = null;

      for (
        let retryCount = 0;
        retryCount <= MAX_SEND_RETRIES;
        retryCount += 1
      ) {
        try {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === streamingAssistant.id
                ? { ...message, content: "" }
                : message,
            ),
          );

          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ conversationId, content }),
          });

          if (!response.ok) {
            const body = (await response
              .json()
              .catch(() => null)) as ApiErrorResponse | null;
            throw new ChatSendError(
              body?.error ?? "Unable to send message",
              response.status >= 500 || response.status === 429,
            );
          }

          const finalText = await readTextStream(response, (partialText) => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === streamingAssistant.id
                  ? { ...message, content: partialText }
                  : message,
              ),
            );
          });

          if (!finalText.trim()) {
            throw new Error("No response from model");
          }

          if (shouldAutotitle) {
            await renameConversation(conversationId, generateTitle(content));
          }

          await loadConversations();
          if (activeId === conversationId) {
            await loadMessages(conversationId).catch(() => undefined);
          } else {
            await selectConversation(conversationId);
          }

          return;
        } catch (error: unknown) {
          lastError = error;

          const shouldRetry =
            retryCount < MAX_SEND_RETRIES &&
            (!(error instanceof ChatSendError) || error.retryable);

          if (!shouldRetry) {
            throw lastError;
          }

          await wait(RETRY_DELAY_MS);
        }
      }
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== streamingAssistant.id &&
            message.id !== localUserMessage.id,
        ),
      );
      setInput(content);
      setError(toFinalSendError(err));
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    activeId,
    createConversation,
    selectConversation,
    loadConversations,
    loadMessages,
    renameConversation,
    setMessages,
  ]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    input,
    isLoading,
    error,
    setInput,
    setError,
    handleSend,
    clearMessages,
  };
}
