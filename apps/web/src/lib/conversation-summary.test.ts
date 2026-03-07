import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  chatCompletionMock,
  mockConversationFindUnique,
  mockConversationUpdate,
  mockConversationSummaryDeleteMany,
  mockConversationSummaryUpsert,
  mockTransaction,
} = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
  mockConversationFindUnique: vi.fn(),
  mockConversationUpdate: vi.fn(),
  mockConversationSummaryDeleteMany: vi.fn(),
  mockConversationSummaryUpsert: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/openrouter", () => {
  class MockOpenRouterError extends Error {
    readonly status: number;
    readonly body: string;
    readonly retryAfter: string | null;

    constructor(status: number, body: string, retryAfter: string | null) {
      super(`OpenRouter API error (${status}): ${body}`);
      this.name = "OpenRouterError";
      this.status = status;
      this.body = body;
      this.retryAfter = retryAfter;
    }
  }

  return {
    chatCompletion: chatCompletionMock,
    OpenRouterError: MockOpenRouterError,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: mockConversationFindUnique,
      update: mockConversationUpdate,
    },
    conversationSummary: {
      deleteMany: mockConversationSummaryDeleteMany,
      upsert: mockConversationSummaryUpsert,
    },
    $transaction: mockTransaction,
  },
}));

import {
  MIN_SUMMARY_MESSAGE_COUNT,
  getConversationSummaryState,
  recordConversationSummaryFailure,
  refreshConversationSummary,
} from "@/lib/conversation-summary";
import { OpenRouterError } from "@/lib/openrouter";

function createConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-1",
    summaryInvalidatedAt: null,
    summaryRefreshError: null,
    _count: { messages: MIN_SUMMARY_MESSAGE_COUNT },
    summary: null,
    ...overrides,
  };
}

describe("conversation-summary state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationUpdate.mockReturnValue({ ok: true });
    mockConversationSummaryDeleteMany.mockReturnValue({ count: 1 });
    mockConversationSummaryUpsert.mockReturnValue({
      conversationId: "conv-1",
      sourceMessageId: "03",
      coveredMessageCount: 3,
      summary: "Trimmed summary",
      stateSnapshot: null,
      createdAt: new Date("2026-03-06T12:00:00.000Z"),
      updatedAt: new Date("2026-03-06T12:01:00.000Z"),
    });
    mockTransaction.mockImplementation(async (operations) => operations);
  });

  it("reports summary availability and fallback states from conversation metadata", async () => {
    mockConversationFindUnique.mockResolvedValueOnce(
      createConversationRow({
        _count: { messages: 20 },
        summary: {
          conversationId: "conv-1",
          sourceMessageId: "09",
          coveredMessageCount: 9,
          summary: "Current summary",
          stateSnapshot: null,
          createdAt: new Date("2026-03-06T12:00:00.000Z"),
          updatedAt: new Date("2026-03-06T12:01:00.000Z"),
        },
      }),
    );
    mockConversationFindUnique.mockResolvedValueOnce(
      createConversationRow({
        _count: { messages: MIN_SUMMARY_MESSAGE_COUNT - 1 },
      }),
    );
    mockConversationFindUnique.mockResolvedValueOnce(
      createConversationRow({
        summaryRefreshError: "provider down",
        summaryInvalidatedAt: new Date("2026-03-06T12:02:00.000Z"),
      }),
    );
    mockConversationFindUnique.mockResolvedValueOnce(
      createConversationRow({
        summaryInvalidatedAt: new Date("2026-03-06T12:03:00.000Z"),
      }),
    );
    mockConversationFindUnique.mockResolvedValueOnce(createConversationRow());

    await expect(getConversationSummaryState("conv-1")).resolves.toMatchObject({
      status: "available",
      fallbackMode: "recent-only",
      summary: {
        coveredMessageCount: 9,
        summary: "Current summary",
      },
    });
    await expect(getConversationSummaryState("conv-1")).resolves.toMatchObject({
      status: "not-ready",
      fallbackMode: "recent-only",
    });
    await expect(getConversationSummaryState("conv-1")).resolves.toMatchObject({
      status: "failed",
      failureMessage: "provider down",
    });
    await expect(getConversationSummaryState("conv-1")).resolves.toMatchObject({
      status: "invalidated",
    });
    await expect(getConversationSummaryState("conv-1")).resolves.toMatchObject({
      status: "eligible",
      failureMessage: null,
    });
  });

  it("records provider failures with a user-facing summary message", async () => {
    await recordConversationSummaryFailure(
      "conv-1",
      new OpenRouterError(429, "busy", null),
    );

    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: {
        summaryRefreshError:
          "Summary generation was rate limited by the provider.",
      },
    });
  });
});

describe("conversation-summary refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationUpdate.mockReturnValue({ ok: true });
    mockConversationSummaryDeleteMany.mockReturnValue({ count: 1 });
    mockConversationSummaryUpsert.mockReturnValue({
      conversationId: "conv-1",
      sourceMessageId: "03",
      coveredMessageCount: 3,
      summary: "Trimmed summary",
      stateSnapshot: null,
      createdAt: new Date("2026-03-06T12:00:00.000Z"),
      updatedAt: new Date("2026-03-06T12:01:00.000Z"),
    });
    mockTransaction.mockImplementation(async (operations) => operations);
  });

  it("stores a refreshed summary using only the non-recent source messages", async () => {
    chatCompletionMock.mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "  Trimmed summary  ",
          },
          finish_reason: "stop",
        },
      ],
    });

    const orderedMessages = Array.from({ length: 15 }, (_, index) => ({
      id: String(index + 1).padStart(2, "0"),
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index + 1}`,
    }));

    const detail = await refreshConversationSummary("conv-1", orderedMessages);

    expect(chatCompletionMock).toHaveBeenCalledWith([
      expect.objectContaining({ role: "system" }),
      expect.objectContaining({
        role: "user",
        content: expect.stringContaining("1. User:\nMessage 1"),
      }),
    ]);
    expect(mockConversationSummaryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          sourceMessageId: "03",
          coveredMessageCount: 3,
          summary: "Trimmed summary",
        }),
        create: expect.objectContaining({
          sourceMessageId: "03",
          coveredMessageCount: 3,
          summary: "Trimmed summary",
        }),
      }),
    );
    expect(detail).toMatchObject({
      conversationId: "conv-1",
      sourceMessageId: "03",
      coveredMessageCount: 3,
      summary: "Trimmed summary",
    });
  });

  it("persists a generic refresh failure before rethrowing", async () => {
    chatCompletionMock.mockRejectedValue(new Error("network timeout"));

    const orderedMessages = Array.from({ length: 15 }, (_, index) => ({
      id: String(index + 1).padStart(2, "0"),
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index + 1}`,
    }));

    await expect(
      refreshConversationSummary("conv-1", orderedMessages),
    ).rejects.toThrow("network timeout");
    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: {
        summaryRefreshError: "network timeout",
      },
    });
  });
});
