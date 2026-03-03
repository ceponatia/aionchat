"use client";

import { useCallback, useEffect, useState } from "react";

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

// eslint-disable-next-line max-lines-per-function -- root page orchestrates all top-level hooks and layout
export default function HomePage() {
  const {
    conversations,
    activeId,
    activeMessages,
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
    characterSheets,
    isLoading: isCharacterSheetsLoading,
    loadCharacterSheets,
    getCharacterSheet,
    createCharacterSheet,
    updateCharacterSheet,
    deleteCharacterSheet,
  } = useCharacterSheets();

  const {
    messages,
    input,
    isLoading,
    error,
    setInput,
    setError,
    handleSend,
    clearMessages,
  } = useChatMessages({
    activeId,
    activeMessages,
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

  const handleNewChat = useCallback(() => {
    setError(null);
    void (async () => {
      try {
        await createConversation();
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Unable to create conversation",
        );
      } finally {
        setIsSidebarOpen(false);
      }
    })();
  }, [createConversation, setError]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setError(null);
      void (async () => {
        try {
          await selectConversation(id);
        } catch (err: unknown) {
          setError(
            err instanceof Error ? err.message : "Unable to load conversation",
          );
        } finally {
          setIsSidebarOpen(false);
        }
      })();
    },
    [selectConversation, setError],
  );

  const handleRenameConversation = useCallback(
    (id: string, title: string) => {
      setError(null);
      return renameConversation(id, title).catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Unable to rename conversation",
        );
      });
    },
    [renameConversation, setError],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setError(null);
      return deleteConversation(id)
        .then(() => {
          if (id === activeId) clearMessages();
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to delete conversation",
          );
        });
    },
    [deleteConversation, activeId, clearMessages, setError],
  );

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

      <MessageList messages={messages} isLoading={isLoading} />

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
