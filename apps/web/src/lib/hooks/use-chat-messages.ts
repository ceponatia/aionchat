"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type {
  ChatResponseBody,
  ConversationMessage,
} from "@/lib/types";

interface ApiErrorResponse {
  error?: string;
}

function buildUserMessage(content: string): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
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

    setMessages((prev) => [...prev, buildUserMessage(content)]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;
        throw new Error(body?.error ?? "Unable to send message");
      }

      const body = (await response.json()) as ChatResponseBody;
      setMessages((prev) => [
        ...prev,
        {
          id: body.message.id,
          role: body.message.role,
          content: body.message.content,
          reasoningDetails: body.message.reasoningDetails,
          createdAt: body.message.createdAt,
        },
      ]);

      if (shouldAutotitle) {
        await renameConversation(conversationId, generateTitle(content));
      }

      await loadConversations();
      await selectConversation(conversationId);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Message failed. Please try again.",
      );
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
