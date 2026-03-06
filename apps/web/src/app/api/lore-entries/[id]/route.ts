import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";
import {
  LORE_ENTRY_TYPES,
  type LoreEntryType,
} from "@/lib/types";

const BASE_PATH = "/api/lore-entries";

type RouteContext = { params: Promise<{ id: string }> };

const LORE_ENTRY_FIELDS = {
  id: true,
  title: true,
  type: true,
  tags: true,
  body: true,
  activationHints: true,
  isGlobal: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isLoreEntryType(value: unknown): value is LoreEntryType {
  return (
    typeof value === "string" &&
    (LORE_ENTRY_TYPES as readonly string[]).includes(value)
  );
}

function normalizeStringList(values: string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }
  return [...unique];
}

// eslint-disable-next-line complexity -- explicit field validation keeps request errors predictable
function parseUpdateBody(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  let hasField = false;

  if ("title" in candidate) {
    if (typeof candidate.title !== "string" || !candidate.title.trim()) {
      return null;
    }
    data.title = candidate.title.trim();
    hasField = true;
  }

  if ("type" in candidate) {
    if (!isLoreEntryType(candidate.type)) return null;
    data.type = candidate.type;
    hasField = true;
  }

  if ("tags" in candidate) {
    if (
      !Array.isArray(candidate.tags) ||
      candidate.tags.some((item) => typeof item !== "string")
    ) {
      return null;
    }
    data.tags = normalizeStringList(candidate.tags as string[]);
    hasField = true;
  }

  if ("body" in candidate) {
    if (typeof candidate.body !== "string" || !candidate.body.trim()) {
      return null;
    }
    data.body = candidate.body.trim();
    hasField = true;
  }

  if ("activationHints" in candidate) {
    if (
      !Array.isArray(candidate.activationHints) ||
      candidate.activationHints.some((item) => typeof item !== "string")
    ) {
      return null;
    }
    data.activationHints = normalizeStringList(
      candidate.activationHints as string[],
    );
    hasField = true;
  }

  if ("isGlobal" in candidate) {
    if (typeof candidate.isGlobal !== "boolean") return null;
    data.isGlobal = candidate.isGlobal;
    hasField = true;
  }

  return hasField ? data : null;
}

function formatDetail(entry: {
  id: string;
  title: string;
  type: string;
  tags: string[];
  body: string;
  activationHints: string[];
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type as LoreEntryType,
    tags: entry.tags,
    body: entry.body,
    activationHints: entry.activationHints,
    isGlobal: entry.isGlobal,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("GET", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Lore entry id is required" },
      { status: 400 },
    );
  }

  try {
    const entry = await prisma.loreEntry.findUnique({
      where: { id: normalizedId },
      select: LORE_ENTRY_FIELDS,
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Lore entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(formatDetail(entry));
  } catch (error: unknown) {
    logError("GET", `${BASE_PATH}/${id}`, error);
    return NextResponse.json(
      { error: "Unable to load lore entry" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("PATCH", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Lore entry id is required" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = parseUpdateBody(json);
  if (!data) {
    return NextResponse.json(
      { error: "At least one valid field is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.loreEntry.update({
      where: { id: normalizedId },
      data,
      select: LORE_ENTRY_FIELDS,
    });

    return NextResponse.json(formatDetail(updated));
  } catch (error: unknown) {
    logError("PATCH", `${BASE_PATH}/${id}`, error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Lore entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Unable to update lore entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("DELETE", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Lore entry id is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.loreEntry.delete({ where: { id: normalizedId } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("DELETE", `${BASE_PATH}/${id}`, error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Lore entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Unable to delete lore entry" },
      { status: 500 },
    );
  }
}