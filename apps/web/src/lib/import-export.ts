"use client";

import { formatCharacterSheetExportData } from "@/lib/character-sheet-json";
import type {
  CharacterSheetDetail,
  CharacterSheetExportEnvelope,
  LoreEntryDetail,
  LoreEntryExportEnvelope,
} from "@/lib/types";

interface TemplateOption {
  id: string;
  name: string;
  description: string;
}

export function slugifyForFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "aionchat-export";
}

export function triggerJsonDownload(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Selected file is not valid JSON");
  }
}

export function chooseTemplateId(
  entityLabel: string,
  templates: TemplateOption[],
): string | null {
  const options = templates
    .map((template, index) => {
      return `${index + 1}. ${template.name} (${template.id}) - ${template.description}`;
    })
    .join("\n");

  const selection = window.prompt(
    `Choose a ${entityLabel} template by number or id:\n\n${options}`,
  );
  if (!selection) {
    return null;
  }

  const trimmed = selection.trim();
  const byId = templates.find((template) => template.id === trimmed);
  if (byId) {
    return byId.id;
  }

  const index = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(index) && index >= 1 && index <= templates.length) {
    return templates[index - 1]?.id ?? null;
  }

  throw new Error(`Unknown ${entityLabel} template selection`);
}

export function buildCharacterSheetExportEnvelope(
  sheet: CharacterSheetDetail,
): CharacterSheetExportEnvelope {
  return {
    version: 1,
    type: "character-sheet",
    exportedAt: new Date().toISOString(),
    data: formatCharacterSheetExportData({
      name: sheet.name,
      tagline: sheet.tagline,
      personality: sheet.personality,
      background: sheet.background,
      appearance: sheet.appearance,
      scenario: sheet.scenario,
      customInstructions: sheet.customInstructions,
    }),
  };
}

export function buildLoreEntryExportEnvelope(
  entry: LoreEntryDetail,
): LoreEntryExportEnvelope {
  return {
    version: 1,
    type: "lore-entry",
    exportedAt: new Date().toISOString(),
    data: {
      title: entry.title,
      type: entry.type,
      tags: entry.tags,
      body: entry.body,
      activationHints: entry.activationHints,
      isGlobal: entry.isGlobal,
    },
  };
}
