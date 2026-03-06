/* eslint-disable max-lines */
"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { CharacterSheetEditor } from "@/components/character-sheets/character-sheet-editor";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { PromptInspector } from "@/components/chat/prompt-inspector";
import { ChatShell } from "@/components/chat/chat-shell";
import { ConversationSettings } from "@/components/chat/conversation-settings";
import { SummaryPanel } from "@/components/chat/summary-panel";
import { LoreEntryEditor } from "@/components/lorebook/lore-entry-editor";
import { MessageList } from "@/components/chat/message-list";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useCharacterSheetEditor } from "@/lib/hooks/use-character-sheet-editor";
import { useCharacterSheets } from "@/lib/hooks/use-character-sheets";
import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { useLoreEntries } from "@/lib/hooks/use-lore-entries";
import { useLoreEntryEditor } from "@/lib/hooks/use-lore-entry-editor";
import { useMessageOperations } from "@/lib/hooks/use-message-operations";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useMessages } from "@/lib/hooks/use-messages";
import type {
  ConversationSummaryState,
  PromptAssemblyResult,
  PromptPreviewRequestBody,
} from "@/lib/types";

// eslint-disable-next-line max-lines-per-function, complexity -- root page orchestrates all top-level hooks and layout
export default function HomePage() {
  const {
    conversations,
    activeId,
    activeTitle,
    activeSystemPrompt,
    activeAutoLoreEnabled,
    activeCharacterSheetId,
    activeLoreEntries,
    isLoading: isConversationLoading,
    isHydrated,
    createConversation,
    selectConversation,
    loadConversations,
    renameConversation,
    deleteConversation,
    saveConversationSettings,
    clearActiveConversation,
  } = useConversations();

  const {
    messages,
    hasMore,
    isLoadingMessages,
    isLoadingMore,
    loadMessages,
    loadMore,
    clearMessages,
    setMessages,
  } = useMessages();

  const {
    characterSheets,
    isLoading: isCharacterSheetsLoading,
    loadCharacterSheets,
    getCharacterSheet,
    createCharacterSheet,
    updateCharacterSheet,
    deleteCharacterSheet,
  } = useCharacterSheets();

  const {
    loreEntries,
    isLoading: isLoreEntriesLoading,
    loadLoreEntries,
    getLoreEntry,
    createLoreEntry,
    updateLoreEntry,
    deleteLoreEntry,
  } = useLoreEntries();

  const { input, isLoading, error, setInput, setError, handleSend } =
    useChatMessages({
      activeId,
      messages,
      setMessages,
      createConversation,
      selectConversation,
      loadConversations,
      renameConversation,
    });

  const {
    isOperating: isMessageOperationPending,
    pendingAssistantPlacement,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleBranchMessage,
  } = useMessageOperations({
    activeId,
    messages,
    setMessages,
    loadConversations,
    loadMessages,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const [summaryState, setSummaryState] =
    useState<ConversationSummaryState | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const activeConversationIdRef = useRef<string | null>(activeId);
  const summaryRequestIdRef = useRef(0);
  const isSummaryLoadingRef = useRef(false);
  const [promptPreview, setPromptPreview] =
    useState<PromptAssemblyResult | null>(null);
  const [promptPreviewDraft, setPromptPreviewDraft] = useState("");
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(
    null,
  );
  const [isPromptPreviewLoading, setIsPromptPreviewLoading] = useState(false);
  const loreSelectionRequestIdRef = useRef(0);
  const {
    editingSheet,
    isEditing: isEditingSheet,
    openEditor: openSheetEditor,
    openNewEditor: openNewSheetEditor,
    closeEditor: closeSheetEditor,
  } = useCharacterSheetEditor();
  const {
    editingLoreEntry,
    isEditing: isEditingLoreEntry,
    openEditor: openLoreEditor,
    openNewEditor: openNewLoreEditor,
    closeEditor: closeLoreEditor,
  } = useLoreEntryEditor();

  useEffect(() => {
    activeConversationIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    void loadCharacterSheets();
  }, [loadCharacterSheets]);

  useEffect(() => {
    void loadLoreEntries();
  }, [loadLoreEntries]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!activeId) {
      clearMessages();
      return;
    }

    void loadMessages(activeId).catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Unable to load messages";
      toast.error("Could not load messages", {
        description: message,
        duration: 5000,
      });
    });
  }, [activeId, clearMessages, isHydrated, loadMessages]);

  const handleNewChat = useCallback((): void => {
    setInput("");

    void (async () => {
      try {
        await createConversation();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to create conversation";
        toast.error("Failed to create conversation", {
          description: message,
          duration: 5000,
        });
      } finally {
        setIsSidebarOpen(false);
      }
    })();
  }, [createConversation, setInput]);

  function handleSelectConversation(id: string): void {
    void (async () => {
      try {
        await selectConversation(id);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to load conversation";
        toast.error("Could not load conversation", {
          description: message,
          duration: 5000,
        });
      } finally {
        setIsSidebarOpen(false);
      }
    })();
  }

  function handleRenameConversation(id: string, title: string): Promise<void> {
    return renameConversation(id, title).catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Unable to rename conversation";
      toast.error("Failed to rename conversation", {
        description: message,
        duration: 5000,
      });
    });
  }

  function handleDeleteConversation(id: string): Promise<void> {
    return deleteConversation(id)
      .then(() => {
        if (id === activeId) {
          clearMessages();
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Unable to delete conversation";
        toast.error("Failed to delete conversation", {
          description: message,
          duration: 5000,
        });
      });
  }

  const handleSelectCharacterSheet = useCallback(
    (id: string) => {
      void (async () => {
        try {
          const sheet = await getCharacterSheet(id);
          openSheetEditor(sheet);
        } catch (err: unknown) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load character sheet",
          );
        }
      })();
    },
    [getCharacterSheet, openSheetEditor, setError],
  );

  const handleSaveCharacterSheet = useCallback(
    async (data: {
      name: string;
      tagline: string | null;
      personality: string | null;
      background: string | null;
      appearance: string | null;
      scenario: string | null;
      customInstructions: string | null;
    }) => {
      if (editingSheet) {
        await updateCharacterSheet(editingSheet.id, data);
      } else {
        await createCharacterSheet(data);
      }
      closeSheetEditor();
    },
    [
      editingSheet,
      updateCharacterSheet,
      createCharacterSheet,
      closeSheetEditor,
    ],
  );

  const handleDeleteCharacterSheet = useCallback(async () => {
    if (!editingSheet) return;
    await deleteCharacterSheet(editingSheet.id);
    closeSheetEditor();
  }, [editingSheet, deleteCharacterSheet, closeSheetEditor]);

  const handleSelectLoreEntry = useCallback(
    (id: string) => {
      void (async () => {
        const requestId = loreSelectionRequestIdRef.current + 1;
        loreSelectionRequestIdRef.current = requestId;

        try {
          const entry = await getLoreEntry(id);
          if (loreSelectionRequestIdRef.current !== requestId) {
            return;
          }
          openLoreEditor(entry);
        } catch (err: unknown) {
          if (loreSelectionRequestIdRef.current !== requestId) {
            return;
          }
          const message =
            err instanceof Error ? err.message : "Unable to load lore entry";
          setError(message);
          toast.error("Could not load lore entry", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getLoreEntry, openLoreEditor, setError],
  );

  const handleSaveLoreEntry = useCallback(
    async (data: {
      title: string;
      type:
        | "world"
        | "location"
        | "faction"
        | "npc"
        | "item"
        | "rule"
        | "other";
      tags: string[];
      body: string;
      activationHints: string[];
      isGlobal: boolean;
    }) => {
      try {
        if (editingLoreEntry) {
          await updateLoreEntry(editingLoreEntry.id, data);
        } else {
          await createLoreEntry(data);
        }
        closeLoreEditor();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to save lore entry";
        toast.error("Failed to save lore entry", {
          description: message,
          duration: 5000,
        });
      }
    },
    [editingLoreEntry, updateLoreEntry, createLoreEntry, closeLoreEditor],
  );

  const handleDeleteLoreEntry = useCallback(async () => {
    if (!editingLoreEntry) return;
    try {
      await deleteLoreEntry(editingLoreEntry.id);
      if (activeId) {
        await selectConversation(activeId);
      }
      closeLoreEditor();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to delete lore entry";
      toast.error("Failed to delete lore entry", {
        description: message,
        duration: 5000,
      });
    }
  }, [
    activeId,
    closeLoreEditor,
    deleteLoreEntry,
    editingLoreEntry,
    selectConversation,
  ]);

  const handleSaveSettings = useCallback(
    async (settings: {
      systemPrompt: string | null;
      autoLoreEnabled: boolean;
      characterSheetId: string | null;
      loreEntries: Array<{
        loreEntryId: string;
        pinned: boolean;
        priority: number;
      }>;
    }) => {
      if (!activeId) return;
      try {
        await saveConversationSettings(activeId, {
          systemPrompt: settings.systemPrompt,
          autoLoreEnabled: settings.autoLoreEnabled,
          characterSheetId: settings.characterSheetId,
          loreEntries: settings.loreEntries,
        });
        setShowSettings(false);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to save conversation settings";

        toast.error("Failed to save conversation settings", {
          description: message,
          duration: 5000,
        });
      }
    },
    [activeId, saveConversationSettings],
  );

  const handleClearActive = useCallback(() => {
    clearActiveConversation();
    clearMessages();
    setShowSettings(false);
    setShowSummary(false);
    setShowPromptInspector(false);
    setSummaryState(null);
    setSummaryError(null);
    setPromptPreview(null);
    setPromptPreviewDraft("");
    setPromptPreviewError(null);
  }, [clearActiveConversation, clearMessages]);

  const loadSummaryState = useCallback(async (conversationId: string) => {
    const requestId = summaryRequestIdRef.current + 1;
    summaryRequestIdRef.current = requestId;
    isSummaryLoadingRef.current = true;
    setIsSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/summary`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? "Unable to load conversation summary",
        );
      }

      const state = (await response.json()) as ConversationSummaryState;
      if (
        summaryRequestIdRef.current !== requestId ||
        activeConversationIdRef.current !== conversationId
      ) {
        return;
      }
      setSummaryState(state);
    } catch (err: unknown) {
      if (
        summaryRequestIdRef.current !== requestId ||
        activeConversationIdRef.current !== conversationId
      ) {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load conversation summary";
      setSummaryError(message);
    } finally {
      if (summaryRequestIdRef.current === requestId) {
        isSummaryLoadingRef.current = false;
        setIsSummaryLoading(false);
      }
    }
  }, []);

  const refreshConversationSummary = useCallback(
    async (conversationId: string) => {
      if (isSummaryLoadingRef.current) {
        return;
      }

      isSummaryLoadingRef.current = true;
      setIsSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/summary/refresh`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          await loadSummaryState(conversationId);
          return;
        }

        await loadSummaryState(conversationId);
      } catch (err: unknown) {
        if (activeConversationIdRef.current === conversationId) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to refresh conversation summary";
          setSummaryError(message);
        }
      } finally {
        isSummaryLoadingRef.current = false;
        if (activeConversationIdRef.current === conversationId) {
          setIsSummaryLoading(false);
        }
      }
    },
    [loadSummaryState],
  );

  const loadPromptPreview = useCallback(
    async (conversationId: string, draftContent: string) => {
      setIsPromptPreviewLoading(true);
      setPromptPreviewError(null);

      try {
        const body: PromptPreviewRequestBody = { content: draftContent };
        const response = await fetch(
          `/api/conversations/${conversationId}/prompt-preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Unable to load prompt preview");
        }

        const preview = (await response.json()) as PromptAssemblyResult;
        setPromptPreview(preview);
        setPromptPreviewDraft(draftContent);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to load prompt preview";
        setPromptPreviewError(message);
      } finally {
        setIsPromptPreviewLoading(false);
      }
    },
    [],
  );

  const refreshPromptPreviewForCurrentState = useEffectEvent(() => {
    if (!activeId) {
      return;
    }

    void loadPromptPreview(activeId, input);
  });

  const refreshSummaryStateForCurrentConversation = useEffectEvent(() => {
    if (!activeId) {
      return;
    }

    void loadSummaryState(activeId);
  });

  useEffect(() => {
    if (!activeId) {
      setShowSummary(false);
      setShowPromptInspector(false);
      setSummaryState(null);
      setSummaryError(null);
      setPromptPreview(null);
      setPromptPreviewDraft("");
      setPromptPreviewError(null);
      return;
    }

    if (showSummary) {
      refreshSummaryStateForCurrentConversation();
    }

    if (showPromptInspector) {
      refreshPromptPreviewForCurrentState();
    }
  }, [activeId, messages.length, showPromptInspector, showSummary]);

  const handleToggleSummary = useCallback(() => {
    if (!activeId) {
      return;
    }

    if (showSummary) {
      setShowSummary(false);
      return;
    }

    setShowSettings(false);
    setShowPromptInspector(false);
    setShowSummary(true);
    void loadSummaryState(activeId);
  }, [activeId, loadSummaryState, showSummary]);

  const handleRefreshSummary = useCallback(() => {
    if (!activeId) {
      return;
    }

    void refreshConversationSummary(activeId);
  }, [activeId, refreshConversationSummary]);

  const handleTogglePromptInspector = useCallback(() => {
    if (!activeId) {
      return;
    }

    if (showPromptInspector) {
      setShowPromptInspector(false);
      return;
    }

    setShowSettings(false);
    setShowSummary(false);
    setShowPromptInspector(true);
    void loadPromptPreview(activeId, input);
  }, [activeId, input, loadPromptPreview, showPromptInspector]);

  const handleRefreshPromptInspector = useCallback(() => {
    if (!activeId) {
      return;
    }

    void loadPromptPreview(activeId, input);
  }, [activeId, input, loadPromptPreview]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        const target = event.target;
        let isEditable = false;

        if (target instanceof HTMLElement) {
          const tagName = target.tagName;
          isEditable =
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            target.isContentEditable;
        } else if (document.activeElement instanceof HTMLElement) {
          const activeElement = document.activeElement;
          const tagName = activeElement.tagName;
          isEditable =
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            activeElement.isContentEditable;
        }
        if (!isEditable) {
          event.preventDefault();
          handleNewChat();
        }
      }

      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [handleNewChat]);

  if (isEditingSheet) {
    return (
      <CharacterSheetEditor
        key={editingSheet?.id ?? "new"}
        sheet={editingSheet}
        onSave={handleSaveCharacterSheet}
        onDelete={editingSheet ? handleDeleteCharacterSheet : null}
        onCancel={closeSheetEditor}
      />
    );
  }

  if (isEditingLoreEntry) {
    return (
      <LoreEntryEditor
        key={editingLoreEntry?.id ?? "new"}
        entry={editingLoreEntry}
        onSave={handleSaveLoreEntry}
        onDelete={editingLoreEntry ? handleDeleteLoreEntry : null}
        onCancel={closeLoreEditor}
      />
    );
  }

  return (
    <ChatShell
      sidebar={
        <Sidebar
          onNewChat={handleNewChat}
          conversations={conversations}
          activeId={activeId}
          isLoading={isConversationLoading || !isHydrated}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          characterSheets={characterSheets}
          isCharacterSheetsLoading={isCharacterSheetsLoading}
          onSelectCharacterSheet={handleSelectCharacterSheet}
          onNewCharacterSheet={openNewSheetEditor}
          loreEntries={loreEntries}
          isLoreEntriesLoading={isLoreEntriesLoading}
          onSelectLoreEntry={handleSelectLoreEntry}
          onNewLoreEntry={openNewLoreEditor}
        />
      }
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
    >
      <ChatHeader
        activeId={activeId}
        activeTitle={activeTitle}
        onToggleSummary={handleToggleSummary}
        onTogglePromptInspector={handleTogglePromptInspector}
        onToggleSettings={() => {
          setShowSummary(false);
          setShowPromptInspector(false);
          setShowSettings((prev) => !prev);
        }}
        onClearActive={handleClearActive}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {showSettings && activeId ? (
        <ConversationSettings
          key={activeId}
          systemPrompt={activeSystemPrompt}
          autoLoreEnabled={activeAutoLoreEnabled}
          characterSheetId={activeCharacterSheetId}
          characterSheets={characterSheets}
          loreEntries={loreEntries}
          attachedLoreEntries={activeLoreEntries}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      {showSummary && activeId ? (
        <SummaryPanel
          state={summaryState}
          error={summaryError}
          isLoading={isSummaryLoading}
          onRefresh={handleRefreshSummary}
          onClose={() => setShowSummary(false)}
        />
      ) : null}

      {showPromptInspector && activeId ? (
        <PromptInspector
          assembly={promptPreview}
          currentDraft={input}
          previewDraft={promptPreviewDraft}
          error={promptPreviewError}
          isLoading={isPromptPreviewLoading}
          onRefresh={handleRefreshPromptInspector}
          onClose={() => setShowPromptInspector(false)}
        />
      ) : null}

      <MessageList
        messages={messages}
        isLoading={isLoading || isLoadingMessages}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        isActionsDisabled={
          isLoading || isLoadingMessages || isMessageOperationPending
        }
        pendingAssistantPlacement={pendingAssistantPlacement}
        onLoadMore={loadMore}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onBranchMessage={handleBranchMessage}
        hasAnyConversations={conversations.length > 0}
      />

      {error ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 text-xs text-rose-300 sm:px-6">
          {error}
        </div>
      ) : null}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </ChatShell>
  );
}
