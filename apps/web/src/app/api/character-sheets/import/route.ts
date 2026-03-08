import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { parseCharacterSheetExportText } from "@/lib/character-sheet-json";
import { prisma } from "@/lib/prisma";
import type { CharacterSheetExportEnvelope } from "@/lib/types";

const PATH = "/api/character-sheets/import";

interface ParsedCharacterSheetImportEnvelope {
  version: 1;
  type: "character-sheet";
  exportedAt: string;
  data: {
    name: string;
    tagline: string | null;
    personality: string | null;
    background: string | null;
    appearance: string | null;
    scenario: string | null;
    customInstructions: string | null;
  };
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseEnvelope(
  value: unknown,
): ParsedCharacterSheetImportEnvelope | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1 || candidate.type !== "character-sheet") {
    return null;
  }
  if (typeof candidate.exportedAt !== "string") {
    return null;
  }

  const data = candidate.data;
  if (data === null || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const name = asTrimmedString(payload.name);
  if (!name) {
    return null;
  }

  const tagline = parseCharacterSheetExportText(payload.tagline);
  if (tagline === undefined) return null;
  const personality = parseCharacterSheetExportText(payload.personality);
  if (personality === undefined) return null;
  const background = parseCharacterSheetExportText(payload.background);
  if (background === undefined) return null;
  const appearance = parseCharacterSheetExportText(payload.appearance);
  if (appearance === undefined) return null;
  const scenario = parseCharacterSheetExportText(payload.scenario);
  if (scenario === undefined) return null;
  const customInstructions = parseCharacterSheetExportText(
    payload.customInstructions,
  );
  if (customInstructions === undefined) return null;

  return {
    version: 1,
    type: "character-sheet",
    exportedAt: candidate.exportedAt,
    data: {
      name,
      tagline,
      personality,
      background,
      appearance,
      scenario,
      customInstructions,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  logRequest("POST", PATH);

  let json: unknown;
  try {
    json = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const envelope = parseEnvelope(json);
  if (!envelope) {
    return NextResponse.json(
      { error: "Invalid character sheet import envelope" },
      { status: 400 },
    );
  }

  try {
    const sheet = await prisma.characterSheet.create({
      data: {
        name: envelope.data.name,
        tagline: envelope.data.tagline,
        personality: envelope.data.personality,
        background: envelope.data.background,
        appearance: envelope.data.appearance,
        scenario: envelope.data.scenario,
        customInstructions: envelope.data.customInstructions,
      },
    });

    return NextResponse.json({
      id: sheet.id,
      name: sheet.name,
      tagline: sheet.tagline,
      personality: sheet.personality,
      background: sheet.background,
      appearance: sheet.appearance,
      scenario: sheet.scenario,
      customInstructions: sheet.customInstructions,
      createdAt: sheet.createdAt.toISOString(),
      updatedAt: sheet.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json(
      { error: "Unable to import character sheet" },
      { status: 500 },
    );
  }
}
