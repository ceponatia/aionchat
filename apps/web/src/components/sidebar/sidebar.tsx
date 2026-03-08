import { AppSettings } from "@/components/sidebar/app-settings";
import { CharacterSheetList } from "@/components/character-sheets/character-sheet-list";
import { LoreEntryList } from "@/components/lorebook/lore-entry-list";
import { SidebarConversationSection } from "@/components/sidebar/sidebar-conversation-section";
import { SidebarHeader } from "@/components/sidebar/sidebar-header";
import type {
  CharacterSheetListItem,
  CreateTagBody,
  ConversationListItem,
  LoreEntryListItem,
  TagItem,
  UpdateTagBody,
} from "@/lib/types";

interface SidebarProps {
  onNewChat: () => void;
  conversations: ConversationListItem[];
  tags: TagItem[];
  activeId: string | null;
  isLoading: boolean;
  isTagsLoading: boolean;
  showArchived: boolean;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  onReloadConversations: () => Promise<void>;
  onSetConversationTags: (id: string, tagIds: string[]) => Promise<void>;
  onSetConversationArchived: (id: string, archived: boolean) => Promise<void>;
  onSetArchivedVisibility: (value: boolean) => Promise<void>;
  onCreateTag: (body: CreateTagBody) => Promise<void>;
  onUpdateTag: (id: string, body: UpdateTagBody) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
  characterSheets: CharacterSheetListItem[];
  isCharacterSheetsLoading: boolean;
  onSelectCharacterSheet: (id: string) => void;
  onNewCharacterSheet: () => void;
  onNewCharacterSheetFromTemplate: () => void;
  onImportCharacterSheet: (file: File) => void;
  loreEntries: LoreEntryListItem[];
  isLoreEntriesLoading: boolean;
  onSelectLoreEntry: (id: string) => void;
  onNewLoreEntry: () => void;
  onNewLoreEntryFromTemplate: () => void;
  onImportLoreEntry: (file: File) => void;
  defaultModel: string;
  onDefaultModelChange: (modelId: string) => void;
}

export function Sidebar({
  onNewChat,
  conversations,
  tags,
  activeId,
  isLoading,
  isTagsLoading,
  showArchived,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onReloadConversations,
  onSetConversationTags,
  onSetConversationArchived,
  onSetArchivedVisibility,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  characterSheets,
  isCharacterSheetsLoading,
  onSelectCharacterSheet,
  onNewCharacterSheet,
  onNewCharacterSheetFromTemplate,
  onImportCharacterSheet,
  loreEntries,
  isLoreEntriesLoading,
  onSelectLoreEntry,
  onNewLoreEntry,
  onNewLoreEntryFromTemplate,
  onImportLoreEntry,
  defaultModel,
  onDefaultModelChange,
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader onNewChat={onNewChat} />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <SidebarConversationSection
          conversations={conversations}
          tags={tags}
          activeId={activeId}
          isLoading={isLoading}
          isTagsLoading={isTagsLoading}
          showArchived={showArchived}
          onSelectConversation={onSelectConversation}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
          onReloadConversations={onReloadConversations}
          onSetConversationTags={onSetConversationTags}
          onSetConversationArchived={onSetConversationArchived}
          onSetArchivedVisibility={onSetArchivedVisibility}
          onCreateTag={onCreateTag}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
        />
        <CharacterSheetList
          characterSheets={characterSheets}
          isLoading={isCharacterSheetsLoading}
          onSelect={onSelectCharacterSheet}
          onNew={onNewCharacterSheet}
          onNewFromTemplate={onNewCharacterSheetFromTemplate}
          onImport={onImportCharacterSheet}
        />
        <LoreEntryList
          loreEntries={loreEntries}
          isLoading={isLoreEntriesLoading}
          onSelect={onSelectLoreEntry}
          onNew={onNewLoreEntry}
          onNewFromTemplate={onNewLoreEntryFromTemplate}
          onImport={onImportLoreEntry}
        />
      </div>
      <AppSettings
        defaultModel={defaultModel}
        onDefaultModelChange={onDefaultModelChange}
      />
    </div>
  );
}
