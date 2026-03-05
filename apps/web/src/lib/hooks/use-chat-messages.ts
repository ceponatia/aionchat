"use client";

import { useCallback, useEffect, useState } from "react";

import type { AionReasoningDetail, ChatResponseBody } from "@/lib/types";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningDetails?: AionReasoningDetail[] | null;
  createdAt: string;
}

interface ApiErrorResponse {
  error?: string;
}

function buildUserMessage(content: string): UIMessage {
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
  activeMessages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    reasoningDetails: AionReasoningDetail[] | null;
    createdAt: string;
  }>;
  createConversation: (
    title?: string,
    options?: { select?: boolean },
  ) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
}

interface UseChatMessagesReturn {
  messages: UIMessage[];
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
  activeMessages,
  createConversation,
  selectConversation,
  loadConversations,
  renameConversation,
}: UseChatMessagesOptions): UseChatMessagesReturn {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages(
      activeMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        reasoningDetails: m.reasoningDetails,
        createdAt: m.createdAt,
      })),
    );
  }, [activeMessages]);

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
  ]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

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
