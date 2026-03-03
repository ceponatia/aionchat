"use client";

import { useCallback, useState } from "react";

import type { CharacterSheetDetail } from "@/lib/types";

interface UseCharacterSheetEditorReturn {
  editingSheet: CharacterSheetDetail | null;
  isEditing: boolean;
  openEditor: (sheet: CharacterSheetDetail) => void;
  openNewEditor: () => void;
  closeEditor: () => void;
}

export function useCharacterSheetEditor(): UseCharacterSheetEditorReturn {
  const [editingSheet, setEditingSheet] = useState<CharacterSheetDetail | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);

  const openEditor = useCallback((sheet: CharacterSheetDetail) => {
    setEditingSheet(sheet);
    setIsEditing(true);
  }, []);

  const openNewEditor = useCallback(() => {
    setEditingSheet(null);
    setIsEditing(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingSheet(null);
    setIsEditing(false);
  }, []);

  return { editingSheet, isEditing, openEditor, openNewEditor, closeEditor };
}
