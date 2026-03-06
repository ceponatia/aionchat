"use client";

import { useCallback, useState } from "react";

import type { LoreEntryDetail } from "@/lib/types";

interface UseLoreEntryEditorReturn {
  editingLoreEntry: LoreEntryDetail | null;
  isEditing: boolean;
  openEditor: (entry: LoreEntryDetail) => void;
  openNewEditor: () => void;
  closeEditor: () => void;
}

export function useLoreEntryEditor(): UseLoreEntryEditorReturn {
  const [editingLoreEntry, setEditingLoreEntry] =
    useState<LoreEntryDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const openEditor = useCallback((entry: LoreEntryDetail) => {
    setEditingLoreEntry(entry);
    setIsEditing(true);
  }, []);

  const openNewEditor = useCallback(() => {
    setEditingLoreEntry(null);
    setIsEditing(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingLoreEntry(null);
    setIsEditing(false);
  }, []);

  return {
    editingLoreEntry,
    isEditing,
    openEditor,
    openNewEditor,
    closeEditor,
  };
}