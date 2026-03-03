import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import type {
  AionMessage,
  AionReasoningDetail,
  ChatRequestBody,
  ChatResponseBody,
} from "@/lib/types";

const METHOD = "POST";
const PATH = "/api/chat";

function parseBody(value: unknown): ChatRequestBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<ChatRequestBody>;
  if (
    typeof candidate.conversationId !== "string" ||
    typeof candidate.content !== "string"
  ) {
    return null;
  }

  return {
    conversationId: candidate.conversationId,
    content: candidate.content,
  };
}

function toAionRole(role: string): AionMessage["role"] {
  if (role === "assistant" || role === "system") {
    return role;
  }
  return "user";
}

function toAionMessages(
  dbMessages: Array<{
    role: string;
    content: string;
    reasoningDetails: unknown;
  }>,
): AionMessage[] {
  return dbMessages.map((message) => {
    const aionMessage: AionMessage = {
      role: toAionRole(message.role),
      content: message.content,
    };

    if (Array.isArray(message.reasoningDetails)) {
      aionMessage.reasoning_details =
        message.reasoningDetails as AionReasoningDetail[];
    }

    return aionMessage;
  });
}

function toInputJsonValue(
  details: AionReasoningDetail[] | undefined,
): Prisma.InputJsonValue | undefined {
  if (!details) {
    return undefined;
  }

  return details as unknown as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  logRequest(METHOD, PATH);

  try {
    const json = (await req.json()) as unknown;
    const body = parseBody(json);
    if (!body) {
      return NextResponse.json(
        { error: "conversationId and content are required" },
        { status: 400 },
      );
    }

    const content = body.content.trim();
    if (!body.conversationId.trim() || !content) {
      return NextResponse.json(
        { error: "conversationId and content are required" },
        { status: 400 },
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const dbMessages = await prisma.message.findMany({
      where: { conversationId: body.conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        content: true,
        reasoningDetails: true,
      },
    });

    const messages = toAionMessages(dbMessages);
    messages.push({ role: "user", content });

    const result = await chatCompletion(messages);
    const assistantMessage = result.choices[0]?.message;

    if (!assistantMessage || typeof assistantMessage.content !== "string") {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 502 },
      );
    }

    const [, savedAssistant] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: body.conversationId,
          role: "user",
          content,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: body.conversationId,
          role: "assistant",
          content: assistantMessage.content,
          reasoningDetails: toInputJsonValue(
            assistantMessage.reasoning_details,
          ),
        },
      }),
    ]);

    const responseBody: ChatResponseBody = {
      message: {
        id: savedAssistant.id,
        role: "assistant",
        content: savedAssistant.content,
        reasoningDetails:
          (savedAssistant.reasoningDetails as AionReasoningDetail[] | null) ??
          null,
        createdAt: savedAssistant.createdAt.toISOString(),
      },
      usage: result.usage,
    };

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    logError(METHOD, PATH, error);

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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
