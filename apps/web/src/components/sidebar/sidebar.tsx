import { CharacterSheetList } from "@/components/character-sheets/character-sheet-list";
import { LoreEntryList } from "@/components/lorebook/lore-entry-list";
import { ConversationList } from "@/components/sidebar/conversation-list";
import { SidebarHeader } from "@/components/sidebar/sidebar-header";
import type {
  CharacterSheetListItem,
  ConversationListItem,
  LoreEntryListItem,
} from "@/lib/types";

interface SidebarProps {
  onNewChat: () => void;
  conversations: ConversationListItem[];
  activeId: string | null;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  characterSheets: CharacterSheetListItem[];
  isCharacterSheetsLoading: boolean;
  onSelectCharacterSheet: (id: string) => void;
  onNewCharacterSheet: () => void;
  loreEntries: LoreEntryListItem[];
  isLoreEntriesLoading: boolean;
  onSelectLoreEntry: (id: string) => void;
  onNewLoreEntry: () => void;
}

export function Sidebar({
  onNewChat,
  conversations,
  activeId,
  isLoading,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  characterSheets,
  isCharacterSheetsLoading,
  onSelectCharacterSheet,
  onNewCharacterSheet,
  loreEntries,
  isLoreEntriesLoading,
  onSelectLoreEntry,
  onNewLoreEntry,
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader onNewChat={onNewChat} />
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        isLoading={isLoading}
        onSelect={onSelectConversation}
        onRename={onRenameConversation}
        onDelete={onDeleteConversation}
      />
      <CharacterSheetList
        characterSheets={characterSheets}
        isLoading={isCharacterSheetsLoading}
        onSelect={onSelectCharacterSheet}
        onNew={onNewCharacterSheet}
      />
      <LoreEntryList
        loreEntries={loreEntries}
        isLoading={isLoreEntriesLoading}
        onSelect={onSelectLoreEntry}
        onNew={onNewLoreEntry}
      />
    </div>
  );
}
