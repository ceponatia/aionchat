import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import {
  NoModelResponseError,
  regenerateAssistantMessage,
} from "@/lib/message-helpers";
import { OpenRouterError } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import type { RegenerateResponse } from "@/lib/types";

const BASE_PATH = "/api/conversations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: rawId } = await context.params;
  const id = rawId?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  const path = `${BASE_PATH}/${id}/regenerate`;
  logRequest("POST", path);

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        role: true,
      },
    });

    if (!lastMessage) {
      return NextResponse.json(
        { error: "Conversation has no messages" },
        { status: 400 },
      );
    }

    if (lastMessage.role !== "assistant") {
      return NextResponse.json(
        { error: "Last message is not an assistant response" },
        { status: 400 },
      );
    }

    const result = await regenerateAssistantMessage(id, lastMessage.id);
    if (!result) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const responseBody: RegenerateResponse = {
      message: result.message,
      usage: result.usage,
    };

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    return toErrorResponse(path, error);
  }
}
