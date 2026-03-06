import "server-only";

import type { Prisma } from "@prisma/client";

import { chatCompletion } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import { assembleSystemMessage } from "@/lib/prompt-assembly";
import type {
  AionChatResponse,
  AionReasoningDetail,
  AionRequestMessage,
  AssistantConversationMessage,
  ConversationMessage,
} from "@/lib/types";

interface ConversationConfigRow {
  systemPrompt: string | null;
  characterSheet: {
    name: string;
    tagline: string | null;
    personality: string | null;
    background: string | null;
    appearance: string | null;
    scenario: string | null;
    customInstructions: string | null;
  } | null;
}

export interface StoredMessageRow {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  reasoningDetails: unknown;
  createdAt: Date;
}

export class NoModelResponseError extends Error {
  constructor() {
    super("No response from model");
    this.name = "NoModelResponseError";
  }
}

function normalizeConversationRole(role: string): ConversationMessage["role"] {
  return role === "assistant" ? "assistant" : "user";
}

function toAionRole(role: string): AionRequestMessage["role"] {
  if (role === "assistant" || role === "system") {
    return role;
  }

  return "user";
}

function toAionMessages(
  messages: Array<Pick<StoredMessageRow, "role" | "content">>,
): AionRequestMessage[] {
  return messages.map((message) => ({
    role: toAionRole(message.role),
    content: message.content,
  }));
}

export function toInputJsonValue(
  details: AionReasoningDetail[] | undefined,
): Prisma.InputJsonValue | undefined {
  if (!details) {
    return undefined;
  }

  return details as unknown as Prisma.InputJsonValue;
}

export function toConversationMessage(
  message: Pick<StoredMessageRow, "id" | "role" | "content" | "reasoningDetails" | "createdAt">,
): ConversationMessage {
  return {
    id: message.id,
    role: normalizeConversationRole(message.role),
    content: message.content,
    reasoningDetails:
      (message.reasoningDetails as AionReasoningDetail[] | null) ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toAssistantConversationMessage(
  message: Pick<StoredMessageRow, "id" | "content" | "reasoningDetails" | "createdAt">,
): AssistantConversationMessage {
  return {
    id: message.id,
    role: "assistant",
    content: message.content,
    reasoningDetails:
      (message.reasoningDetails as AionReasoningDetail[] | null) ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

async function loadConversationConfig(
  conversationId: string,
): Promise<ConversationConfigRow | null> {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
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
}

export async function loadOrderedConversationMessages(
  conversationId: string,
): Promise<StoredMessageRow[]> {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      conversationId: true,
      role: true,
      content: true,
      reasoningDetails: true,
      createdAt: true,
    },
  });
}

export async function buildConversationRequestMessages(
  conversationId: string,
): Promise<AionRequestMessage[] | null> {
  const conversation = await loadConversationConfig(conversationId);
  if (!conversation) {
    return null;
  }

  const systemMessage = assembleSystemMessage({
    systemPrompt: conversation.systemPrompt,
    characterSheet: conversation.characterSheet,
  });

  const messages = toAionMessages(
    await loadOrderedConversationMessages(conversationId),
  );

  if (systemMessage) {
    messages.unshift({ role: "system", content: systemMessage });
  }

  return messages;
}

export async function createAssistantResponse(
  conversationId: string,
  requestMessages: AionRequestMessage[],
): Promise<{
  message: AssistantConversationMessage;
  usage?: AionChatResponse["usage"];
}> {
  const result = await chatCompletion(requestMessages);
  const assistantMessage = result.choices[0]?.message;

  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new NoModelResponseError();
  }

  const savedMessage = await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: assistantMessage.content,
      reasoningDetails: toInputJsonValue(assistantMessage.reasoning_details),
    },
    select: {
      id: true,
      content: true,
      reasoningDetails: true,
      createdAt: true,
    },
  });

  return {
    message: toAssistantConversationMessage(savedMessage),
    usage: result.usage,
  };
}