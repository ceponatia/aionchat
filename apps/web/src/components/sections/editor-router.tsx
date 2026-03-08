"use client";

import type { ReactNode } from "react";

import { CharacterSheetEditor } from "@/components/character-sheets/character-sheet-editor";
import { LoreEntryEditor } from "@/components/lorebook/lore-entry-editor";
import { useEditor } from "@/lib/providers/editor-provider";

export function EditorRouter({ children }: { children: ReactNode }) {
  const editor = useEditor();

  if (editor.isEditingSheet) {
    return (
      <CharacterSheetEditor
        key={editor.editingSheet?.id ?? "new"}
        sheet={editor.editingSheet}
        initialDraft={editor.newSheetDraft}
        onSave={editor.handleSaveCharacterSheet}
        onDelete={
          editor.editingSheet ? editor.handleDeleteCharacterSheet : null
        }
        onExport={
          editor.editingSheet ? editor.handleExportCharacterSheet : null
        }
        onCancel={editor.closeSheetEditor}
      />
    );
  }

  if (editor.isEditingLoreEntry) {
    return (
      <LoreEntryEditor
        key={editor.editingLoreEntry?.id ?? "new"}
        entry={editor.editingLoreEntry}
        initialDraft={editor.newLoreEntryDraft}
        onSave={editor.handleSaveLoreEntry}
        onDelete={editor.editingLoreEntry ? editor.handleDeleteLoreEntry : null}
        onExport={editor.editingLoreEntry ? editor.handleExportLoreEntry : null}
        onCancel={editor.closeLoreEditor}
      />
    );
  }

  return <>{children}</>;
}
