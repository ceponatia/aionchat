import { useState } from "react";

import type { ConversationSortMode } from "@/lib/hooks/use-conversation-filters";
import type { CreateTagBody, TagItem, UpdateTagBody } from "@/lib/types";

const TAG_COLOR_OPTIONS = [
  "#38bdf8",
  "#2dd4bf",
  "#84cc16",
  "#f59e0b",
  "#fb7185",
  "#f97316",
  "#a78bfa",
  "#facc15",
];

const DEFAULT_TAG_COLOR = "#38bdf8";

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

function TagColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLOR_OPTIONS.map((color) => (
        <button
          key={color}
          type="button"
          className={
            value === color
              ? "h-6 w-6 rounded-full ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950"
              : "h-6 w-6 rounded-full ring-1 ring-white/10"
          }
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`Select ${color} tag color`}
        />
      ))}
    </div>
  );
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
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState(DEFAULT_TAG_COLOR);

  return (
    <section className="glass-panel mb-3 rounded-[28px] px-3 py-3">
      <div className="space-y-3 px-1">
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

        {tags.length > 0 ? (
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
        ) : isTagsLoading ? (
          <p className="text-xs text-muted-foreground">Loading tags...</p>
        ) : null}

        {isManagingTags ? (
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-3">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Create tag
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    value={newTagName}
                    onChange={(event) => setNewTagName(event.target.value)}
                    placeholder="Campaign, Archived, Investigations"
                    className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-cyan-300/40"
                  />
                  <TagColorPicker value={newTagColor} onChange={setNewTagColor} />
                  <button
                    type="button"
                    className="rounded-full border border-cyan-200/20 bg-linear-to-r from-cyan-200 via-sky-300 to-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950"
                    onClick={() => {
                      const name = newTagName.trim();
                      if (!name) {
                        return;
                      }
                      void onCreateTag({ name, color: newTagColor }).then(() => {
                        setNewTagName("");
                        setNewTagColor(DEFAULT_TAG_COLOR);
                      });
                    }}
                  >
                    Create tag
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Existing tags
                </p>
                {tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tags yet.</p>
                ) : null}
                {tags.map((tag) => {
                  const isEditing = editingTagId === tag.id;
                  return (
                    <div
                      key={tag.id}
                      className="rounded-2xl border border-white/10 bg-white/4 p-3"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editingTagName}
                            onChange={(event) => setEditingTagName(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-300/40"
                          />
                          <TagColorPicker
                            value={editingTagColor}
                            onChange={setEditingTagColor}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-full border border-cyan-200/20 bg-linear-to-r from-cyan-200 via-sky-300 to-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-950"
                              onClick={() => {
                                const name = editingTagName.trim();
                                if (!name) {
                                  return;
                                }
                                void onUpdateTag(tag.id, {
                                  name,
                                  color: editingTagColor,
                                }).then(() => {
                                  setEditingTagId(null);
                                });
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                              onClick={() => setEditingTagId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                              style={{
                                borderColor: tag.color,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                              onClick={() => {
                                setEditingTagId(tag.id);
                                setEditingTagName(tag.name);
                                setEditingTagColor(tag.color);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-rose-400/20 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-400/10"
                              onClick={() => {
                                void onDeleteTag(tag.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}