"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ConversationMeta,
  ConversationListItem,
  ConversationLoreEntryItem,
  UpdateConversationLoreEntriesBody,
  UpdateConversationSettingsBody,
} from "@/lib/types";

const ACTIVE_CONVERSATION_KEY = "aionchat:activeConversation";

interface CreateConversationOptions {
  /** When false, the new conversation is not selected after creation. Default: true. */
  select?: boolean;
}

interface ConversationSettings {
  systemPrompt?: string | null;
  autoLoreEnabled?: boolean;
  promptBudgetMode?: "balanced" | "aggressive";
  characterSheetId?: string | null;
}

interface UseConversationsReturn {
  conversations: ConversationListItem[];
  activeId: string | null;
  activeTitle: string | null;
  activeSystemPrompt: string | null;
  activeAutoLoreEnabled: boolean;
  activePromptBudgetMode: "balanced" | "aggressive";
  activeCharacterSheetId: string | null;
  activeLoreEntries: ConversationLoreEntryItem[];
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
  updateConversationLoreEntries: (
    id: string,
    body: UpdateConversationLoreEntriesBody,
  ) => Promise<void>;
  saveConversationSettings: (
    id: string,
    body: UpdateConversationSettingsBody,
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

async function fetchConversationDetail(id: string): Promise<ConversationMeta> {
  const response = await fetch(`/api/conversations/${id}`, {
    cache: "no-store",
  });
  return parseOrThrow<ConversationMeta>(
    response,
    "Unable to load conversation",
  );
}

async function fetchConversationLoreEntries(
  id: string,
): Promise<ConversationLoreEntryItem[]> {
  const response = await fetch(`/api/conversations/${id}/lore-entries`, {
    cache: "no-store",
  });
  return parseOrThrow<ConversationLoreEntryItem[]>(
    response,
    "Unable to load conversation lore entries",
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
  setActiveAutoLoreEnabled: (value: boolean) => void;
  setActivePromptBudgetMode: (value: "balanced" | "aggressive") => void;
  setActiveCharacterSheetId: (value: string | null) => void;
  setActiveLoreEntries: (value: ConversationLoreEntryItem[]) => void;
}

// eslint-disable-next-line max-lines-per-function -- groups conversation CRUD helpers into one hook for the page orchestrator
function useConversationCrud({
  activeId,
  clearActiveConversation,
  selectConversation,
  setConversations,
  setActiveSystemPrompt,
  setActiveAutoLoreEnabled,
  setActivePromptBudgetMode,
  setActiveCharacterSheetId,
  setActiveLoreEntries,
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
      if ("autoLoreEnabled" in settings) {
        setActiveAutoLoreEnabled(settings.autoLoreEnabled ?? true);
      }
      if ("promptBudgetMode" in settings) {
        setActivePromptBudgetMode(settings.promptBudgetMode ?? "balanced");
      }
      if ("characterSheetId" in settings) {
        setActiveCharacterSheetId(settings.characterSheetId ?? null);
      }
      await loadConversations();
    },
    [
      loadConversations,
      setActiveAutoLoreEnabled,
      setActiveSystemPrompt,
      setActiveCharacterSheetId,
      setActivePromptBudgetMode,
    ],
  );

  const updateConversationLoreEntries = useCallback(
    async (id: string, body: UpdateConversationLoreEntriesBody) => {
      const response = await fetch(`/api/conversations/${id}/lore-entries`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const items = await parseOrThrow<ConversationLoreEntryItem[]>(
        response,
        "Unable to update conversation lore entries",
      );
      setActiveLoreEntries(items);
      await loadConversations();
    },
    [loadConversations, setActiveLoreEntries],
  );

  const saveConversationSettings = useCallback(
    async (id: string, body: UpdateConversationSettingsBody) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await parseOrThrow<{ id: string }>(
        response,
        "Unable to save conversation settings",
      );
      if ("systemPrompt" in body) {
        setActiveSystemPrompt(body.systemPrompt ?? null);
      }
      if ("autoLoreEnabled" in body) {
        setActiveAutoLoreEnabled(body.autoLoreEnabled ?? true);
      }
      if ("promptBudgetMode" in body) {
        setActivePromptBudgetMode(body.promptBudgetMode ?? "balanced");
      }
      if ("characterSheetId" in body) {
        setActiveCharacterSheetId(body.characterSheetId ?? null);
      }
      setActiveLoreEntries(await fetchConversationLoreEntries(id));
      await loadConversations();
    },
    [
      loadConversations,
      setActiveAutoLoreEnabled,
      setActiveCharacterSheetId,
      setActiveSystemPrompt,
      setActivePromptBudgetMode,
      setActiveLoreEntries,
    ],
  );

  return {
    loadConversations,
    createConversation,
    renameConversation,
    deleteConversation,
    updateConversationSettings,
    updateConversationLoreEntries,
    saveConversationSettings,
  };
}

// eslint-disable-next-line max-lines-per-function -- orchestrates conversation state, CRUD helpers, and loading wrapper
export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSystemPrompt, setActiveSystemPrompt] = useState<string | null>(
    null,
  );
  const [activeAutoLoreEnabled, setActiveAutoLoreEnabled] = useState(true);
  const [activePromptBudgetMode, setActivePromptBudgetMode] = useState<
    "balanced" | "aggressive"
  >("balanced");
  const [activeCharacterSheetId, setActiveCharacterSheetId] = useState<
    string | null
  >(null);
  const [activeLoreEntries, setActiveLoreEntries] = useState<
    ConversationLoreEntryItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const activeTitle = useMemo(
    () => conversations.find((c) => c.id === activeId)?.title ?? null,
    [activeId, conversations],
  );
  const clearActiveConversation = useCallback(() => {
    setActiveId(null);
    setActiveSystemPrompt(null);
    setActiveAutoLoreEnabled(true);
    setActivePromptBudgetMode("balanced");
    setActiveCharacterSheetId(null);
    setActiveLoreEntries([]);
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }, []);
  const selectConversation = useCallback(async (id: string) => {
    const [detail, loreEntries] = await Promise.all([
      fetchConversationDetail(id),
      fetchConversationLoreEntries(id),
    ]);
    setActiveId(detail.id);
    setActiveSystemPrompt(detail.systemPrompt);
    setActiveAutoLoreEnabled(detail.autoLoreEnabled);
    setActivePromptBudgetMode(detail.promptBudgetMode);
    setActiveCharacterSheetId(detail.characterSheetId);
    setActiveLoreEntries(loreEntries);
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, detail.id);
  }, []);

  const {
    loadConversations,
    createConversation,
    renameConversation,
    deleteConversation,
    updateConversationSettings,
    updateConversationLoreEntries,
    saveConversationSettings,
  } = useConversationCrud({
    activeId,
    clearActiveConversation,
    selectConversation,
    setConversations,
    setActiveSystemPrompt,
    setActiveAutoLoreEnabled,
    setActivePromptBudgetMode,
    setActiveCharacterSheetId,
    setActiveLoreEntries,
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
    activeAutoLoreEnabled,
    activePromptBudgetMode,
    activeCharacterSheetId,
    activeLoreEntries,
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
    updateConversationLoreEntries: (
      id: string,
      body: UpdateConversationLoreEntriesBody,
    ) => withLoading(() => updateConversationLoreEntries(id, body)),
    saveConversationSettings: (
      id: string,
      body: UpdateConversationSettingsBody,
    ) => withLoading(() => saveConversationSettings(id, body)),
    clearActiveConversation,
  };
}
