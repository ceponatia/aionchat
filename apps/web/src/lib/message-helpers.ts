import "server-only";

import type { Prisma } from "@prisma/client";

import {
  invalidateConversationSummary,
  RECENT_MESSAGE_WINDOW,
} from "@/lib/conversation-summary";
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
  useSummary?: boolean;
}

interface ConversationSummaryRow {
  conversationId: string;
  sourceMessageId: string;
  coveredMessageCount: number;
  summary: string;
  stateSnapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationRequestContext {
  summary: ConversationSummaryRow | null;
  requestMessages: StoredMessageRow[];
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
  message: Pick<
    StoredMessageRow,
    "id" | "role" | "content" | "reasoningDetails" | "createdAt"
  >,
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
  message: Pick<
    StoredMessageRow,
    "id" | "content" | "reasoningDetails" | "createdAt"
  >,
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

async function loadConversationSummary(
  conversationId: string,
): Promise<ConversationSummaryRow | null> {
  return prisma.conversationSummary.findUnique({
    where: { conversationId },
    select: {
      conversationId: true,
      sourceMessageId: true,
      coveredMessageCount: true,
      summary: true,
      stateSnapshot: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

function buildConversationRequestContext(
  orderedMessages: StoredMessageRow[],
  summary: ConversationSummaryRow | null,
): ConversationRequestContext {
  if (summary) {
    const cutoffIndex = orderedMessages.findIndex(
      (message) => message.id === summary.sourceMessageId,
    );

    if (cutoffIndex >= 0) {
      const afterCutoff = orderedMessages.slice(cutoffIndex + 1);
      // Cap to RECENT_MESSAGE_WINDOW so the unsummarized window cannot grow
      // without bound if the summary is not refreshed promptly.
      const requestMessages =
        afterCutoff.length > RECENT_MESSAGE_WINDOW
          ? afterCutoff.slice(-RECENT_MESSAGE_WINDOW)
          : afterCutoff;
      if (requestMessages.length === 0) {
        console.warn(
          "Conversation summary cutoff resolved to an empty request window; falling back to recent-only history.",
          {
            conversationId: summary.conversationId,
            sourceMessageId: summary.sourceMessageId,
          },
        );
      } else {
        return {
          summary,
          requestMessages,
        };
      }
    } else {
      console.warn(
        "Conversation summary cutoff message is missing from the ordered history; falling back to recent-only history.",
        {
          conversationId: summary.conversationId,
          sourceMessageId: summary.sourceMessageId,
        },
      );
    }

    if (orderedMessages.length > RECENT_MESSAGE_WINDOW) {
      return {
        summary: null,
        requestMessages: orderedMessages.slice(-RECENT_MESSAGE_WINDOW),
      };
    }
  }

  if (orderedMessages.length > RECENT_MESSAGE_WINDOW) {
    return {
      summary: null,
      requestMessages: orderedMessages.slice(-RECENT_MESSAGE_WINDOW),
    };
  }

  return {
    summary: null,
    requestMessages: orderedMessages,
  };
}

export async function buildConversationRequestMessages(
  conversationId: string,
  options: BuildConversationRequestOptions = {},
): Promise<AionRequestMessage[] | null> {
  const orderedMessages =
    options.orderedMessages ??
    (await loadOrderedConversationMessages(conversationId));

  const assembly = await buildConversationPromptAssembly(conversationId, {
    ...options,
    orderedMessages,
  });
  if (!assembly) {
    return null;
  }

  // Prefer to reuse the requestContext built inside buildConversationPromptAssembly
  // to avoid reloading the summary and rebuilding the context.
  let requestContext =
    "requestContext" in assembly && assembly.requestContext
      ? assembly.requestContext
      : null;

  if (!requestContext) {
    const summary =
      options.useSummary === false
        ? null
        : await loadConversationSummary(conversationId);
    requestContext = buildConversationRequestContext(orderedMessages, summary);
  }
  const messages = toAionMessages(requestContext.requestMessages);

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
  const summary =
    options.useSummary === false
      ? null
      : await loadConversationSummary(conversationId);
  const requestContext = buildConversationRequestContext(
    orderedMessages,
    summary,
  );

  return buildPromptSegments({
    systemPrompt: conversation.systemPrompt,
    characterSheet: conversation.characterSheet,
    summaryMemory: requestContext.summary
      ? {
          summary: requestContext.summary.summary,
          coveredMessageCount: requestContext.summary.coveredMessageCount,
        }
      : null,
    conversationTitle: conversation.title,
    autoLoreEnabled: conversation.autoLoreEnabled,
    loreEntries: conversation.loreEntries,
    recentMessages: requestContext.requestMessages.map((message) => ({
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
  const requestMessages = await buildConversationRequestMessages(
    conversationId,
    {
      orderedMessages: filteredMessages,
      useSummary: false,
    },
  );
  if (!requestMessages) {
    return null;
  }

  const result = await chatCompletion(requestMessages);
  const assistantMessage = result.choices[0]?.message;
  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new NoModelResponseError();
  }

  const savedMessage = await prisma.$transaction(async (tx) => {
    await tx.message.delete({ where: { id: oldMessageId } });
    await invalidateConversationSummary(conversationId, tx);
    return tx.message.create({
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
  });

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
  const targetIndex = orderedMessages.findIndex(
    (m) => m.id === targetMessageId,
  );

  const messagesForContext = orderedMessages
    .slice(0, targetIndex + 1)
    .map((m) => (m.id === targetMessageId ? { ...m, content: newContent } : m));

  const prunedIds = orderedMessages.slice(targetIndex + 1).map((m) => m.id);

  const requestMessages = await buildConversationRequestMessages(
    conversationId,
    {
      draftContent: newContent,
      orderedMessages: messagesForContext,
      useSummary: false,
    },
  );
  if (!requestMessages) {
    return null;
  }

  const result = await chatCompletion(requestMessages);
  const assistantMessage = result.choices[0]?.message;
  if (!assistantMessage || typeof assistantMessage.content !== "string") {
    throw new NoModelResponseError();
  }

  const { savedMessage, deleteResult } = await prisma.$transaction(async (tx) => {
    await tx.message.update({
      where: { id: targetMessageId },
      data: { content: newContent },
    });
    const del = await tx.message.deleteMany({ where: { id: { in: prunedIds } } });
    await invalidateConversationSummary(conversationId, tx);
    const msg = await tx.message.create({
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
    return { savedMessage: msg, deleteResult: del };
  });

  return {
    message: toAssistantConversationMessage(savedMessage),
    pruned: deleteResult.count,
    usage: result.usage,
  };
}
