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
import {
  CHARACTER_SHEET_TEMPLATES,
  LORE_ENTRY_TEMPLATES,
} from "@/lib/templates";
import type {
  CharacterSheetExportEnvelope,
  ConversationSummaryState,
  LoreEntryExportEnvelope,
  PromptAssemblyResult,
  PromptPreviewRequestBody,
} from "@/lib/types";

function slugifyForFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "aionchat-export";
}

function triggerJsonDownload(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Selected file is not valid JSON");
  }
}

function chooseTemplateId(
  entityLabel: string,
  templates: Array<{ id: string; name: string; description: string }>,
): string | null {
  const options = templates
    .map((template, index) => {
      return `${index + 1}. ${template.name} (${template.id}) - ${template.description}`;
    })
    .join("\n");

  const selection = window.prompt(
    `Choose a ${entityLabel} template by number or id:\n\n${options}`,
  );
  if (!selection) {
    return null;
  }

  const trimmed = selection.trim();
  const byId = templates.find((template) => template.id === trimmed);
  if (byId) {
    return byId.id;
  }

  const index = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(index) && index >= 1 && index <= templates.length) {
    return templates[index - 1]?.id ?? null;
  }

  throw new Error(`Unknown ${entityLabel} template selection`);
}

// eslint-disable-next-line max-lines-per-function, complexity -- root page orchestrates all top-level hooks and layout
export default function HomePage() {
  const {
    conversations,
    activeId,
    activeTitle,
    activeSystemPrompt,
    activeAutoLoreEnabled,
    activePromptBudgetMode,
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
    importCharacterSheet,
  } = useCharacterSheets();

  const {
    loreEntries,
    isLoading: isLoreEntriesLoading,
    loadLoreEntries,
    getLoreEntry,
    createLoreEntry,
    updateLoreEntry,
    deleteLoreEntry,
    importLoreEntry,
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
    newSheetDraft,
    isEditing: isEditingSheet,
    openEditor: openSheetEditor,
    openNewEditor: openNewSheetEditor,
    closeEditor: closeSheetEditor,
  } = useCharacterSheetEditor();
  const {
    editingLoreEntry,
    newLoreEntryDraft,
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

  const handleNewCharacterFromTemplate = useCallback(() => {
    try {
      const selectedId = chooseTemplateId(
        "character",
        CHARACTER_SHEET_TEMPLATES,
      );
      if (!selectedId) {
        return;
      }

      const template = CHARACTER_SHEET_TEMPLATES.find(
        (candidate) => candidate.id === selectedId,
      );
      if (!template) {
        throw new Error("Selected template was not found");
      }

      openNewSheetEditor(template.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load character template";
      toast.error("Template selection failed", {
        description: message,
        duration: 5000,
      });
    }
  }, [openNewSheetEditor]);

  const handleImportCharacterSheet = useCallback(
    (file: File) => {
      void (async () => {
        try {
          const payload = (await readJsonFile(
            file,
          )) as CharacterSheetExportEnvelope;
          const createdId = await importCharacterSheet(payload);
          toast.success("Character sheet imported", {
            description: "A new character sheet record was created.",
            duration: 4000,
          });
          const imported = await getCharacterSheet(createdId);
          openSheetEditor(imported);
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to import character sheet";
          toast.error("Character import failed", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getCharacterSheet, importCharacterSheet, openSheetEditor],
  );

  const handleExportCharacterSheet = useCallback(() => {
    if (!editingSheet) {
      return;
    }

    const envelope: CharacterSheetExportEnvelope = {
      version: 1,
      type: "character-sheet",
      exportedAt: new Date().toISOString(),
      data: {
        name: editingSheet.name,
        tagline: editingSheet.tagline,
        personality: editingSheet.personality,
        background: editingSheet.background,
        appearance: editingSheet.appearance,
        scenario: editingSheet.scenario,
        customInstructions: editingSheet.customInstructions,
      },
    };

    triggerJsonDownload(
      `${slugifyForFilename(editingSheet.name)}.character-sheet.json`,
      envelope,
    );
  }, [editingSheet]);

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

  const handleNewLoreFromTemplate = useCallback(() => {
    try {
      const selectedId = chooseTemplateId("lore entry", LORE_ENTRY_TEMPLATES);
      if (!selectedId) {
        return;
      }

      const template = LORE_ENTRY_TEMPLATES.find(
        (candidate) => candidate.id === selectedId,
      );
      if (!template) {
        throw new Error("Selected template was not found");
      }

      openNewLoreEditor(template.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to load lore template";
      toast.error("Template selection failed", {
        description: message,
        duration: 5000,
      });
    }
  }, [openNewLoreEditor]);

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

  const handleImportLoreEntry = useCallback(
    (file: File) => {
      void (async () => {
        try {
          const payload = (await readJsonFile(file)) as LoreEntryExportEnvelope;
          const createdId = await importLoreEntry(payload);
          toast.success("Lore entry imported", {
            description: "A new lore entry record was created.",
            duration: 4000,
          });
          const imported = await getLoreEntry(createdId);
          openLoreEditor(imported);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Unable to import lore entry";
          toast.error("Lore import failed", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getLoreEntry, importLoreEntry, openLoreEditor],
  );

  const handleExportLoreEntry = useCallback(() => {
    if (!editingLoreEntry) {
      return;
    }

    const envelope: LoreEntryExportEnvelope = {
      version: 1,
      type: "lore-entry",
      exportedAt: new Date().toISOString(),
      data: {
        title: editingLoreEntry.title,
        type: editingLoreEntry.type,
        tags: editingLoreEntry.tags,
        body: editingLoreEntry.body,
        activationHints: editingLoreEntry.activationHints,
        isGlobal: editingLoreEntry.isGlobal,
      },
    };

    triggerJsonDownload(
      `${slugifyForFilename(editingLoreEntry.title)}.lore-entry.json`,
      envelope,
    );
  }, [editingLoreEntry]);

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
      promptBudgetMode: "balanced" | "aggressive";
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
          promptBudgetMode: settings.promptBudgetMode,
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

    if (showPromptInspector || showSettings) {
      refreshPromptPreviewForCurrentState();
    }
  }, [
    activeId,
    messages.length,
    showPromptInspector,
    showSettings,
    showSummary,
  ]);

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
        initialDraft={newSheetDraft}
        onSave={handleSaveCharacterSheet}
        onDelete={editingSheet ? handleDeleteCharacterSheet : null}
        onExport={editingSheet ? handleExportCharacterSheet : null}
        onCancel={closeSheetEditor}
      />
    );
  }

  if (isEditingLoreEntry) {
    return (
      <LoreEntryEditor
        key={editingLoreEntry?.id ?? "new"}
        entry={editingLoreEntry}
        initialDraft={newLoreEntryDraft}
        onSave={handleSaveLoreEntry}
        onDelete={editingLoreEntry ? handleDeleteLoreEntry : null}
        onExport={editingLoreEntry ? handleExportLoreEntry : null}
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
          onNewCharacterSheetFromTemplate={handleNewCharacterFromTemplate}
          onImportCharacterSheet={handleImportCharacterSheet}
          loreEntries={loreEntries}
          isLoreEntriesLoading={isLoreEntriesLoading}
          onSelectLoreEntry={handleSelectLoreEntry}
          onNewLoreEntry={openNewLoreEditor}
          onNewLoreEntryFromTemplate={handleNewLoreFromTemplate}
          onImportLoreEntry={handleImportLoreEntry}
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
          promptBudgetMode={activePromptBudgetMode}
          budgetReport={promptPreview?.budget ?? null}
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

      {activeId && promptPreview ? (
        promptPreview.budget.overBudget ? (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100 sm:px-6">
            Context is still over budget after deterministic trimming. Reduce
            the system prompt or character sheet content to avoid request
            pressure.
          </div>
        ) : promptPreview.budget.omittedSegmentIds.length > 0 ? (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 sm:px-6">
            Context was trimmed for this turn.{" "}
            {promptPreview.budget.omittedSegmentIds.length} optional segment(s)
            were omitted.
          </div>
        ) : null
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
