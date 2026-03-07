import { NextRequest, NextResponse } from "next/server";

import { invalidateConversationSummary } from "@/lib/conversation-summary";
import { logError, logRequest } from "@/lib/api-logger";
import {
  buildConversationRequestMessages,
  NoModelResponseError,
  loadOrderedConversationMessages,
} from "@/lib/message-helpers";
import { streamChatCompletion } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import type { BranchRequestBody } from "@/lib/types";

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

async function readBody(
  req: NextRequest,
): Promise<BranchRequestBody | NextResponse> {
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
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const content = body.content.trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  return { content };
}

function toErrorResponse(path: string, error: unknown): NextResponse {
  logError("POST", path, error);

  if (error instanceof NoModelResponseError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  req: NextRequest,
  context: RouteContext,
): Promise<Response> {
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
        conversation: {
          select: { model: true },
        },
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

    const targetIndex = orderedMessages.findIndex(
      (message) => message.id === id,
    );
    if (targetIndex < 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const messagesForContext = orderedMessages
      .slice(0, targetIndex + 1)
      .map((message) =>
        message.id === id ? { ...message, content: body.content } : message,
      );

    const prunedIds = orderedMessages
      .slice(targetIndex + 1)
      .map((message) => message.id);

    const requestMessages = await buildConversationRequestMessages(
      targetMessage.conversationId,
      {
        draftContent: body.content,
        orderedMessages: messagesForContext,
        useSummary: false,
      },
    );

    if (!requestMessages) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const result = streamChatCompletion(requestMessages, {
      model: targetMessage.conversation.model,
      async onFinish({ text }) {
        const finalText = text.trim();
        if (!finalText) {
          throw new NoModelResponseError();
        }

        await prisma.$transaction(async (tx) => {
          await tx.message.update({
            where: { id },
            data: { content: body.content },
          });
          if (prunedIds.length > 0) {
            await tx.message.deleteMany({ where: { id: { in: prunedIds } } });
          }
          await invalidateConversationSummary(targetMessage.conversationId, tx);
          await tx.message.create({
            data: {
              conversationId: targetMessage.conversationId,
              role: "assistant",
              content: finalText,
            },
          });
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    return toErrorResponse(path, error);
  }
}
