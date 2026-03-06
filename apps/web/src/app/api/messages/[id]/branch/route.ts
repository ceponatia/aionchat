import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import {
  buildConversationRequestMessages,
  createAssistantResponse,
  NoModelResponseError,
  loadOrderedConversationMessages,
} from "@/lib/message-helpers";
import { OpenRouterError } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import type { BranchRequestBody, BranchResponse } from "@/lib/types";

const BASE_PATH = "/api/messages";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseBranchBody(value: unknown): BranchRequestBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<BranchRequestBody>;
  if (typeof candidate.content !== "string") {
    return null;
  }

  return { content: candidate.content };
}

async function readBody(req: NextRequest): Promise<BranchRequestBody | NextResponse> {
  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    throw error;
  }

  const body = parseBranchBody(json);
  if (!body) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  const content = body.content.trim();
  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  return { content };
}

function toErrorResponse(path: string, error: unknown): NextResponse {
  logError("POST", path, error);

  if (error instanceof NoModelResponseError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (error instanceof OpenRouterError) {
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limited by upstream provider" },
        {
          status: 429,
          headers: error.retryAfter
            ? { "retry-after": error.retryAfter }
            : undefined,
        },
      );
    }

    if (error.status >= 500) {
      return NextResponse.json(
        { error: "Upstream provider error" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Chat request failed" },
      { status: error.status },
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: rawId } = await context.params;
  const id = rawId?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Message id is required" },
      { status: 400 },
    );
  }
  const path = `${BASE_PATH}/${id}/branch`;
  logRequest("POST", path);

  try {
    const body = await readBody(req);
    if (body instanceof NextResponse) {
      return body;
    }

    const targetMessage = await prisma.message.findUnique({
      where: { id },
      select: {
        id: true,
        conversationId: true,
        role: true,
      },
    });

    if (!targetMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (targetMessage.role !== "user") {
      return NextResponse.json(
        { error: "Can only branch from a user message" },
        { status: 400 },
      );
    }

    const orderedMessages = await loadOrderedConversationMessages(
      targetMessage.conversationId,
    );
    const targetIndex = orderedMessages.findIndex((message) => message.id === id);

    if (targetIndex < 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const prunedIds = orderedMessages
      .slice(targetIndex + 1)
      .map((message) => message.id);

    const [, deleteResult] = await prisma.$transaction([
      prisma.message.update({
        where: { id },
        data: { content: body.content },
      }),
      prunedIds.length > 0
        ? prisma.message.deleteMany({ where: { id: { in: prunedIds } } })
        : prisma.message.deleteMany({ where: { id: { in: [] } } }),
    ]);

    const requestMessages = await buildConversationRequestMessages(
      targetMessage.conversationId,
    );
    if (!requestMessages) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const assistantResponse = await createAssistantResponse(
      targetMessage.conversationId,
      requestMessages,
    );

    const responseBody: BranchResponse = {
      message: assistantResponse.message,
      pruned: deleteResult.count,
      usage: assistantResponse.usage,
    };

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    return toErrorResponse(path, error);
  }
}