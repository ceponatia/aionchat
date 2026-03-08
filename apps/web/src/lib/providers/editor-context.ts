"use client";

import { createContext, useContext } from "react";

import type {
  CharacterSheetDetail,
  CharacterSheetListItem,
  CreateCharacterSheetBody,
  CreateLoreEntryBody,
  LoreEntryDetail,
  LoreEntryListItem,
  LoreEntryType,
} from "@/lib/types";

export type ActivePanel = "settings" | "summary" | "prompt-inspector" | null;

export interface EditorContextValue {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  activePanel: ActivePanel;
  toggleSettings: () => void;
  toggleSummary: () => void;
  togglePromptInspector: () => void;
  closePanels: () => void;
  characterSheets: CharacterSheetListItem[];
  isCharacterSheetsLoading: boolean;
  loreEntries: LoreEntryListItem[];
  isLoreEntriesLoading: boolean;
  editingSheet: CharacterSheetDetail | null;
  newSheetDraft: CreateCharacterSheetBody | null;
  isEditingSheet: boolean;
  editingLoreEntry: LoreEntryDetail | null;
  newLoreEntryDraft: CreateLoreEntryBody | null;
  isEditingLoreEntry: boolean;
  openNewSheetEditor: (draft?: CreateCharacterSheetBody) => void;
  openNewLoreEditor: (draft?: CreateLoreEntryBody) => void;
  handleSelectCharacterSheet: (id: string) => void;
  handleNewCharacterFromTemplate: () => void;
  handleImportCharacterSheet: (file: File) => void;
  handleExportCharacterSheet: () => void;
  handleSaveCharacterSheet: (data: {
    name: string;
    tagline: string | null;
    personality: string | null;
    background: string | null;
    appearance: string | null;
    scenario: string | null;
    customInstructions: string | null;
  }) => Promise<void>;
  handleDeleteCharacterSheet: () => Promise<void>;
  closeSheetEditor: () => void;
  handleSelectLoreEntry: (id: string) => void;
  handleNewLoreFromTemplate: () => void;
  handleImportLoreEntry: (file: File) => void;
  handleExportLoreEntry: () => void;
  handleSaveLoreEntry: (data: {
    title: string;
    type: LoreEntryType;
    tags: string[];
    body: string;
    activationHints: string[];
    isGlobal: boolean;
  }) => Promise<void>;
  handleDeleteLoreEntry: () => Promise<void>;
  closeLoreEditor: () => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within EditorProvider");
  }

  return context;
}
