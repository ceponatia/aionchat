import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { normalizeModelId } from "@/lib/model-registry";
import { prisma } from "@/lib/prisma";

const PATH = "/api/conversations";

interface CreateConversationBody {
  title?: string;
  model?: string;
}

function parseCreateBody(value: unknown): CreateConversationBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CreateConversationBody>;
  if (
    typeof candidate.title !== "undefined" &&
    typeof candidate.title !== "string"
  ) {
    return null;
  }

  if (
    typeof candidate.model !== "undefined" &&
    typeof candidate.model !== "string"
  ) {
    return null;
  }

  return { title: candidate.title, model: candidate.model };
}

function mapConversationListItem(conversation: {
  id: string;
  title: string;
  systemPrompt: string | null;
  model: string;
  autoLoreEnabled: boolean;
  promptBudgetMode: string;
  characterSheetId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
  _count: { messages: number };
}) {
  return {
    id: conversation.id,
    title: conversation.title,
    systemPrompt: conversation.systemPrompt,
    model: conversation.model,
    autoLoreEnabled: conversation.autoLoreEnabled,
    promptBudgetMode: conversation.promptBudgetMode,
    characterSheetId: conversation.characterSheetId,
    archivedAt: conversation.archivedAt?.toISOString() ?? null,
    tags: conversation.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count.messages,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  logRequest("GET", PATH);

  try {
    const includeArchived =
      new URL(req.url).searchParams.get("includeArchived") === "true";
    const conversations = await prisma.conversation.findMany({
      where: includeArchived ? undefined : { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        systemPrompt: true,
        model: true,
        autoLoreEnabled: true,
        promptBudgetMode: true,
        characterSheetId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        tags: {
          orderBy: { tag: { name: "asc" } },
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversations.map(mapConversationListItem));
  } catch (error: unknown) {
    logError("GET", PATH, error);
    return NextResponse.json(
      { error: "Unable to load conversations" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  logRequest("POST", PATH);

  let parsedBody: CreateConversationBody = {};

  try {
    const rawBody = await req.text();
    if (rawBody.trim().length > 0) {
      const json = JSON.parse(rawBody) as unknown;
      const body = parseCreateBody(json);
      if (!body) {
        return NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 },
        );
      }
      parsedBody = body;
    }
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = parsedBody.title?.trim() || "New conversation";
  const model = normalizeModelId(parsedBody.model);

  try {
    const conversation = await prisma.conversation.create({
      data: { title, model },
      select: {
        id: true,
        title: true,
        systemPrompt: true,
        model: true,
        autoLoreEnabled: true,
        promptBudgetMode: true,
        characterSheetId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(mapConversationListItem(conversation));
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json(
      { error: "Unable to create conversation" },
      { status: 500 },
    );
  }
}
