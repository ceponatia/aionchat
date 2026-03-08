"use client";

import { useMemo, type ReactNode } from "react";

import {
  EditorContext,
  type EditorContextValue,
} from "@/lib/providers/editor-context";
import { useCharacterSheetManager } from "@/lib/providers/use-character-sheet-manager";
import { useEditorPanels } from "@/lib/providers/use-editor-panels";
import { useLoreEntryManager } from "@/lib/providers/use-lore-entry-manager";

export { useEditor } from "@/lib/providers/editor-context";
export function EditorProvider({ children }: { children: ReactNode }) {
  const panelState = useEditorPanels();
  const characterSheetState = useCharacterSheetManager();
  const loreEntryState = useLoreEntryManager();

  const value = useMemo<EditorContextValue>(
    () => ({
      ...panelState,
      ...characterSheetState,
      ...loreEntryState,
    }),
    [characterSheetState, loreEntryState, panelState],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
