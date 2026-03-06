"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CharacterSheetEditor } from "@/components/character-sheets/character-sheet-editor";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatShell } from "@/components/chat/chat-shell";
import { ConversationSettings } from "@/components/chat/conversation-settings";
import { MessageList } from "@/components/chat/message-list";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useCharacterSheetEditor } from "@/lib/hooks/use-character-sheet-editor";
import { useCharacterSheets } from "@/lib/hooks/use-character-sheets";
import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useMessages } from "@/lib/hooks/use-messages";

// eslint-disable-next-line max-lines-per-function -- root page orchestrates all top-level hooks and layout
export default function HomePage() {
  const {
    conversations,
    activeId,
    activeTitle,
    activeSystemPrompt,
    activeCharacterSheetId,
    isLoading: isConversationLoading,
    isHydrated,
    createConversation,
    selectConversation,
    loadConversations,
    renameConversation,
    deleteConversation,
    updateConversationSettings,
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
    input,
    isLoading,
    error,
    setInput,
    setError,
    handleSend,
  } = useChatMessages({
    activeId,
    messages,
    setMessages,
    createConversation,
    selectConversation,
    loadConversations,
    renameConversation,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const {
    editingSheet,
    isEditing: isEditingSheet,
    openEditor: openSheetEditor,
    openNewEditor: openNewSheetEditor,
    closeEditor: closeSheetEditor,
  } = useCharacterSheetEditor();

  useEffect(() => {
    void loadCharacterSheets();
  }, [loadCharacterSheets]);

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

  function handleNewChat(): void {
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
  }

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
    [editingSheet, updateCharacterSheet, createCharacterSheet, closeSheetEditor],
  );

  const handleDeleteCharacterSheet = useCallback(async () => {
    if (!editingSheet) return;
    await deleteCharacterSheet(editingSheet.id);
    closeSheetEditor();
  }, [editingSheet, deleteCharacterSheet, closeSheetEditor]);

  const handleSaveSettings = useCallback(
    async (settings: {
      systemPrompt: string | null;
      characterSheetId: string | null;
    }) => {
      if (!activeId) return;
      await updateConversationSettings(activeId, settings);
      setShowSettings(false);
    },
    [activeId, updateConversationSettings],
  );

  const handleClearActive = useCallback(() => {
    clearActiveConversation();
    clearMessages();
    setShowSettings(false);
  }, [clearActiveConversation, clearMessages]);

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
  }, []);

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
        />
      }
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
    >
      <ChatHeader
        activeId={activeId}
        activeTitle={activeTitle}
        onToggleSettings={() => setShowSettings((prev) => !prev)}
        onClearActive={handleClearActive}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {showSettings && activeId ? (
        <ConversationSettings
          systemPrompt={activeSystemPrompt}
          characterSheetId={activeCharacterSheetId}
          characterSheets={characterSheets}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      <MessageList
        messages={messages}
        isLoading={isLoading || isLoadingMessages}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
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
