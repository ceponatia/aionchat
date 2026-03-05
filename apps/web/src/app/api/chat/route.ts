import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import { assembleSystemMessage } from "@/lib/prompt-assembly";
import type {
  AionRequestMessage,
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

function toAionRole(role: string): AionRequestMessage["role"] {
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
): AionRequestMessage[] {
  return dbMessages.map((message) => {
    const aionMessage: AionRequestMessage = {
      role: toAionRole(message.role),
      content: message.content,
    };

    // Do not forward reasoning_details back to the model; it is response-only.

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

async function conversationExists(conversationId: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });

  return Boolean(conversation);
}

async function createChatResponseBody(
  conversationId: string,
  content: string,
): Promise<ChatResponseBody | NextResponse> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      systemPrompt: true,
      characterSheet: {
        select: {
          name: true,
          tagline: true,
          personality: true,
          background: true,
          appearance: true,
          scenario: true,
          customInstructions: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const systemMessage = assembleSystemMessage({
    systemPrompt: conversation.systemPrompt ?? null,
    characterSheet: conversation.characterSheet ?? null,
  });

  const dbMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      content: true,
      reasoningDetails: true,
    },
  });

  const messages = toAionMessages(dbMessages);

  if (systemMessage) {
    messages.unshift({ role: "system", content: systemMessage });
  }

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
    if (!(await conversationExists(conversationId))) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const responseBody = await createChatResponseBody(conversationId, content);
    if (responseBody instanceof NextResponse) {
      return responseBody;
    }

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
