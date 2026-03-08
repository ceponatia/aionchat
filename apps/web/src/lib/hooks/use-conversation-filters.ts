"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConversationListItem } from "@/lib/types";

export type ConversationSortMode =
  | "recent"
  | "alphabetical"
  | "character-sheet";

interface UseConversationFiltersOptions {
  conversations: ConversationListItem[];
  searchQuery: string;
  selectedTagIds: string[];
  showArchived: boolean;
  sortMode: ConversationSortMode;
}

function compareAlphabetical(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function useConversationFilters({
  conversations,
  searchQuery,
  selectedTagIds,
  showArchived,
  sortMode,
}: UseConversationFiltersOptions): ConversationListItem[] {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  return useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLocaleLowerCase();
    const selectedTags = new Set(selectedTagIds);
    const filtered = conversations.filter((conversation) => {
      if (!showArchived && conversation.archivedAt) {
        return false;
      }
      if (
        normalizedQuery &&
        !conversation.title.toLocaleLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      if (
        selectedTags.size > 0 &&
        !conversation.tags.some((tag) => selectedTags.has(tag.id))
      ) {
        return false;
      }
      return true;
    });

    filtered.sort((left, right) => {
      if (sortMode === "alphabetical") {
        return compareAlphabetical(left.title, right.title);
      }

      if (sortMode === "character-sheet") {
        const leftKey = left.characterSheetId?.toLocaleLowerCase() ?? "~";
        const rightKey = right.characterSheetId?.toLocaleLowerCase() ?? "~";
        if (leftKey !== rightKey) {
          return compareAlphabetical(leftKey, rightKey);
        }
        return compareAlphabetical(left.title, right.title);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });

    return filtered;
  }, [conversations, debouncedSearchQuery, selectedTagIds, showArchived, sortMode]);
}