"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ConversationMeta,
  ConversationListItem,
} from "@/lib/types";

const ACTIVE_CONVERSATION_KEY = "aionchat:activeConversation";

interface CreateConversationOptions {
  /** When false, the new conversation is not selected after creation. Default: true. */
  select?: boolean;
}

interface ConversationSettings {
  systemPrompt?: string | null;
  characterSheetId?: string | null;
}

interface UseConversationsReturn {
  conversations: ConversationListItem[];
  activeId: string | null;
  activeTitle: string | null;
  activeSystemPrompt: string | null;
  activeCharacterSheetId: string | null;
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
  updateConversationSettings: (
    id: string,
    settings: ConversationSettings,
  ) => Promise<void>;
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

async function fetchConversations(): Promise<ConversationListItem[]> {
  const response = await fetch("/api/conversations", { cache: "no-store" });
  return parseOrThrow<ConversationListItem[]>(
    response,
    "Unable to load conversations",
  );
}

async function fetchConversationDetail(
  id: string,
): Promise<ConversationMeta> {
  const response = await fetch(`/api/conversations/${id}`, {
    cache: "no-store",
  });
  return parseOrThrow<ConversationMeta>(
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

interface ConversationCrudOptions {
  activeId: string | null;
  clearActiveConversation: () => void;
  selectConversation: (id: string) => Promise<void>;
  setConversations: (value: ConversationListItem[]) => void;
  setActiveSystemPrompt: (value: string | null) => void;
  setActiveCharacterSheetId: (value: string | null) => void;
}

function useConversationCrud({
  activeId,
  clearActiveConversation,
  selectConversation,
  setConversations,
  setActiveSystemPrompt,
  setActiveCharacterSheetId,
}: ConversationCrudOptions) {
  const loadConversations = useCallback(async () => {
    setConversations(await fetchConversations());
  }, [setConversations]);

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
    [activeId, clearActiveConversation, selectConversation, setConversations],
  );

  const updateConversationSettings = useCallback(
    async (id: string, settings: ConversationSettings) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      await parseOrThrow<{ id: string }>(
        response,
        "Unable to update conversation settings",
      );
      if ("systemPrompt" in settings) {
        setActiveSystemPrompt(settings.systemPrompt ?? null);
      }
      if ("characterSheetId" in settings) {
        setActiveCharacterSheetId(settings.characterSheetId ?? null);
      }
      await loadConversations();
    },
    [loadConversations, setActiveSystemPrompt, setActiveCharacterSheetId],
  );

  return {
    loadConversations,
    createConversation,
    renameConversation,
    deleteConversation,
    updateConversationSettings,
  };
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSystemPrompt, setActiveSystemPrompt] = useState<string | null>(
    null,
  );
  const [activeCharacterSheetId, setActiveCharacterSheetId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const activeTitle = useMemo(
    () => conversations.find((c) => c.id === activeId)?.title ?? null,
    [activeId, conversations],
  );
  const clearActiveConversation = useCallback(() => {
    setActiveId(null);
    setActiveSystemPrompt(null);
    setActiveCharacterSheetId(null);
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }, []);
  const selectConversation = useCallback(async (id: string) => {
    const detail = await fetchConversationDetail(id);
    setActiveId(detail.id);
    setActiveSystemPrompt(detail.systemPrompt);
    setActiveCharacterSheetId(detail.characterSheetId);
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, detail.id);
  }, []);

  const {
    loadConversations,
    createConversation,
    renameConversation,
    deleteConversation,
    updateConversationSettings,
  } = useConversationCrud({
    activeId,
    clearActiveConversation,
    selectConversation,
    setConversations,
    setActiveSystemPrompt,
    setActiveCharacterSheetId,
  });

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
    activeTitle,
    activeSystemPrompt,
    activeCharacterSheetId,
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
    updateConversationSettings: (id: string, settings: ConversationSettings) =>
      withLoading(() => updateConversationSettings(id, settings)),
    clearActiveConversation,
  };
}
