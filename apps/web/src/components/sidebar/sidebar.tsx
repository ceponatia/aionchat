import { useMemo, useState } from "react";

import { AppSettings } from "@/components/sidebar/app-settings";
import { CharacterSheetList } from "@/components/character-sheets/character-sheet-list";
import { ConversationFilters } from "@/components/sidebar/conversation-filters";
import { LoreEntryList } from "@/components/lorebook/lore-entry-list";
import { ConversationList } from "@/components/sidebar/conversation-list";
import { SidebarHeader } from "@/components/sidebar/sidebar-header";
import {
  useConversationFilters,
  type ConversationSortMode,
} from "@/lib/hooks/use-conversation-filters";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<ConversationSortMode>("recent");

  const effectiveSelectedTagIds = useMemo(() => {
    const validTagIds = new Set(tags.map((tag) => tag.id));
    return selectedTagIds.filter((tagId) => validTagIds.has(tagId));
  }, [selectedTagIds, tags]);

  const filteredConversations = useConversationFilters({
    conversations,
    searchQuery,
    selectedTagIds: effectiveSelectedTagIds,
    showArchived,
    sortMode,
  });

  const hasActiveFilters = useMemo(
    () =>
      searchQuery.trim().length > 0 ||
      effectiveSelectedTagIds.length > 0 ||
      sortMode !== "recent" ||
      showArchived,
    [effectiveSelectedTagIds.length, searchQuery, showArchived, sortMode],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader onNewChat={onNewChat} />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <ConversationFilters
          searchQuery={searchQuery}
          sortMode={sortMode}
          showArchived={showArchived}
          tags={tags}
          isTagsLoading={isTagsLoading}
          selectedTagIds={effectiveSelectedTagIds}
          hasActiveFilters={hasActiveFilters}
          onSearchQueryChange={setSearchQuery}
          onSortModeChange={setSortMode}
          onToggleTagFilter={(tagId) => {
            setSelectedTagIds((current) =>
              current.includes(tagId)
                ? current.filter((value) => value !== tagId)
                : [...current, tagId],
            );
          }}
          onClearFilters={() => {
            setSearchQuery("");
            setSelectedTagIds([]);
            setSortMode("recent");
            void onSetArchivedVisibility(false);
          }}
          onSetArchivedVisibility={onSetArchivedVisibility}
          onCreateTag={onCreateTag}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
        />
        <ConversationList
          conversations={filteredConversations}
          allTags={tags}
          activeId={activeId}
          isLoading={isLoading}
          onSelect={onSelectConversation}
          onRename={onRenameConversation}
          onDelete={onDeleteConversation}
          onSetTags={onSetConversationTags}
          onSetArchived={onSetConversationArchived}
          onReloadConversations={onReloadConversations}
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
