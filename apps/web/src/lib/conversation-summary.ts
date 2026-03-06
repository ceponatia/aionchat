import "server-only";

import { Prisma } from "@prisma/client";

import { chatCompletion, OpenRouterError } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";
import type {
  AionRequestMessage,
  ConversationSummaryDetail,
  ConversationSummaryState,
} from "@/lib/types";

export const RECENT_MESSAGE_WINDOW = 12;
export const MIN_SUMMARY_SOURCE_MESSAGES = 3;
export const MIN_SUMMARY_MESSAGE_COUNT =
  RECENT_MESSAGE_WINDOW + MIN_SUMMARY_SOURCE_MESSAGES;

type SummaryDbClient = Prisma.TransactionClient | typeof prisma;

interface SummaryMessageRow {
  id: string;
  role: string;
  content: string;
}

interface SummaryConversationRow {
  id: string;
  summaryInvalidatedAt: Date | null;
  summaryRefreshError: string | null;
  _count: { messages: number };
  summary: {
    conversationId: string;
    sourceMessageId: string;
    coveredMessageCount: number;
    summary: string;
    stateSnapshot: unknown;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

function toDetail(
  summary: NonNullable<SummaryConversationRow["summary"]>,
): ConversationSummaryDetail {
  return {
    conversationId: summary.conversationId,
    sourceMessageId: summary.sourceMessageId,
    coveredMessageCount: summary.coveredMessageCount,
    summary: summary.summary,
    stateSnapshot: summary.stateSnapshot ?? null,
    createdAt: summary.createdAt.toISOString(),
    updatedAt: summary.updatedAt.toISOString(),
  };
}

function formatSummaryTranscript(messages: SummaryMessageRow[]): string {
  return messages
    .map((message, index) => {
      const label = message.role === "assistant" ? "Assistant" : "User";
      return `${index + 1}. ${label}:\n${message.content.trim()}`;
    })
    .join("\n\n");
}

function buildSummaryMessages(
  messages: SummaryMessageRow[],
): AionRequestMessage[] {
  return [
    {
      role: "system",
      content:
        "You summarize roleplay conversations for continuity. Write a concise rolling memory that captures durable facts, current circumstances, unresolved threads, relationships, locations, inventory or condition changes, and anything the assistant must remember for future turns. Do not invent details. Prefer compact paragraphs with short bullet lists only when they improve clarity.",
    },
    {
      role: "user",
      content: [
        "Summarize the following conversation history into durable memory for future turns.",
        "Focus on stable facts, current scene state, important emotional or interpersonal developments, unresolved hooks, and explicit commitments.",
        "Transcript:",
        formatSummaryTranscript(messages),
      ].join("\n\n"),
    },
  ];
}

function summarizeFailureMessage(error: unknown): string {
  if (error instanceof OpenRouterError) {
    if (error.status === 429) {
      return "Summary generation was rate limited by the provider.";
    }

    if (error.status >= 500) {
      return "Summary generation failed because the provider returned an upstream error.";
    }

    return "Summary generation failed because the provider rejected the request.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Summary generation failed.";
}

async function loadSummaryConversation(
  conversationId: string,
): Promise<SummaryConversationRow | null> {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      summaryInvalidatedAt: true,
      summaryRefreshError: true,
      _count: { select: { messages: true } },
      summary: {
        select: {
          conversationId: true,
          sourceMessageId: true,
          coveredMessageCount: true,
          summary: true,
          stateSnapshot: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function invalidateConversationSummary(
  conversationId: string,
  db: SummaryDbClient = prisma,
): Promise<void> {
  await Promise.all([
    db.conversationSummary.deleteMany({ where: { conversationId } }),
    db.conversation.update({
      where: { id: conversationId },
      data: {
        summaryInvalidatedAt: new Date(),
        summaryRefreshError: null,
      },
    }),
  ]);
}

export async function recordConversationSummaryFailure(
  conversationId: string,
  error: unknown,
  db: SummaryDbClient = prisma,
): Promise<void> {
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      summaryRefreshError: summarizeFailureMessage(error),
    },
  });
}

export async function getConversationSummaryState(
  conversationId: string,
): Promise<ConversationSummaryState | null> {
  const conversation = await loadSummaryConversation(conversationId);
  if (!conversation) {
    return null;
  }

  if (conversation.summary) {
    return {
      status: "available",
      summary: toDetail(conversation.summary),
      messageCount: conversation._count.messages,
      recentMessageWindow: RECENT_MESSAGE_WINDOW,
      minimumSummaryMessages: MIN_SUMMARY_MESSAGE_COUNT,
      fallbackMode: "summary",
      invalidatedAt: null,
      failureMessage: null,
    };
  }

  const messageCount = conversation._count.messages;
  const fallbackMode =
    messageCount > RECENT_MESSAGE_WINDOW ? "recent-only" : "full-history";

  if (messageCount < MIN_SUMMARY_MESSAGE_COUNT) {
    return {
      status: "not-ready",
      summary: null,
      messageCount,
      recentMessageWindow: RECENT_MESSAGE_WINDOW,
      minimumSummaryMessages: MIN_SUMMARY_MESSAGE_COUNT,
      fallbackMode,
      invalidatedAt: null,
      failureMessage: null,
    };
  }

  if (conversation.summaryRefreshError) {
    return {
      status: "failed",
      summary: null,
      messageCount,
      recentMessageWindow: RECENT_MESSAGE_WINDOW,
      minimumSummaryMessages: MIN_SUMMARY_MESSAGE_COUNT,
      fallbackMode,
      invalidatedAt: conversation.summaryInvalidatedAt?.toISOString() ?? null,
      failureMessage: conversation.summaryRefreshError,
    };
  }

  if (conversation.summaryInvalidatedAt) {
    return {
      status: "invalidated",
      summary: null,
      messageCount,
      recentMessageWindow: RECENT_MESSAGE_WINDOW,
      minimumSummaryMessages: MIN_SUMMARY_MESSAGE_COUNT,
      fallbackMode,
      invalidatedAt: conversation.summaryInvalidatedAt.toISOString(),
      failureMessage: null,
    };
  }

  return {
    status: "eligible",
    summary: null,
    messageCount,
    recentMessageWindow: RECENT_MESSAGE_WINDOW,
    minimumSummaryMessages: MIN_SUMMARY_MESSAGE_COUNT,
    fallbackMode,
    invalidatedAt: null,
    failureMessage: null,
  };
}

export async function refreshConversationSummary(
  conversationId: string,
  orderedMessages: SummaryMessageRow[],
): Promise<ConversationSummaryDetail> {
  const summarySourceMessages = orderedMessages.slice(
    0,
    -RECENT_MESSAGE_WINDOW,
  );
  if (summarySourceMessages.length < MIN_SUMMARY_SOURCE_MESSAGES) {
    throw new Error(
      `Not enough conversation history to generate a summary yet. At least ${MIN_SUMMARY_MESSAGE_COUNT} messages are required.`,
    );
  }

  try {
    const result = await chatCompletion(
      buildSummaryMessages(summarySourceMessages),
    );
    const assistantMessage = result.choices[0]?.message;

    if (!assistantMessage || typeof assistantMessage.content !== "string") {
      throw new Error("No response from model");
    }

    const sourceMessageId =
      summarySourceMessages[summarySourceMessages.length - 1]?.id;
    if (!sourceMessageId) {
      throw new Error("Unable to determine summary cutoff.");
    }

    const [, savedSummary] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          summaryInvalidatedAt: null,
          summaryRefreshError: null,
        },
      }),
      prisma.conversationSummary.upsert({
        where: { conversationId },
        update: {
          sourceMessageId,
          coveredMessageCount: summarySourceMessages.length,
          summary: assistantMessage.content.trim(),
          stateSnapshot: Prisma.JsonNull,
        },
        create: {
          conversationId,
          sourceMessageId,
          coveredMessageCount: summarySourceMessages.length,
          summary: assistantMessage.content.trim(),
          stateSnapshot: Prisma.JsonNull,
        },
        select: {
          conversationId: true,
          sourceMessageId: true,
          coveredMessageCount: true,
          summary: true,
          stateSnapshot: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return toDetail(savedSummary);
  } catch (error: unknown) {
    await recordConversationSummaryFailure(conversationId, error);
    throw error;
  }
}
