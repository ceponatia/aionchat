"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import {
  buildLoreEntryExportEnvelope,
  chooseTemplateId,
  readJsonFile,
  slugifyForFilename,
  triggerJsonDownload,
} from "@/lib/import-export";
import { useLoreEntries } from "@/lib/hooks/use-lore-entries";
import { useLoreEntryEditor } from "@/lib/hooks/use-lore-entry-editor";
import { LORE_ENTRY_TEMPLATES } from "@/lib/templates";
import type { EditorContextValue } from "@/lib/providers/editor-context";
import { useConversation } from "@/lib/providers/conversation-context";
import type { LoreEntryExportEnvelope, LoreEntryType } from "@/lib/types";

type LoreEntryManagerSlice = Pick<
  EditorContextValue,
  | "loreEntries"
  | "isLoreEntriesLoading"
  | "editingLoreEntry"
  | "newLoreEntryDraft"
  | "isEditingLoreEntry"
  | "openNewLoreEditor"
  | "handleSelectLoreEntry"
  | "handleNewLoreFromTemplate"
  | "handleImportLoreEntry"
  | "handleExportLoreEntry"
  | "handleSaveLoreEntry"
  | "handleDeleteLoreEntry"
  | "closeLoreEditor"
>;

// eslint-disable-next-line max-lines-per-function -- lore entry manager preserves existing async selection, import/export, and conversation refresh behavior
export function useLoreEntryManager(): LoreEntryManagerSlice {
  const { activeId, handleSelectConversation } = useConversation();
  const {
    loreEntries,
    isLoading: isLoreEntriesLoading,
    loadLoreEntries,
    getLoreEntry,
    createLoreEntry,
    updateLoreEntry,
    deleteLoreEntry,
    importLoreEntry,
  } = useLoreEntries();
  const {
    editingLoreEntry,
    newLoreEntryDraft,
    isEditing: isEditingLoreEntry,
    openEditor: openLoreEditor,
    openNewEditor: openNewLoreEditor,
    closeEditor: closeLoreEditor,
  } = useLoreEntryEditor();
  const loreSelectionRequestIdRef = useRef(0);

  useEffect(() => {
    void loadLoreEntries().catch((managerError: unknown) => {
      const message =
        managerError instanceof Error
          ? managerError.message
          : "Unable to load lore entries";
      toast.error("Could not load lore entries", {
        description: message,
        duration: 5000,
      });
    });
  }, [loadLoreEntries]);

  const handleSelectLoreEntry = useCallback(
    (id: string) => {
      void (async () => {
        const requestId = loreSelectionRequestIdRef.current + 1;
        loreSelectionRequestIdRef.current = requestId;

        try {
          const entry = await getLoreEntry(id);
          if (loreSelectionRequestIdRef.current !== requestId) {
            return;
          }
          openLoreEditor(entry);
        } catch (managerError: unknown) {
          if (loreSelectionRequestIdRef.current !== requestId) {
            return;
          }

          const message =
            managerError instanceof Error
              ? managerError.message
              : "Unable to load lore entry";
          toast.error("Could not load lore entry", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getLoreEntry, openLoreEditor],
  );

  const handleNewLoreFromTemplate = useCallback(() => {
    try {
      const selectedId = chooseTemplateId("lore entry", LORE_ENTRY_TEMPLATES);
      if (!selectedId) {
        return;
      }

      const template = LORE_ENTRY_TEMPLATES.find(
        (candidate) => candidate.id === selectedId,
      );
      if (!template) {
        throw new Error("Selected template was not found");
      }

      openNewLoreEditor(template.data);
    } catch (managerError: unknown) {
      const message =
        managerError instanceof Error
          ? managerError.message
          : "Unable to load lore template";
      toast.error("Template selection failed", {
        description: message,
        duration: 5000,
      });
    }
  }, [openNewLoreEditor]);

  const handleImportLoreEntry = useCallback(
    (file: File) => {
      void (async () => {
        try {
          const payload = (await readJsonFile(file)) as LoreEntryExportEnvelope;
          const createdId = await importLoreEntry(payload);
          toast.success("Lore entry imported", {
            description: "A new lore entry record was created.",
            duration: 4000,
          });
          const imported = await getLoreEntry(createdId);
          openLoreEditor(imported);
        } catch (managerError: unknown) {
          const message =
            managerError instanceof Error
              ? managerError.message
              : "Unable to import lore entry";
          toast.error("Lore import failed", {
            description: message,
            duration: 5000,
          });
        }
      })();
    },
    [getLoreEntry, importLoreEntry, openLoreEditor],
  );

  const handleExportLoreEntry = useCallback(() => {
    if (!editingLoreEntry) {
      return;
    }

    triggerJsonDownload(
      `${slugifyForFilename(editingLoreEntry.title)}.lore-entry.json`,
      buildLoreEntryExportEnvelope(editingLoreEntry),
    );
  }, [editingLoreEntry]);

  const handleSaveLoreEntry = useCallback(
    async (data: {
      title: string;
      type: LoreEntryType;
      tags: string[];
      body: string;
      activationHints: string[];
      isGlobal: boolean;
    }) => {
      try {
        if (editingLoreEntry) {
          await updateLoreEntry(editingLoreEntry.id, data);
        } else {
          await createLoreEntry(data);
        }
        closeLoreEditor();
      } catch (managerError: unknown) {
        const message =
          managerError instanceof Error
            ? managerError.message
            : "Unable to save lore entry";
        toast.error("Failed to save lore entry", {
          description: message,
          duration: 5000,
        });
      }
    },
    [closeLoreEditor, createLoreEntry, editingLoreEntry, updateLoreEntry],
  );

  const handleDeleteLoreEntry = useCallback(async () => {
    if (!editingLoreEntry) {
      return;
    }

    try {
      await deleteLoreEntry(editingLoreEntry.id);
      if (activeId) {
        await handleSelectConversation(activeId);
      }
      closeLoreEditor();
    } catch (managerError: unknown) {
      const message =
        managerError instanceof Error
          ? managerError.message
          : "Unable to delete lore entry";
      toast.error("Failed to delete lore entry", {
        description: message,
        duration: 5000,
      });
    }
  }, [
    activeId,
    closeLoreEditor,
    deleteLoreEntry,
    editingLoreEntry,
    handleSelectConversation,
  ]);

  return useMemo(
    () => ({
      loreEntries,
      isLoreEntriesLoading,
      editingLoreEntry,
      newLoreEntryDraft,
      isEditingLoreEntry,
      openNewLoreEditor,
      handleSelectLoreEntry,
      handleNewLoreFromTemplate,
      handleImportLoreEntry,
      handleExportLoreEntry,
      handleSaveLoreEntry,
      handleDeleteLoreEntry,
      closeLoreEditor,
    }),
    [
      closeLoreEditor,
      editingLoreEntry,
      handleDeleteLoreEntry,
      handleExportLoreEntry,
      handleImportLoreEntry,
      handleNewLoreFromTemplate,
      handleSaveLoreEntry,
      handleSelectLoreEntry,
      isEditingLoreEntry,
      isLoreEntriesLoading,
      loreEntries,
      newLoreEntryDraft,
      openNewLoreEditor,
    ],
  );
}
