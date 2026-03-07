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

const BASE_PATH = "/api/conversations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toErrorResponse(path: string, error: unknown): NextResponse {
  logError("POST", path, error);

  if (error instanceof NoModelResponseError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  _req: NextRequest,
  context: RouteContext,
): Promise<Response> {
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
      select: { id: true, model: true },
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

    const orderedMessages = await loadOrderedConversationMessages(id);
    const filteredMessages = orderedMessages.filter(
      (message) => message.id !== lastMessage.id,
    );

    const requestMessages = await buildConversationRequestMessages(id, {
      orderedMessages: filteredMessages,
      useSummary: false,
    });
    if (!requestMessages) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const result = streamChatCompletion(requestMessages, {
      model: conversation.model,
      async onFinish({ text }) {
        const finalText = text.trim();
        if (!finalText) {
          throw new NoModelResponseError();
        }

        await prisma.$transaction(async (tx) => {
          await tx.message.delete({ where: { id: lastMessage.id } });
          await invalidateConversationSummary(id, tx);
          await tx.message.create({
            data: {
              conversationId: id,
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
