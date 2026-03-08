"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Sidebar } from "@/components/sidebar/sidebar";
import { useTags } from "@/lib/hooks/use-tags";
import { useAppPreferences } from "@/lib/providers/app-preferences-provider";
import { useConversation } from "@/lib/providers/conversation-provider";
import { useEditor } from "@/lib/providers/editor-provider";

export function SidebarContainer() {
  const {
    conversations,
    activeId,
    isConversationLoading,
    isHydrated,
    showArchived,
    handleNewChat,
    handleSelectConversation,
    handleRenameConversation,
    handleDeleteConversation,
    handleReloadConversations,
    handleSetConversationTags,
    handleSetConversationArchived,
    handleSetArchivedVisibility,
  } = useConversation();
  const {
    characterSheets,
    isCharacterSheetsLoading,
    handleSelectCharacterSheet,
    openNewSheetEditor,
    handleNewCharacterFromTemplate,
    handleImportCharacterSheet,
    loreEntries,
    isLoreEntriesLoading,
    handleSelectLoreEntry,
    openNewLoreEditor,
    handleNewLoreFromTemplate,
    handleImportLoreEntry,
    closeSidebar,
  } = useEditor();
  const { defaultModel, setDefaultModel } = useAppPreferences();
  const {
    tags,
    isLoading: isTagsLoading,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
  } = useTags();

  useEffect(() => {
    void loadTags().catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to load tags";
      toast.error("Could not load tags", {
        description: message,
        duration: 5000,
      });
    });
  }, [loadTags]);

  return (
    <Sidebar
      onNewChat={() => {
        void handleNewChat().finally(closeSidebar);
      }}
      conversations={conversations}
      tags={tags}
      activeId={activeId}
      isLoading={isConversationLoading || !isHydrated}
      isTagsLoading={isTagsLoading}
      showArchived={showArchived}
      onSelectConversation={(id) => {
        void handleSelectConversation(id).finally(closeSidebar);
      }}
      onRenameConversation={handleRenameConversation}
      onDeleteConversation={handleDeleteConversation}
      onReloadConversations={handleReloadConversations}
      onSetConversationTags={handleSetConversationTags}
      onSetConversationArchived={handleSetConversationArchived}
      onSetArchivedVisibility={handleSetArchivedVisibility}
      onCreateTag={async (body) => {
        try {
          await createTag(body);
          await handleReloadConversations();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unable to create tag";
          toast.error("Failed to create tag", {
            description: message,
            duration: 5000,
          });
        }
      }}
      onUpdateTag={async (id, body) => {
        try {
          await updateTag(id, body);
          await handleReloadConversations();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unable to update tag";
          toast.error("Failed to update tag", {
            description: message,
            duration: 5000,
          });
        }
      }}
      onDeleteTag={async (id) => {
        try {
          await deleteTag(id);
          await handleReloadConversations();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unable to delete tag";
          toast.error("Failed to delete tag", {
            description: message,
            duration: 5000,
          });
        }
      }}
      characterSheets={characterSheets}
      isCharacterSheetsLoading={isCharacterSheetsLoading}
      onSelectCharacterSheet={handleSelectCharacterSheet}
      onNewCharacterSheet={() => openNewSheetEditor()}
      onNewCharacterSheetFromTemplate={handleNewCharacterFromTemplate}
      onImportCharacterSheet={handleImportCharacterSheet}
      loreEntries={loreEntries}
      isLoreEntriesLoading={isLoreEntriesLoading}
      onSelectLoreEntry={handleSelectLoreEntry}
      onNewLoreEntry={() => openNewLoreEditor()}
      onNewLoreEntryFromTemplate={handleNewLoreFromTemplate}
      onImportLoreEntry={handleImportLoreEntry}
      defaultModel={defaultModel}
      onDefaultModelChange={setDefaultModel}
    />
  );
}
