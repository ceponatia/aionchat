import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";
import {
  LORE_ENTRY_TYPES,
  type LoreEntryExportEnvelope,
  type LoreEntryType,
} from "@/lib/types";

const PATH = "/api/lore-entries/import";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }

    const trimmed = item.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return [...unique];
}

function isLoreEntryType(value: unknown): value is LoreEntryType {
  return (
    typeof value === "string" &&
    (LORE_ENTRY_TYPES as readonly string[]).includes(value)
  );
}

function parseEnvelope(value: unknown): LoreEntryExportEnvelope | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1 || candidate.type !== "lore-entry") {
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
  const title = asTrimmedString(payload.title);
  const body = asTrimmedString(payload.body);
  const tags = asStringArray(payload.tags);
  const activationHints = asStringArray(payload.activationHints);

  if (!title || !body) {
    return null;
  }
  if (!isLoreEntryType(payload.type)) {
    return null;
  }
  if (!tags || !activationHints) {
    return null;
  }
  if (typeof payload.isGlobal !== "boolean") {
    return null;
  }

  return {
    version: 1,
    type: "lore-entry",
    exportedAt: candidate.exportedAt,
    data: {
      title,
      type: payload.type,
      tags,
      body,
      activationHints,
      isGlobal: payload.isGlobal,
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
      { error: "Invalid lore entry import envelope" },
      { status: 400 },
    );
  }

  try {
    const entry = await prisma.loreEntry.create({
      data: {
        title: envelope.data.title,
        type: envelope.data.type,
        tags: envelope.data.tags,
        body: envelope.data.body,
        activationHints: envelope.data.activationHints,
        isGlobal: envelope.data.isGlobal,
      },
    });

    return NextResponse.json({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      tags: entry.tags,
      body: entry.body,
      activationHints: entry.activationHints,
      isGlobal: entry.isGlobal,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json(
      { error: "Unable to import lore entry" },
      { status: 500 },
    );
  }
}
