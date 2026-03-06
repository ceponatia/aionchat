import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";
import { type LoreEntryType } from "@/lib/types";

const BASE_PATH = "/api/conversations";

type RouteContext = { params: Promise<{ id: string }> };

interface UpdateItem {
  loreEntryId: string;
  pinned: boolean;
  priority: number;
}

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// eslint-disable-next-line complexity -- explicit field validation keeps conversation attachment replacement deterministic
function parseUpdateBody(value: unknown): UpdateItem[] | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) {
    return null;
  }

  const items: UpdateItem[] = [];
  const ids = new Set<string>();

  for (const item of candidate.items) {
    if (item === null || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    if (typeof record.loreEntryId !== "string" || !record.loreEntryId.trim()) {
      return null;
    }
    if (typeof record.pinned !== "boolean") {
      return null;
    }
    if (typeof record.priority !== "number" || !Number.isFinite(record.priority)) {
      return null;
    }

    const loreEntryId = record.loreEntryId.trim();
    if (ids.has(loreEntryId)) {
      return null;
    }
    ids.add(loreEntryId);

    items.push({
      loreEntryId,
      pinned: record.pinned,
      priority: Math.max(0, Math.trunc(record.priority)),
    });
  }

  return items;
}

function formatItems(
  items: Array<{
    loreEntryId: string;
    pinned: boolean;
    priority: number;
    loreEntry: {
      id: string;
      title: string;
      type: string;
      tags: string[];
      isGlobal: boolean;
      createdAt: Date;
      updatedAt: Date;
      _count: { conversations: number };
    };
  }>,
) {
  return items.map((item) => ({
    loreEntryId: item.loreEntryId,
    pinned: item.pinned,
    priority: item.priority,
    loreEntry: {
      id: item.loreEntry.id,
      title: item.loreEntry.title,
      type: item.loreEntry.type as LoreEntryType,
      tags: item.loreEntry.tags,
      isGlobal: item.loreEntry.isGlobal,
      createdAt: item.loreEntry.createdAt.toISOString(),
      updatedAt: item.loreEntry.updatedAt.toISOString(),
      conversationCount: item.loreEntry._count.conversations,
    },
  }));
}

async function loadConversationLoreEntries(conversationId: string) {
  const items = await prisma.conversationLoreEntry.findMany({
    where: { conversationId },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: {
      loreEntryId: true,
      pinned: true,
      priority: true,
      loreEntry: {
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
      },
    },
  });

  return formatItems(items);
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("GET", `${BASE_PATH}/${id}/lore-entries`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: normalizedId },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(await loadConversationLoreEntries(normalizedId));
  } catch (error: unknown) {
    logError("GET", `${BASE_PATH}/${id}/lore-entries`, error);
    return NextResponse.json(
      { error: "Unable to load conversation lore entries" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("PUT", `${BASE_PATH}/${id}/lore-entries`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = parseUpdateBody(json);
  if (!items) {
    return NextResponse.json(
      { error: "items must be a valid lore attachment list" },
      { status: 400 },
    );
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: normalizedId },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (items.length > 0) {
      const loreEntries = await prisma.loreEntry.findMany({
        where: { id: { in: items.map((item) => item.loreEntryId) } },
        select: { id: true },
      });
      if (loreEntries.length !== items.length) {
        return NextResponse.json(
          { error: "One or more lore entries were not found" },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.conversationLoreEntry.deleteMany({
        where: { conversationId: normalizedId },
      });

      if (items.length > 0) {
        await tx.conversationLoreEntry.createMany({
          data: items.map((item, index) => ({
            conversationId: normalizedId,
            loreEntryId: item.loreEntryId,
            pinned: item.pinned,
            priority: index,
          })),
        });
      }
    });

    return NextResponse.json(await loadConversationLoreEntries(normalizedId));
  } catch (error: unknown) {
    logError("PUT", `${BASE_PATH}/${id}/lore-entries`, error);
    return NextResponse.json(
      { error: "Unable to update conversation lore entries" },
      { status: 500 },
    );
  }
}