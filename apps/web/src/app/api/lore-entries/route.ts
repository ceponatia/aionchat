import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";
import {
  LORE_ENTRY_TYPES,
  type LoreEntryType,
} from "@/lib/types";

const PATH = "/api/lore-entries";

interface CreateBody {
  title: string;
  type: LoreEntryType;
  tags?: string[];
  body: string;
  activationHints?: string[];
  isGlobal?: boolean;
}

function isLoreEntryType(value: unknown): value is LoreEntryType {
  return (
    typeof value === "string" &&
    (LORE_ENTRY_TYPES as readonly string[]).includes(value)
  );
}

function normalizeStringList(values: string[] | undefined): string[] {
  if (!values) return [];

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
function parseCreateBody(value: unknown): CreateBody | null {
  if (value === null || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    return null;
  }
  if (typeof candidate.body !== "string" || !candidate.body.trim()) {
    return null;
  }
  if (!isLoreEntryType(candidate.type)) {
    return null;
  }
  if (
    candidate.tags !== undefined &&
    (!Array.isArray(candidate.tags) ||
      candidate.tags.some((item) => typeof item !== "string"))
  ) {
    return null;
  }
  if (
    candidate.activationHints !== undefined &&
    (!Array.isArray(candidate.activationHints) ||
      candidate.activationHints.some((item) => typeof item !== "string"))
  ) {
    return null;
  }
  if (
    candidate.isGlobal !== undefined &&
    typeof candidate.isGlobal !== "boolean"
  ) {
    return null;
  }

  return {
    title: candidate.title,
    type: candidate.type,
    tags: candidate.tags as string[] | undefined,
    body: candidate.body,
    activationHints: candidate.activationHints as string[] | undefined,
    isGlobal: candidate.isGlobal as boolean | undefined,
  };
}

function formatListItem(entry: {
  id: string;
  title: string;
  type: string;
  tags: string[];
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { conversations: number };
}) {
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type as LoreEntryType,
    tags: entry.tags,
    isGlobal: entry.isGlobal,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    conversationCount: entry._count.conversations,
  };
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

function buildCreateData(body: CreateBody) {
  return {
    title: body.title.trim(),
    type: body.type,
    tags: normalizeStringList(body.tags),
    body: body.body.trim(),
    activationHints: normalizeStringList(body.activationHints),
    isGlobal: body.isGlobal ?? true,
  };
}

export async function GET(): Promise<NextResponse> {
  logRequest("GET", PATH);

  try {
    const entries = await prisma.loreEntry.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        tags: true,
        isGlobal: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { conversations: true } },
      },
    });

    return NextResponse.json(entries.map(formatListItem));
  } catch (error: unknown) {
    logError("GET", PATH, error);
    return NextResponse.json(
      { error: "Unable to load lore entries" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  logRequest("POST", PATH);

  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parseCreateBody(json);
  if (!body) {
    return NextResponse.json(
      { error: "Title, type, and body are required" },
      { status: 400 },
    );
  }

  try {
    const entry = await prisma.loreEntry.create({
      data: buildCreateData(body),
    });

    return NextResponse.json(formatDetail(entry));
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json(
      { error: "Unable to create lore entry" },
      { status: 500 },
    );
  }
}