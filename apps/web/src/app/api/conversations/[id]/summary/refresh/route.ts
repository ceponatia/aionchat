import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { refreshConversationSummary } from "@/lib/conversation-summary";
import { loadOrderedConversationMessages } from "@/lib/message-helpers";
import { OpenRouterError } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import type { RefreshConversationSummaryResponse } from "@/lib/types";

const BASE_PATH = "/api/conversations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toErrorResponse(path: string, error: unknown): NextResponse {
  logError("POST", path, error);

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
      { error: "Summary refresh failed" },
      { status: error.status },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  const path = `${BASE_PATH}/${id}/summary/refresh`;
  logRequest("POST", path);

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

    const orderedMessages = await loadOrderedConversationMessages(normalizedId);
    const summary = await refreshConversationSummary(
      normalizedId,
      orderedMessages,
    );
    const responseBody: RefreshConversationSummaryResponse = { summary };
    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    return toErrorResponse(path, error);
  }
}
