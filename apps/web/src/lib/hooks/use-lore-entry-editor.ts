"use client";

import { useCallback, useState } from "react";

import type { CreateLoreEntryBody, LoreEntryDetail } from "@/lib/types";

interface UseLoreEntryEditorReturn {
  editingLoreEntry: LoreEntryDetail | null;
  newLoreEntryDraft: CreateLoreEntryBody | null;
  isEditing: boolean;
  openEditor: (entry: LoreEntryDetail) => void;
  openNewEditor: (draft?: CreateLoreEntryBody) => void;
  closeEditor: () => void;
}

export function useLoreEntryEditor(): UseLoreEntryEditorReturn {
  const [editingLoreEntry, setEditingLoreEntry] =
    useState<LoreEntryDetail | null>(null);
  const [newLoreEntryDraft, setNewLoreEntryDraft] =
    useState<CreateLoreEntryBody | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const openEditor = useCallback((entry: LoreEntryDetail) => {
    setEditingLoreEntry(entry);
    setNewLoreEntryDraft(null);
    setIsEditing(true);
  }, []);

  const openNewEditor = useCallback((draft?: CreateLoreEntryBody) => {
    setEditingLoreEntry(null);
    setNewLoreEntryDraft(draft ?? null);
    setIsEditing(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingLoreEntry(null);
    setNewLoreEntryDraft(null);
    setIsEditing(false);
  }, []);

  return {
    editingLoreEntry,
    newLoreEntryDraft,
    isEditing,
    openEditor,
    openNewEditor,
    closeEditor,
  };
}
