import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const PATH = "/api/conversations";

interface CreateConversationBody {
  title?: string;
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

  return { title: candidate.title };
}

export async function GET(): Promise<NextResponse> {
  logRequest("GET", PATH);

  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        systemPrompt: true,
        characterSheetId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(
      conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        systemPrompt: conversation.systemPrompt,
        characterSheetId: conversation.characterSheetId,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: conversation._count.messages,
      })),
    );
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

  try {
    const conversation = await prisma.conversation.create({
      data: { title },
      select: {
        id: true,
        title: true,
        systemPrompt: true,
        characterSheetId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      systemPrompt: conversation.systemPrompt,
      characterSheetId: conversation.characterSheetId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: 0,
    });
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json(
      { error: "Unable to create conversation" },
      { status: 500 },
    );
  }
}
