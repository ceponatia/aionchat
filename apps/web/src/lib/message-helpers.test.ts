import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockConversationFindUnique,
  mockConversationSummaryFindUnique,
  buildPromptSegmentsMock,
  chatCompletionMock,
} = vi.hoisted(() => ({
  mockConversationFindUnique: vi.fn(),
  mockConversationSummaryFindUnique: vi.fn(),
  buildPromptSegmentsMock: vi.fn(),
  chatCompletionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: mockConversationFindUnique,
    },
    message: {
      findMany: vi.fn(),
    },
    conversationSummary: {
      findUnique: mockConversationSummaryFindUnique,
    },
  },
}));

vi.mock("@/lib/prompt-assembly", () => ({
  buildPromptSegments: buildPromptSegmentsMock,
}));

vi.mock("@/lib/openrouter", () => ({
  chatCompletion: chatCompletionMock,
}));

import { RECENT_MESSAGE_WINDOW } from "@/lib/conversation-summary";
import {
  buildConversationPromptAssembly,
  buildConversationRequestMessages,
  toAssistantConversationMessage,
  toConversationMessage,
  toInputJsonValue,
  type StoredMessageRow,
} from "@/lib/message-helpers";

function createStoredMessage(
  id: string,
  role: string,
  content: string,
): StoredMessageRow {
  return {
    id,
    conversationId: "conv-1",
    role,
    content,
    reasoningDetails: null,
    createdAt: new Date(`2026-03-06T00:00:${id.padStart(2, "0")}Z`),
  };
}

describe("message-helpers serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationFindUnique.mockResolvedValue({
      title: "Gatehouse",
      systemPrompt: "Stay in character.",
      autoLoreEnabled: true,
      characterSheet: null,
      loreEntries: [],
    });
    buildPromptSegmentsMock.mockReturnValue({
      systemMessage: "SYSTEM BLOCK",
      segments: [],
    });
  });

  it("normalizes stored messages for conversation payloads", () => {
    const createdAt = new Date("2026-03-06T12:00:00.000Z");

    expect(
      toConversationMessage({
        id: "user-1",
        role: "system",
        content: "Ignored as system",
        reasoningDetails: [{ type: "plan", content: "Think" }],
        createdAt,
      }),
    ).toEqual({
      id: "user-1",
      role: "user",
      content: "Ignored as system",
      reasoningDetails: [{ type: "plan", content: "Think" }],
      createdAt: createdAt.toISOString(),
    });

    expect(
      toAssistantConversationMessage({
        id: "assistant-1",
        content: "A response",
        reasoningDetails: null,
        createdAt,
      }),
    ).toEqual({
      id: "assistant-1",
      role: "assistant",
      content: "A response",
      reasoningDetails: null,
      createdAt: createdAt.toISOString(),
    });
    expect(toInputJsonValue(undefined)).toBeUndefined();
  });
});

describe("message-helpers request context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationFindUnique.mockResolvedValue({
      title: "Gatehouse",
      systemPrompt: "Stay in character.",
      autoLoreEnabled: true,
      characterSheet: null,
      loreEntries: [],
    });
    buildPromptSegmentsMock.mockReturnValue({
      systemMessage: "SYSTEM BLOCK",
      segments: [],
    });
  });

  it("passes summary memory and only post-cutoff messages into prompt assembly", async () => {
    const orderedMessages = [
      createStoredMessage("01", "user", "Opening"),
      createStoredMessage("02", "assistant", "Reply"),
      createStoredMessage("03", "user", "Current turn"),
      createStoredMessage("04", "assistant", "Current reply"),
    ];

    mockConversationSummaryFindUnique.mockResolvedValue({
      conversationId: "conv-1",
      sourceMessageId: "02",
      coveredMessageCount: 2,
      summary: "Prior events",
      stateSnapshot: null,
      createdAt: new Date("2026-03-06T12:00:00.000Z"),
      updatedAt: new Date("2026-03-06T12:01:00.000Z"),
    });

    await buildConversationPromptAssembly("conv-1", {
      orderedMessages,
      draftContent: "Next move",
    });

    expect(buildPromptSegmentsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        summaryMemory: {
          summary: "Prior events",
          coveredMessageCount: 2,
        },
        recentMessages: [
          { role: "user", content: "Current turn" },
          { role: "assistant", content: "Current reply" },
        ],
        nextUserInput: "Next move",
      }),
    );
  });

  it("falls back to the recent message window when the summary cutoff is missing", async () => {
    const orderedMessages = Array.from({ length: 15 }, (_, index) =>
      createStoredMessage(
        String(index + 1),
        index % 2 === 0 ? "user" : "assistant",
        `Message ${index + 1}`,
      ),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockConversationSummaryFindUnique.mockResolvedValue({
      conversationId: "conv-1",
      sourceMessageId: "missing-id",
      coveredMessageCount: 3,
      summary: "Missing cutoff",
      stateSnapshot: null,
      createdAt: new Date("2026-03-06T12:00:00.000Z"),
      updatedAt: new Date("2026-03-06T12:01:00.000Z"),
    });

    const messages = await buildConversationRequestMessages("conv-1", {
      orderedMessages,
    });

    expect(messages).not.toBeNull();
    expect(messages?.[0]).toEqual({
      role: "system",
      content: "SYSTEM BLOCK",
    });
    expect(messages?.slice(1)).toHaveLength(RECENT_MESSAGE_WINDOW);
    expect(messages?.[1]).toEqual({
      role: "assistant",
      content: "Message 4",
    });
    expect(messages?.at(-1)).toEqual({
      role: "user",
      content: "Message 15",
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
