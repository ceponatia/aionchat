import "server-only";

import type { Prisma } from "@prisma/client";

import { chatCompletion } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import { buildPromptSegments } from "@/lib/prompt-assembly";
import type {
  AionChatResponse,
  AionReasoningDetail,
  AionRequestMessage,
  AssistantConversationMessage,
  ConversationMessage,
  PromptAssemblyResult,
} from "@/lib/types";

interface ConversationConfigRow {
  title: string;
  systemPrompt: string | null;
  autoLoreEnabled: boolean;
  characterSheet: {
    name: string;
    tagline: string | null;
    personality: string | null;
    background: string | null;
    appearance: string | null;
    scenario: string | null;
    customInstructions: string | null;
  } | null;
  loreEntries: Array<{
    loreEntryId: string;
    pinned: boolean;
    priority: number;
    loreEntry: {
      title: string;
      type: string;
      tags: string[];
      body: string;
      activationHints: string[];
    };
  }>;
}

interface BuildConversationRequestOptions {
  draftContent?: string;
  orderedMessages?: StoredMessageRow[];
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
      title: true,
      systemPrompt: true,
      autoLoreEnabled: true,
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
      loreEntries: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: {
          loreEntryId: true,
          pinned: true,
          priority: true,
          loreEntry: {
            select: {
              title: true,
              type: true,
              tags: true,
              body: true,
              activationHints: true,
            },
          },
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
  options: BuildConversationRequestOptions = {},
): Promise<AionRequestMessage[] | null> {
  const [assembly, orderedMessages] = await Promise.all([
    buildConversationPromptAssembly(conversationId, options),
    options.orderedMessages
      ? Promise.resolve(options.orderedMessages)
      : loadOrderedConversationMessages(conversationId),
  ]);

  if (!assembly) {
    return null;
  }

  const messages = toAionMessages(orderedMessages);

  if (assembly.systemMessage) {
    messages.unshift({ role: "system", content: assembly.systemMessage });
  }

  return messages;
}

export async function buildConversationPromptAssembly(
  conversationId: string,
  options: BuildConversationRequestOptions = {},
): Promise<PromptAssemblyResult | null> {
  const conversation = await loadConversationConfig(conversationId);
  if (!conversation) {
    return null;
  }

  const orderedMessages =
    options.orderedMessages ??
    (await loadOrderedConversationMessages(conversationId));

  return buildPromptSegments({
    systemPrompt: conversation.systemPrompt,
    characterSheet: conversation.characterSheet,
    conversationTitle: conversation.title,
    autoLoreEnabled: conversation.autoLoreEnabled,
    loreEntries: conversation.loreEntries,
    recentMessages: orderedMessages.map((message) => ({
      role: normalizeConversationRole(message.role),
      content: message.content,
    })),
    nextUserInput: options.draftContent ?? "",
  });
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

/**
 * Safely regenerates the last assistant message: calls the model first (with the
 * old message excluded from context), then atomically deletes the old message and
 * persists the new one. This prevents data loss if the model call fails.
 *
 * Returns null when the conversation is not found.
 */
export async function regenerateAssistantMessage(
  conversationId: string,
  oldMessageId: string,
): Promise<{
  message: AssistantConversationMessage;
  usage?: AionChatResponse["usage"];
} | null> {
  const allMessages = await loadOrderedConversationMessages(conversationId);
  const filteredMessages = allMessages.filter((m) => m.id !== oldMessageId);
  const requestMessages = await buildConversationRequestMessages(conversationId, {
    orderedMessages: filteredMessages,
  });
  if (!requestMessages) {
    return null;
  }

  const result = await chatCompletion(requestMessages);
  const assistantMessage = result.choices[0]?.message;
  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new NoModelResponseError();
  }

  const [, savedMessage] = await prisma.$transaction([
    prisma.message.delete({ where: { id: oldMessageId } }),
    prisma.message.create({
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
    }),
  ]);

  return {
    message: toAssistantConversationMessage(savedMessage),
    usage: result.usage,
  };
}

/**
 * Safely applies a branch operation: calls the model first (with the target
 * message content overridden and subsequent messages excluded from context),
 * then atomically updates the target message, deletes subsequent messages, and
 * persists the new assistant response. This prevents data loss if the model
 * call fails.
 *
 * Returns null when the conversation is not found. The caller is responsible
 * for ensuring the target message exists within `orderedMessages`.
 */
export async function branchConversationFromMessage(
  conversationId: string,
  targetMessageId: string,
  newContent: string,
  orderedMessages: StoredMessageRow[],
): Promise<{
  message: AssistantConversationMessage;
  pruned: number;
  usage?: AionChatResponse["usage"];
} | null> {
  const targetIndex = orderedMessages.findIndex((m) => m.id === targetMessageId);

  const messagesForContext = orderedMessages
    .slice(0, targetIndex + 1)
    .map((m) => (m.id === targetMessageId ? { ...m, content: newContent } : m));

  const prunedIds = orderedMessages
    .slice(targetIndex + 1)
    .map((m) => m.id);

  const requestMessages = await buildConversationRequestMessages(conversationId, {
    draftContent: newContent,
    orderedMessages: messagesForContext,
  });
  if (!requestMessages) {
    return null;
  }

  const result = await chatCompletion(requestMessages);
  const assistantMessage = result.choices[0]?.message;
  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new NoModelResponseError();
  }

  const [, deleteResult, savedMessage] = await prisma.$transaction([
    prisma.message.update({
      where: { id: targetMessageId },
      data: { content: newContent },
    }),
    prisma.message.deleteMany({ where: { id: { in: prunedIds } } }),
    prisma.message.create({
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
    }),
  ]);

  return {
    message: toAssistantConversationMessage(savedMessage),
    pruned: deleteResult.count,
    usage: result.usage,
  };
}