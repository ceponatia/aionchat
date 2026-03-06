"use client";

import { useCallback, useState } from "react";

import type {
  CharacterSheetDetail,
  CreateCharacterSheetBody,
} from "@/lib/types";

interface UseCharacterSheetEditorReturn {
  editingSheet: CharacterSheetDetail | null;
  newSheetDraft: CreateCharacterSheetBody | null;
  isEditing: boolean;
  openEditor: (sheet: CharacterSheetDetail) => void;
  openNewEditor: (draft?: CreateCharacterSheetBody) => void;
  closeEditor: () => void;
}

export function useCharacterSheetEditor(): UseCharacterSheetEditorReturn {
  const [editingSheet, setEditingSheet] = useState<CharacterSheetDetail | null>(
    null,
  );
  const [newSheetDraft, setNewSheetDraft] =
    useState<CreateCharacterSheetBody | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const openEditor = useCallback((sheet: CharacterSheetDetail) => {
    setEditingSheet(sheet);
    setNewSheetDraft(null);
    setIsEditing(true);
  }, []);

  const openNewEditor = useCallback((draft?: CreateCharacterSheetBody) => {
    setEditingSheet(null);
    setNewSheetDraft(draft ?? null);
    setIsEditing(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingSheet(null);
    setNewSheetDraft(null);
    setIsEditing(false);
  }, []);

  return {
    editingSheet,
    newSheetDraft,
    isEditing,
    openEditor,
    openNewEditor,
    closeEditor,
  };
}
