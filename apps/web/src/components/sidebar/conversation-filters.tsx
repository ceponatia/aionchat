import { useState } from "react";

import { TagManagerPanel } from "@/components/sidebar/tag-manager-panel";
import type { ConversationSortMode } from "@/lib/hooks/use-conversation-filters";
import type { CreateTagBody, TagItem, UpdateTagBody } from "@/lib/types";

interface ConversationFiltersProps {
  searchQuery: string;
  sortMode: ConversationSortMode;
  showArchived: boolean;
  tags: TagItem[];
  isTagsLoading: boolean;
  selectedTagIds: string[];
  hasActiveFilters: boolean;
  onSearchQueryChange: (value: string) => void;
  onSortModeChange: (value: ConversationSortMode) => void;
  onToggleTagFilter: (tagId: string) => void;
  onClearFilters: () => void;
  onSetArchivedVisibility: (value: boolean) => Promise<void>;
  onCreateTag: (body: CreateTagBody) => Promise<void>;
  onUpdateTag: (id: string, body: UpdateTagBody) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
}

interface SearchFieldProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

function SearchField({
  searchQuery,
  onSearchQueryChange,
}: SearchFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search conversations"
        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-cyan-300/40"
      />
      {searchQuery ? (
        <button
          type="button"
          className="rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
          onClick={() => onSearchQueryChange("")}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

interface TagFilterChipsProps {
  tags: TagItem[];
  isTagsLoading: boolean;
  selectedTagIds: string[];
  onToggleTagFilter: (tagId: string) => void;
}

function TagFilterChips({
  tags,
  isTagsLoading,
  selectedTagIds,
  onToggleTagFilter,
}: TagFilterChipsProps) {
  if (tags.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);

          return (
            <button
              key={tag.id}
              type="button"
              className={
                isSelected
                  ? "rounded-full border px-3 py-1.5 text-xs font-medium text-foreground"
                  : "rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              }
              style={
                isSelected
                  ? {
                      borderColor: tag.color,
                      backgroundColor: `${tag.color}22`,
                      color: tag.color,
                    }
                  : undefined
              }
              onClick={() => onToggleTagFilter(tag.id)}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    );
  }

  if (isTagsLoading) {
    return <p className="text-xs text-muted-foreground">Loading tags...</p>;
  }

  return null;
}

export function ConversationFilters({
  searchQuery,
  sortMode,
  showArchived,
  tags,
  isTagsLoading,
  selectedTagIds,
  hasActiveFilters,
  onSearchQueryChange,
  onSortModeChange,
  onToggleTagFilter,
  onClearFilters,
  onSetArchivedVisibility,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: ConversationFiltersProps) {
  const [isManagingTags, setIsManagingTags] = useState(false);

  return (
    <section className="glass-panel mb-3 rounded-[28px] px-3 py-3">
      <div className="space-y-3 px-1">
        <SearchField
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="conversation-sort-mode">
            Sort conversations
          </label>
          <select
            id="conversation-sort-mode"
            value={sortMode}
            onChange={(event) =>
              onSortModeChange(event.target.value as ConversationSortMode)
            }
            className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-2 text-xs text-foreground outline-none"
          >
            <option value="recent">Recent</option>
            <option value="alphabetical">A-Z</option>
            <option value="character-sheet">By character</option>
          </select>

          <button
            type="button"
            className={
              showArchived
                ? "rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
                : "rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
            }
            onClick={() => {
              void onSetArchivedVisibility(!showArchived);
            }}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>

          <button
            type="button"
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
            onClick={() => setIsManagingTags((current) => !current)}
          >
            {isManagingTags ? "Close tags" : "Manage tags"}
          </button>

          {hasActiveFilters ? (
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              onClick={onClearFilters}
            >
              Reset filters
            </button>
          ) : null}
        </div>

        <TagFilterChips
          tags={tags}
          isTagsLoading={isTagsLoading}
          selectedTagIds={selectedTagIds}
          onToggleTagFilter={onToggleTagFilter}
        />

        {isManagingTags ? (
          <TagManagerPanel
            tags={tags}
            onCreateTag={onCreateTag}
            onUpdateTag={onUpdateTag}
            onDeleteTag={onDeleteTag}
          />
        ) : null}
      </div>
    </section>
  );
}