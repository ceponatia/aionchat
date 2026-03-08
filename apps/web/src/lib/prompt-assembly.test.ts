import { describe, expect, it } from "vitest";

import {
  assembleSystemMessage,
  buildPromptSegments,
  flattenPromptSegments,
  type AssemblyInput,
} from "@/lib/prompt-assembly";

function createInput(overrides: Partial<AssemblyInput> = {}): AssemblyInput {
  return {
    systemPrompt: "Stay in character.",
    model: "aion-labs/aion-2.0",
    promptBudgetMode: "balanced",
    characterSheet: {
      name: "Astra",
      tagline: "Watcher of the gate",
      personality: "Measured and observant",
      background: null,
      appearance: null,
      scenario: null,
      customInstructions: null,
    },
    summaryMemory: {
      summary: "The party recovered the sigil key.",
      coveredMessageCount: 8,
    },
    conversationTitle: "Siege at the old gate",
    autoLoreEnabled: true,
    loreEntries: [
      {
        loreEntryId: "lore-pinned",
        pinned: true,
        priority: 2,
        loreEntry: {
          title: "Gatehouse",
          type: "location",
          tags: ["gate"],
          body: "The gatehouse protects the northern road.",
          activationHints: [],
        },
      },
      {
        loreEntryId: "lore-matched",
        pinned: false,
        priority: 1,
        loreEntry: {
          title: "Sigil Key",
          type: "item",
          tags: ["sigil key", "key"],
          body: "An iron key etched with warding runes.",
          activationHints: ["warding"],
        },
      },
    ],
    recentMessages: [
      { role: "user", content: "We should test the sigil key on the gate." },
      { role: "assistant", content: "Astra studies the key's runes." },
    ],
    nextUserInput: "Use the sigil key on the gate.",
    ...overrides,
  };
}

