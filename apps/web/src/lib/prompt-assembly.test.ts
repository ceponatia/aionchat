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
});
