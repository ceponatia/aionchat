"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ConversationListItem,
  ConversationLoreEntryItem,
  ConversationMeta,
  ConversationTagItem,
  PromptBudgetMode,
  UpdateConversationLoreEntriesBody,
  UpdateConversationSettingsBody,
} from "@/lib/types";

const ACTIVE_CONVERSATION_KEY = "aionchat:activeConversation";

interface CreateConversationOptions {
  select?: boolean;
  model?: string | null;
}

interface ConversationSettings {
  systemPrompt?: string | null;
  autoLoreEnabled?: boolean;
  promptBudgetMode?: PromptBudgetMode;
  model?: string | null;
  characterSheetId?: string | null;
}

interface UseConversationsReturn {
  conversations: ConversationListItem[];
  activeId: string | null;
  activeTitle: string | null;
  activeSystemPrompt: string | null;
  activeAutoLoreEnabled: boolean;
  activePromptBudgetMode: PromptBudgetMode;
  activeModel: string | null;
  activeCharacterSheetId: string | null;
  activeLoreEntries: ConversationLoreEntryItem[];
  isLoading: boolean;
  isHydrated: boolean;
  showArchived: boolean;
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
  setConversationTags: (
    id: string,
    tagIds: string[],
  ) => Promise<ConversationTagItem[]>;
  setConversationArchived: (id: string, archived: boolean) => Promise<void>;
  setArchivedVisibility: (value: boolean) => Promise<void>;
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

async function fetchConversations(
  includeArchived: boolean,
): Promise<ConversationListItem[]> {
  const params = new URLSearchParams();
  if (includeArchived) {
    params.set("includeArchived", "true");
  }

  const response = await fetch(
    `/api/conversations${params.size > 0 ? `?${params.toString()}` : ""}`,
    { cache: "no-store" },
  );

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

async function putConversationTags(
  id: string,
  tagIds: string[],
): Promise<ConversationTagItem[]> {
  const response = await fetch(`/api/conversations/${id}/tags`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tagIds }),
  });

  return parseOrThrow<ConversationTagItem[]>(
    response,
    "Unable to update conversation tags",
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
        const list = await fetchConversations(false);
        if (isCancelled) {
          return;
        }

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
  const [activeSystemPrompt, setActiveSystemPrompt] = useState<string | null>(
    null,
  );
  const [activeAutoLoreEnabled, setActiveAutoLoreEnabled] = useState(true);
  const [activePromptBudgetMode, setActivePromptBudgetMode] =
    useState<PromptBudgetMode>("balanced");
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [activeCharacterSheetId, setActiveCharacterSheetId] = useState<
    string | null
  >(null);
  const [activeLoreEntries, setActiveLoreEntries] = useState<
    ConversationLoreEntryItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeTitle = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeId)?.title ??
      null,
    [activeId, conversations],
  );

  const clearActiveConversation = useCallback(() => {
    setActiveId(null);
    setActiveSystemPrompt(null);
    setActiveAutoLoreEnabled(true);
    setActivePromptBudgetMode("balanced");
    setActiveModel(null);
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
    setActiveModel(detail.model);
    setActiveCharacterSheetId(detail.characterSheetId);
    setActiveLoreEntries(loreEntries);
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, detail.id);
  }, []);

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

  const loadConversations = useCallback(async () => {
    setConversations(await fetchConversations(showArchived));
  }, [showArchived]);

  const createConversation = useCallback(
    async (title?: string, options?: CreateConversationOptions) => {
      const body: { title?: string; model?: string | null } = {};
      if (title) {
        body.title = title;
      }
      if (options?.model !== undefined) {
        body.model = options.model;
      }

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await parseOrThrow<ConversationListItem>(
        response,
        "Unable to create conversation",
      );

      setConversations(await fetchConversations(showArchived));
      if (options?.select !== false) {
        await selectConversation(created.id);
      }
      return created.id;
    },
    [selectConversation, showArchived],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await parseOrThrow<ConversationMeta>(
        response,
        "Unable to rename conversation",
      );
      setConversations(await fetchConversations(showArchived));
    },
    [showArchived],
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

      const list = await fetchConversations(showArchived);
      setConversations(list);
      if (activeId !== id) {
        return;
      }

      const nextConversation = list[0];
      if (!nextConversation) {
        clearActiveConversation();
        return;
      }

      await selectConversation(nextConversation.id);
    },
    [activeId, clearActiveConversation, selectConversation, showArchived],
  );

  const updateConversationSettings = useCallback(
    async (id: string, settings: ConversationSettings) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      await parseOrThrow<ConversationMeta>(
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
      if ("model" in settings) {
        setActiveModel(settings.model ?? null);
      }
      if ("characterSheetId" in settings) {
        setActiveCharacterSheetId(settings.characterSheetId ?? null);
      }

      setConversations(await fetchConversations(showArchived));
    },
    [showArchived],
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
      setConversations(await fetchConversations(showArchived));
    },
    [showArchived],
  );

  const saveConversationSettings = useCallback(
    async (id: string, body: UpdateConversationSettingsBody) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await parseOrThrow<ConversationMeta>(
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
      if ("model" in body) {
        setActiveModel(body.model ?? null);
      }
      if ("characterSheetId" in body) {
        setActiveCharacterSheetId(body.characterSheetId ?? null);
      }

      setActiveLoreEntries(await fetchConversationLoreEntries(id));
      setConversations(await fetchConversations(showArchived));
    },
    [showArchived],
  );

  const setConversationTags = useCallback(
    async (id: string, tagIds: string[]) => {
      const tags = await putConversationTags(id, tagIds);
      setConversations(await fetchConversations(showArchived));
      return tags;
    },
    [showArchived],
  );

  const setConversationArchived = useCallback(
    async (id: string, archived: boolean) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      await parseOrThrow<ConversationMeta>(
        response,
        "Unable to update archive status",
      );

      if (archived && activeId === id) {
        clearActiveConversation();
      }

      setConversations(await fetchConversations(showArchived));
    },
    [activeId, clearActiveConversation, showArchived],
  );

  const setArchivedVisibility = useCallback(
    async (value: boolean) => {
      setShowArchived(value);
      const list = await fetchConversations(value);
      setConversations(list);
      if (!value && activeId && !list.some((item) => item.id === activeId)) {
        clearActiveConversation();
      }
    },
    [activeId, clearActiveConversation],
  );

  return {
    conversations,
    activeId,
    activeTitle,
    activeSystemPrompt,
    activeAutoLoreEnabled,
    activePromptBudgetMode,
    activeModel,
    activeCharacterSheetId,
    activeLoreEntries,
    isLoading,
    isHydrated,
    showArchived,
    loadConversations: () => withLoading(loadConversations),
    selectConversation: (id: string) =>
      withLoading(() => selectConversation(id)),
    createConversation: (title?: string, options?: CreateConversationOptions) =>
      withLoading(() => createConversation(title, options)),
    renameConversation: (id: string, title: string) =>
      withLoading(() => renameConversation(id, title)),
    deleteConversation: (id: string) => withLoading(() => deleteConversation(id)),
    updateConversationSettings: (id: string, settings: ConversationSettings) =>
      withLoading(() => updateConversationSettings(id, settings)),
    updateConversationLoreEntries: (
      id: string,
      body: UpdateConversationLoreEntriesBody,
    ) => withLoading(() => updateConversationLoreEntries(id, body)),
    saveConversationSettings: (id: string, body: UpdateConversationSettingsBody) =>
      withLoading(() => saveConversationSettings(id, body)),
    setConversationTags: (id: string, tagIds: string[]) =>
      withLoading(() => setConversationTags(id, tagIds)),
    setConversationArchived: (id: string, archived: boolean) =>
      withLoading(() => setConversationArchived(id, archived)),
    setArchivedVisibility: (value: boolean) =>
      withLoading(() => setArchivedVisibility(value)),
    clearActiveConversation,
  };
}