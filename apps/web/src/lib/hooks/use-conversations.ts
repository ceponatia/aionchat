"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ConversationDetail,
  ConversationListItem,
  ConversationMessage,
} from "@/lib/types";

const ACTIVE_CONVERSATION_KEY = "aionchat:activeConversation";

interface CreateConversationOptions {
  /** When false, the new conversation is not selected after creation. Default: true. */
  select?: boolean;
}

interface UseConversationsReturn {
  conversations: ConversationListItem[];
  activeId: string | null;
  activeMessages: ConversationMessage[];
  activeTitle: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: (
    title?: string,
    options?: CreateConversationOptions,
  ) => Promise<string>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearActiveConversation: () => void;
}

interface ApiErrorResponse {
  error?: string;
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

function mapMessages(
  messages: ConversationDetail["messages"],
): ConversationMessage[] {
  const isRenderableRole = (
    role: ConversationDetail["messages"][number]["role"],
  ): role is ConversationMessage["role"] =>
    role === "user" || role === "assistant";

  return messages
    .filter((message) => isRenderableRole(message.role))
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      reasoningDetails: message.reasoningDetails,
      createdAt: message.createdAt,
    }));
}

async function fetchConversations(): Promise<ConversationListItem[]> {
  const response = await fetch("/api/conversations", { cache: "no-store" });
  return parseOrThrow<ConversationListItem[]>(
    response,
    "Unable to load conversations",
  );
}

async function fetchConversationDetail(
  id: string,
): Promise<ConversationDetail> {
  const response = await fetch(`/api/conversations/${id}`, {
    cache: "no-store",
  });
  return parseOrThrow<ConversationDetail>(
    response,
    "Unable to load conversation",
  );
}

function useConversationHydration(
  clearActiveConversation: () => void,
  selectConversation: (id: string) => Promise<void>,
  setConversations: (value: ConversationListItem[]) => void,
  setIsLoading: (value: boolean) => void,
  setIsHydrated: (value: boolean) => void,
): void {
  useEffect(() => {
    let isCancelled = false;
    async function hydrate(): Promise<void> {
      setIsLoading(true);
      try {
        const list = await fetchConversations();
        if (isCancelled) return;
        setConversations(list);
        const storedActiveId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        if (
          !storedActiveId ||
          !list.some((item) => item.id === storedActiveId)
        ) {
          localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
          return;
        }
        await selectConversation(storedActiveId);
      } catch {
        if (!isCancelled) {
          clearActiveConversation();
          setConversations([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsHydrated(true);
        }
      }
    }
    void hydrate();
    return () => {
      isCancelled = true;
    };
  }, [
    clearActiveConversation,
    selectConversation,
    setConversations,
    setIsHydrated,
    setIsLoading,
  ]);
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const activeTitle = useMemo(
    () => conversations.find((c) => c.id === activeId)?.title ?? null,
    [activeId, conversations],
  );
  const clearActiveConversation = useCallback(() => {
    setActiveId(null);
    setActiveMessages([]);
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }, []);
  const selectConversation = useCallback(async (id: string) => {
    const detail = await fetchConversationDetail(id);
    setActiveId(detail.id);
    setActiveMessages(mapMessages(detail.messages));
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, detail.id);
  }, []);
  const loadConversations = useCallback(async () => {
    setConversations(await fetchConversations());
  }, []);
  const createConversation = useCallback(
    async (title?: string, options?: CreateConversationOptions) => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: title ? JSON.stringify({ title }) : "{}",
      });
      const created = await parseOrThrow<ConversationListItem>(
        response,
        "Unable to create conversation",
      );
      await loadConversations();
      if (options?.select !== false) {
        await selectConversation(created.id);
      }
      return created.id;
    },
    [loadConversations, selectConversation],
  );
  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await parseOrThrow<{ id: string }>(
        response,
        "Unable to rename conversation",
      );
      await loadConversations();
    },
    [loadConversations],
  );
  const deleteConversation = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      await parseOrThrow<{ ok: boolean }>(
        response,
        "Unable to delete conversation",
      );
      const list = await fetchConversations();
      setConversations(list);
      if (activeId !== id) return;
      const next = list[0];
      if (!next) {
        clearActiveConversation();
        return;
      }
      await selectConversation(next.id);
    },
    [activeId, clearActiveConversation, selectConversation],
  );

  useConversationHydration(
    clearActiveConversation,
    selectConversation,
    setConversations,
    setIsLoading,
    setIsHydrated,
  );

  const withLoading = useCallback(async <T>(task: () => Promise<T>) => {
    setIsLoading(true);
    try {
      return await task();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    conversations,
    activeId,
    activeMessages,
    activeTitle,
    isLoading,
    isHydrated,
    loadConversations: () => withLoading(loadConversations),
    selectConversation: (id: string) =>
      withLoading(() => selectConversation(id)),
    createConversation: (title?: string, options?: CreateConversationOptions) =>
      withLoading(() => createConversation(title, options)),
    renameConversation: (id: string, title: string) =>
      withLoading(() => renameConversation(id, title)),
    deleteConversation: (id: string) =>
      withLoading(() => deleteConversation(id)),
    clearActiveConversation,
  };
}
