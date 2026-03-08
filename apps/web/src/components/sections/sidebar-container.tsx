"use client";

import { Sidebar } from "@/components/sidebar/sidebar";
import { useEditor } from "@/lib/providers/editor-provider";
import { useConversation } from "@/lib/providers/conversation-provider";
import { useAppPreferences } from "@/lib/providers/app-preferences-provider";

export function SidebarContainer() {
  const {
    conversations,
    activeId,
    isConversationLoading,
    isHydrated,
    handleNewChat,
    handleSelectConversation,
    handleRenameConversation,
    handleDeleteConversation,
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

  return (
    <Sidebar
      onNewChat={() => {
        void handleNewChat().finally(closeSidebar);
      }}
      conversations={conversations}
      activeId={activeId}
      isLoading={isConversationLoading || !isHydrated}
      onSelectConversation={(id) => {
        void handleSelectConversation(id).finally(closeSidebar);
      }}
      onRenameConversation={handleRenameConversation}
      onDeleteConversation={handleDeleteConversation}
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
