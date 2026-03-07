"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import { readTextStream } from "@/lib/streaming-client";
import type { ConversationMessage, EditMessageResponse } from "@/lib/types";

interface ApiErrorResponse {
  error?: string;
}

interface PendingAssistantPlacement {
  anchorId: string | null;
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

interface UseMessageOperationsOptions {
  activeId: string | null;
  messages: ConversationMessage[];
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
}

interface UseMessageOperationsReturn {
  isOperating: boolean;
  pendingAssistantPlacement: PendingAssistantPlacement | null;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleEditMessage: (messageId: string, content: string) => Promise<void>;
  handleRegenerateMessage: (messageId: string) => Promise<void>;
  handleBranchMessage: (messageId: string, content: string) => Promise<void>;
}

async function parseOrThrow<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new Error(body?.error ?? fallback);
  }

  return (await response.json()) as T;
}

function showError(title: string, error: unknown): void {
  const description =
    error instanceof Error ? error.message : "Please try again.";

  toast.error(title, {
    description,
    duration: 5000,
  });
}

// eslint-disable-next-line max-lines-per-function -- centralizes optimistic message mutations and DB resync behavior
export function useMessageOperations({
  activeId,
  messages,
  setMessages,
  loadConversations,
  loadMessages,
}: UseMessageOperationsOptions): UseMessageOperationsReturn {
  const [isOperating, setIsOperating] = useState(false);
  const isOperatingRef = useRef(false);
  const [pendingAssistantPlacement, setPendingAssistantPlacement] =
    useState<PendingAssistantPlacement | null>(null);
  const activeIdRef = useRef<string | null>(activeId);
  const messagesRef = useRef(messages);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (isOperatingRef.current) {
        return;
      }

      const conversationId = activeId;
      isOperatingRef.current = true;
      setIsOperating(true);

      try {
        await parseOrThrow<{ ok: true }>(
          await fetch(`/api/messages/${messageId}`, {
            method: "DELETE",
          }),
          "Unable to delete message",
        );

        if (activeIdRef.current === conversationId) {
          setMessages((prev) =>
            prev.filter((message) => message.id !== messageId),
          );
        }

        await loadConversations();
      } catch (error: unknown) {
        showError("Failed to delete message", error);
        throw error;
      } finally {
        isOperatingRef.current = false;
        setIsOperating(false);
      }
    },
    [activeId, loadConversations, setMessages],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      if (isOperatingRef.current || !activeId) {
        return;
      }

      const conversationId = activeId;
      isOperatingRef.current = true;
      setIsOperating(true);

      try {
        const updated = await parseOrThrow<EditMessageResponse>(
          await fetch(`/api/messages/${messageId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content }),
          }),
          "Unable to update message",
        );

        if (activeIdRef.current === conversationId) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId ? updated : message,
            ),
          );
        }

        await loadConversations();
      } catch (error: unknown) {
        showError("Failed to update message", error);
        throw error;
      } finally {
        isOperatingRef.current = false;
        setIsOperating(false);
      }
    },
    [activeId, loadConversations, setMessages],
  );

  const handleRegenerateMessage = useCallback(
    async (messageId: string) => {
      if (isOperatingRef.current || !activeId) {
        return;
      }

      const currentMessages = messagesRef.current;
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (
        !lastMessage ||
        lastMessage.id !== messageId ||
        lastMessage.role !== "assistant"
      ) {
        const error = new Error(
          "Only the latest assistant message can be regenerated",
        );
        showError("Failed to regenerate response", error);
        throw error;
      }

      const conversationId = activeId;
      if (!conversationId) {
        return;
      }
      const anchorId = currentMessages[currentMessages.length - 2]?.id ?? null;

      isOperatingRef.current = true;
      setIsOperating(true);
      setPendingAssistantPlacement({ anchorId });
      setMessages((prev) => prev.slice(0, -1));

      try {
        const request = await fetch(
          `/api/conversations/${conversationId}/regenerate`,
          {
            method: "POST",
          },
        );
        if (!request.ok) {
          const body = (await request
            .json()
            .catch(() => null)) as ApiErrorResponse | null;
          throw new Error(body?.error ?? "Unable to regenerate response");
        }

        const streamingAssistant = buildStreamingAssistantMessage();
        if (activeIdRef.current === conversationId) {
          setMessages((prev) => [...prev, streamingAssistant]);
        }

        await readTextStream(request, (partialText) => {
          if (activeIdRef.current !== conversationId) {
            return;
          }

          setMessages((prev) =>
            prev.map((message) =>
              message.id === streamingAssistant.id
                ? { ...message, content: partialText }
                : message,
            ),
          );
        });

        if (activeIdRef.current === conversationId) {
          await loadMessages(conversationId);
        }

        await loadConversations();
      } catch (error: unknown) {
        if (activeIdRef.current === conversationId) {
          await loadMessages(conversationId);
        }

        showError("Failed to regenerate response", error);
        throw error;
      } finally {
        setPendingAssistantPlacement(null);
        isOperatingRef.current = false;
        setIsOperating(false);
      }
    },
    [activeId, loadConversations, loadMessages, setMessages],
  );

  const handleBranchMessage = useCallback(
    async (messageId: string, content: string) => {
      if (isOperatingRef.current) {
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        const error = new Error("Message content is required");
        showError("Failed to branch message", error);
        throw error;
      }

      const currentMessages = messagesRef.current;
      const targetIndex = currentMessages.findIndex(
        (message) => message.id === messageId,
      );
      if (targetIndex < 0) {
        const error = new Error(
          "Message not found in the current conversation",
        );
        showError("Failed to branch message", error);
        throw error;
      }

      const conversationId = activeId;
      if (!conversationId) {
        return;
      }
      const optimisticMessages = currentMessages.slice(0, targetIndex + 1);
      optimisticMessages[targetIndex] = {
        ...optimisticMessages[targetIndex]!,
        content: trimmedContent,
      };

      isOperatingRef.current = true;
      setIsOperating(true);
      setPendingAssistantPlacement({ anchorId: messageId });
      setMessages(optimisticMessages);

      try {
        const request = await fetch(`/api/messages/${messageId}/branch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: trimmedContent }),
        });
        if (!request.ok) {
          const body = (await request
            .json()
            .catch(() => null)) as ApiErrorResponse | null;
          throw new Error(body?.error ?? "Unable to branch message");
        }

        const streamingAssistant = buildStreamingAssistantMessage();
        if (activeIdRef.current === conversationId) {
          setMessages((prev) => [...prev, streamingAssistant]);
        }

        await readTextStream(request, (partialText) => {
          if (activeIdRef.current !== conversationId) {
            return;
          }

          setMessages((prev) =>
            prev.map((message) =>
              message.id === streamingAssistant.id
                ? { ...message, content: partialText }
                : message,
            ),
          );
        });

        if (activeIdRef.current === conversationId) {
          await loadMessages(conversationId);
        }

        await loadConversations();
      } catch (error: unknown) {
        if (activeIdRef.current === conversationId) {
          await loadMessages(conversationId);
        }

        showError("Failed to branch message", error);
        throw error;
      } finally {
        setPendingAssistantPlacement(null);
        isOperatingRef.current = false;
        setIsOperating(false);
      }
    },
    [activeId, loadConversations, loadMessages, setMessages],
  );

  return {
    isOperating,
    pendingAssistantPlacement,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleBranchMessage,
  };
}
