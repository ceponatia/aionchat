import { useMemo, useState } from "react";

import { ConversationFilters } from "@/components/sidebar/conversation-filters";
import { ConversationList } from "@/components/sidebar/conversation-list";
import {
  useConversationFilters,
  type ConversationSortMode,
} from "@/lib/hooks/use-conversation-filters";
import type {
  CreateTagBody,
  ConversationListItem,
  TagItem,
  UpdateTagBody,
} from "@/lib/types";

interface SidebarConversationSectionProps {
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
}

export function SidebarConversationSection({
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
}: SidebarConversationSectionProps) {
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
    <>
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
    </>
  );
}