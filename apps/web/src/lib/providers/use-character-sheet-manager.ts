"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import {
  buildCharacterSheetExportEnvelope,
  chooseTemplateId,
  readJsonFile,
  slugifyForFilename,
  triggerJsonDownload,
} from "@/lib/import-export";
import { useCharacterSheetEditor } from "@/lib/hooks/use-character-sheet-editor";
import { useCharacterSheets } from "@/lib/hooks/use-character-sheets";
import { CHARACTER_SHEET_TEMPLATES } from "@/lib/templates";
import type { EditorContextValue } from "@/lib/providers/editor-context";
import type { CharacterSheetExportEnvelope } from "@/lib/types";

type CharacterSheetManagerSlice = Pick<
  EditorContextValue,
  | "characterSheets"
  | "isCharacterSheetsLoading"
  | "editingSheet"
  | "newSheetDraft"
  | "isEditingSheet"
  | "openNewSheetEditor"
  | "handleSelectCharacterSheet"
  | "handleNewCharacterFromTemplate"
  | "handleImportCharacterSheet"
  | "handleExportCharacterSheet"
  | "handleSaveCharacterSheet"
  | "handleDeleteCharacterSheet"
  | "closeSheetEditor"
>;

// eslint-disable-next-line max-lines-per-function -- character sheet manager preserves existing async selection, import/export, and editor routing behavior
export function useCharacterSheetManager(): CharacterSheetManagerSlice {
  const {
    characterSheets,
    isLoading: isCharacterSheetsLoading,
    loadCharacterSheets,
    getCharacterSheet,
    createCharacterSheet,
    updateCharacterSheet,
    deleteCharacterSheet,
    importCharacterSheet,
  } = useCharacterSheets();
  const {
    editingSheet,
    newSheetDraft,
    isEditing: isEditingSheet,
    openEditor: openSheetEditor,
    openNewEditor: openNewSheetEditor,
    closeEditor: closeSheetEditor,
  } = useCharacterSheetEditor();
  const characterSelectionRequestIdRef = useRef(0);

  useEffect(() => {
    void loadCharacterSheets().catch((managerError: unknown) => {
      const message =
        managerError instanceof Error
          ? managerError.message
          : "Unable to load character sheets";
      toast.error("Could not load character sheets", {
        description: message,
        duration: 5000,
      });
    });
  }, [loadCharacterSheets]);

  const handleSelectCharacterSheet = useCallback(
    (id: string) => {
      void (async () => {
        const requestId = characterSelectionRequestIdRef.current + 1;
        characterSelectionRequestIdRef.current = requestId;

        try {
          const sheet = await getCharacterSheet(id);
          if (characterSelectionRequestIdRef.current !== requestId) {
            return;
          }
          openSheetEditor(sheet);
        } catch (managerError: unknown) {
          if (characterSelectionRequestIdRef.current !== requestId) {
            return;
          }

          const message =
            managerError instanceof Error
              ? managerError.message
              : "Unable to load character sheet";
          toast.error("Could not load character sheet", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getCharacterSheet, openSheetEditor],
  );

  const handleNewCharacterFromTemplate = useCallback(() => {
    try {
      const selectedId = chooseTemplateId(
        "character",
        CHARACTER_SHEET_TEMPLATES,
      );
      if (!selectedId) {
        return;
      }

      const template = CHARACTER_SHEET_TEMPLATES.find(
        (candidate) => candidate.id === selectedId,
      );
      if (!template) {
        throw new Error("Selected template was not found");
      }

      openNewSheetEditor(template.data);
    } catch (managerError: unknown) {
      const message =
        managerError instanceof Error
          ? managerError.message
          : "Unable to load character template";
      toast.error("Template selection failed", {
        description: message,
        duration: 5000,
      });
    }
  }, [openNewSheetEditor]);

  const handleImportCharacterSheet = useCallback(
    (file: File) => {
      void (async () => {
        try {
          const payload = (await readJsonFile(
            file,
          )) as CharacterSheetExportEnvelope;
          const createdId = await importCharacterSheet(payload);
          toast.success("Character sheet imported", {
            description: "A new character sheet record was created.",
            duration: 4000,
          });
          const imported = await getCharacterSheet(createdId);
          openSheetEditor(imported);
        } catch (managerError: unknown) {
          const message =
            managerError instanceof Error
              ? managerError.message
              : "Unable to import character sheet";
          toast.error("Character import failed", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getCharacterSheet, importCharacterSheet, openSheetEditor],
  );

  const handleExportCharacterSheet = useCallback(() => {
    if (!editingSheet) {
      return;
    }

    triggerJsonDownload(
      `${slugifyForFilename(editingSheet.name)}.character-sheet.json`,
      buildCharacterSheetExportEnvelope(editingSheet),
    );
  }, [editingSheet]);

  const handleSaveCharacterSheet = useCallback(
    async (data: {
      name: string;
      tagline: string | null;
      personality: string | null;
      background: string | null;
      appearance: string | null;
      scenario: string | null;
      customInstructions: string | null;
    }) => {
      if (editingSheet) {
        await updateCharacterSheet(editingSheet.id, data);
      } else {
        await createCharacterSheet(data);
      }
      closeSheetEditor();
    },
    [
      closeSheetEditor,
      createCharacterSheet,
      editingSheet,
      updateCharacterSheet,
    ],
  );

  const handleDeleteCharacterSheet = useCallback(async () => {
    if (!editingSheet) {
      return;
    }

    await deleteCharacterSheet(editingSheet.id);
    closeSheetEditor();
  }, [closeSheetEditor, deleteCharacterSheet, editingSheet]);

  return useMemo(
    () => ({
      characterSheets,
      isCharacterSheetsLoading,
      editingSheet,
      newSheetDraft,
      isEditingSheet,
      openNewSheetEditor,
      handleSelectCharacterSheet,
      handleNewCharacterFromTemplate,
      handleImportCharacterSheet,
      handleExportCharacterSheet,
      handleSaveCharacterSheet,
      handleDeleteCharacterSheet,
      closeSheetEditor,
    }),
    [
      characterSheets,
      closeSheetEditor,
      editingSheet,
      handleDeleteCharacterSheet,
      handleExportCharacterSheet,
      handleImportCharacterSheet,
      handleNewCharacterFromTemplate,
      handleSaveCharacterSheet,
      handleSelectCharacterSheet,
      isCharacterSheetsLoading,
      isEditingSheet,
      newSheetDraft,
      openNewSheetEditor,
    ],
  );
}
