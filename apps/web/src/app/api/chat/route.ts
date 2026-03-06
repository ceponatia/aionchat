import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import {
  buildConversationRequestMessages,
  NoModelResponseError,
  toInputJsonValue,
} from "@/lib/message-helpers";
import { prisma } from "@/lib/prisma";
import type {
  AionReasoningDetail,
  ChatRequestBody,
  ChatResponseBody,
} from "@/lib/types";

const METHOD = "POST";
const PATH = "/api/chat";
const REQUIRED_FIELDS_ERROR = "conversationId and content are required";

type ValidChatRequest = {
  conversationId: string;
  content: string;
};

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

function requiredFieldsResponse(): NextResponse {
  return NextResponse.json({ error: REQUIRED_FIELDS_ERROR }, { status: 400 });
}

async function parseValidRequestBody(
  req: NextRequest,
): Promise<ValidChatRequest | NextResponse> {
  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    throw err;
  }

  const body = parseBody(json);
  if (!body) {
    return requiredFieldsResponse();
  }

  const content = body.content.trim();
  const conversationId = body.conversationId.trim();
  if (!conversationId || !content) {
    return requiredFieldsResponse();
  }

  return { conversationId, content };
}

async function createChatResponseBody(
  conversationId: string,
  content: string,
): Promise<ChatResponseBody | NextResponse> {
  const messages = await buildConversationRequestMessages(conversationId);
  if (!messages) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  messages.push({ role: "user", content });

  const result = await chatCompletion(messages);
  const assistantMessage = result.choices[0]?.message;

  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new NoModelResponseError();
  }

  const [, savedAssistant] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content,
      },
    }),
    prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantMessage.content,
        reasoningDetails: toInputJsonValue(assistantMessage.reasoning_details),
      },
    }),
  ]);

  return {
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
}

function toErrorResponse(error: unknown): NextResponse {
  logError(METHOD, PATH, error);

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  logRequest(METHOD, PATH);

  try {
    const parsedRequest = await parseValidRequestBody(req);
    if (parsedRequest instanceof NextResponse) {
      return parsedRequest;
    }

    const { conversationId, content } = parsedRequest;

    const responseBody = await createChatResponseBody(conversationId, content);
    if (responseBody instanceof NextResponse) {
      return responseBody;
    }

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
