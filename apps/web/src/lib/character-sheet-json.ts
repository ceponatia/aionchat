import type {
  CharacterSheetExportData,
  CharacterSheetExportTextValue,
} from "@/lib/types";

const WRAP_WIDTH = 88;

interface CharacterSheetRuntimeExportInput {
  name: string;
  tagline: string | null;
  personality: string | null;
  background: string | null;
  appearance: string | null;
  scenario: string | null;
  customInstructions: string | null;
}

function trimOrNull(value: string): string | null {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function wrapLine(line: string, maxWidth: number): string[] {
  const words = line.split(/\s+/);
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      wrapped.push(current);
    }

    if (word.length <= maxWidth) {
      current = word;
      continue;
    }

    let offset = 0;
    while (offset < word.length) {
      const chunk = word.slice(offset, offset + maxWidth);
      if (chunk.length === maxWidth) {
        wrapped.push(chunk);
      } else {
        current = chunk;
      }
      offset += maxWidth;
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped;
}

export function formatCharacterSheetExportText(
  value: string | null,
): CharacterSheetExportTextValue {
  if (value === null) {
    return null;
  }

  const normalized = trimOrNull(value);
  if (!normalized) {
    return null;
  }

  if (!normalized.includes("\n") && normalized.length <= WRAP_WIDTH) {
    return normalized;
  }

  const wrapped: string[] = [];
  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) {
      if (wrapped[wrapped.length - 1] !== "") {
        wrapped.push("");
      }
      continue;
    }

    wrapped.push(...wrapLine(line, WRAP_WIDTH));
  }

  while (wrapped[wrapped.length - 1] === "") {
    wrapped.pop();
  }

  return wrapped.length <= 1 ? normalized : wrapped;
}

export function parseCharacterSheetExportText(
  value: unknown,
): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return trimOrNull(value);
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return undefined;
  }

  return trimOrNull(value.join("\n"));
}

export function formatCharacterSheetExportData(
  data: CharacterSheetRuntimeExportInput,
): CharacterSheetExportData {
  return {
    name: data.name,
    tagline: formatCharacterSheetExportText(data.tagline),
    personality: formatCharacterSheetExportText(data.personality),
    background: formatCharacterSheetExportText(data.background),
    appearance: formatCharacterSheetExportText(data.appearance),
    scenario: formatCharacterSheetExportText(data.scenario),
    customInstructions: formatCharacterSheetExportText(data.customInstructions),
  };
}