describe("prompt-assembly", () => {
  it("builds ordered system context for pinned, matched, and summary segments", () => {
    const result = buildPromptSegments(createInput());

    expect(result.segments.map((segment) => segment.id)).toEqual([
      "system-prompt",
      "character-sheet",
      "pinned-lore:lore-pinned",
      "matched-lore:lore-matched",
      "summary-memory",
      "recent-messages",
    ]);
    expect(
      result.segments.find(
        (segment) => segment.id === "matched-lore:lore-matched",
      ),
    ).toMatchObject({
      reason: "matched-by-tag",
      included: true,
    });
    expect(result.systemMessage).toContain("Stay in character.");
    expect(result.systemMessage).toContain("## Character: Astra");
    expect(result.systemMessage).toContain("## Lore: Sigil Key");
    expect(result.systemMessage).toContain("Covered messages: 8");
    expect(result.systemMessage).not.toContain("### User 1");
    expect(result.budget.mode).toBe("balanced");
    expect(result.budget.overBudget).toBe(false);
  });

  it("marks matched lore disabled when auto lore is off and omits recent-only system output", () => {
    const result = buildPromptSegments(
      createInput({
        systemPrompt: null,
        characterSheet: null,
        summaryMemory: null,
        autoLoreEnabled: false,
        loreEntries: [
          {
            loreEntryId: "lore-matched",
            pinned: false,
            priority: 1,
            loreEntry: {
              title: "Sigil Key",
              type: "item",
              tags: ["sigil key"],
              body: "An iron key etched with warding runes.",
              activationHints: [],
            },
          },
        ],
      }),
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({
      id: "matched-lore:lore-matched",
      reason: "disabled",
      included: false,
    });
    expect(flattenPromptSegments(result.segments)).toBeNull();
    expect(
      assembleSystemMessage(
        createInput({
          systemPrompt: null,
          characterSheet: null,
          summaryMemory: null,
          loreEntries: [],
        }),
      ),
    ).toBeNull();
  });

  it("omits matched lore before pinned lore and summary when over budget", () => {
    const result = buildPromptSegments(
      createInput({
        promptBudgetMode: "aggressive",
        systemPrompt: "S".repeat(3000),
        characterSheet: {
          name: "Astra",
          tagline: null,
          personality: "P".repeat(2500),
          background: null,
          appearance: null,
          scenario: null,
          customInstructions: null,
        },
        summaryMemory: {
          summary: "M".repeat(2500),
          coveredMessageCount: 10,
        },
        loreEntries: [
          {
            loreEntryId: "p1",
            pinned: true,
            priority: 1,
            loreEntry: {
              title: "Pinned one",
              type: "location",
              tags: ["gate"],
              body: "A".repeat(1800),
              activationHints: [],
            },
          },
          {
            loreEntryId: "p2",
            pinned: true,
            priority: 2,
            loreEntry: {
              title: "Pinned two",
              type: "item",
              tags: ["key"],
              body: "B".repeat(1800),
              activationHints: [],
            },
          },
          {
            loreEntryId: "m1",
            pinned: false,
            priority: 3,
            loreEntry: {
              title: "Matched one",
              type: "rule",
              tags: ["sigil"],
              body: "C".repeat(1800),
              activationHints: [],
            },
          },
        ],
        nextUserInput: "sigil",
      }),
    );

    expect(result.budget.omittedSegmentIds).toEqual([
      "matched-lore:m1",
      "pinned-lore:p2",
      "pinned-lore:p1",
      "summary-memory",
    ]);
    expect(
      result.segments.find((segment) => segment.id === "summary-memory")
        ?.included,
    ).toBe(false);
    expect(result.budget.overBudget).toBe(false);
  });

  it("reports over-budget when required context alone exceeds budget", () => {
    const result = buildPromptSegments(
      createInput({
        promptBudgetMode: "aggressive",
        systemPrompt: "S".repeat(7000),
        characterSheet: {
          name: "Astra",
          tagline: null,
          personality: "P".repeat(5000),
          background: null,
          appearance: null,
          scenario: null,
          customInstructions: null,
        },
        summaryMemory: null,
        loreEntries: [],
      }),
    );

    expect(result.budget.overBudget).toBe(true);
    expect(result.budget.omittedSegmentIds).toEqual([]);
    expect(result.systemMessage).toContain("## Character: Astra");
  });

  it("preserves larger system context in high-budget mode", () => {
    const result = buildPromptSegments(
      createInput({
        promptBudgetMode: "high-budget",
        systemPrompt: "S".repeat(3000),
        characterSheet: {
          name: "Astra",
          tagline: null,
          personality: "P".repeat(2500),
          background: null,
          appearance: null,
          scenario: null,
          customInstructions: null,
        },
        summaryMemory: {
          summary: "M".repeat(2500),
          coveredMessageCount: 10,
        },
        loreEntries: [
          {
            loreEntryId: "p1",
            pinned: true,
            priority: 1,
            loreEntry: {
              title: "Pinned one",
              type: "location",
              tags: ["gate"],
              body: "A".repeat(1800),
              activationHints: [],
            },
          },
          {
            loreEntryId: "p2",
            pinned: true,
            priority: 2,
            loreEntry: {
              title: "Pinned two",
              type: "item",
              tags: ["key"],
              body: "B".repeat(1800),
              activationHints: [],
            },
          },
          {
            loreEntryId: "m1",
            pinned: false,
            priority: 3,
            loreEntry: {
              title: "Matched one",
              type: "rule",
              tags: ["sigil"],
              body: "C".repeat(1800),
              activationHints: [],
            },
          },
        ],
        nextUserInput: "sigil",
      }),
    );

    expect(result.budget.mode).toBe("high-budget");
    expect(result.budget.overBudget).toBe(false);
    expect(result.budget.omittedSegmentIds).toEqual([]);
    expect(result.systemMessage).toContain("## Character: Astra");
    expect(result.systemMessage).toContain("## Lore: Matched one");
  });
});
