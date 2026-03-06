import "server-only";

import type {
  PromptAssemblyResult,
  PromptSegment,
  PromptSegmentReason,
} from "@/lib/types";

export interface CharacterSheetData {
  name: string;
  tagline: string | null;
  personality: string | null;
  background: string | null;
  appearance: string | null;
  scenario: string | null;
  customInstructions: string | null;
}

export interface AssemblyInput {
  systemPrompt: string | null;
  characterSheet: CharacterSheetData | null;
  summaryMemory: {
    summary: string;
    coveredMessageCount: number;
  } | null;
  conversationTitle: string;
  autoLoreEnabled: boolean;
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
  recentMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  nextUserInput: string;
}

function estimateChars(content: string): number {
  return content.length;
}

function formatCharacterSheet(characterSheet: CharacterSheetData): string {
  const cs = characterSheet;
  const parts: string[] = [];

  parts.push(`## Character: ${cs.name}`);
  if (cs.tagline) parts.push(`*${cs.tagline}*`);
  if (cs.personality) parts.push(`### Personality\n${cs.personality}`);
  if (cs.background) parts.push(`### Background\n${cs.background}`);
  if (cs.appearance) parts.push(`### Appearance\n${cs.appearance}`);
  if (cs.scenario) parts.push(`### Scenario\n${cs.scenario}`);
  if (cs.customInstructions) {
    parts.push(`### Instructions\n${cs.customInstructions}`);
  }

  return parts.join("\n\n");
}

function formatLoreEntry(entry: AssemblyInput["loreEntries"][number]): string {
  const tags = entry.loreEntry.tags.filter((tag) => tag.trim().length > 0);
  const header = `## Lore: ${entry.loreEntry.title}`;
  const typeLine = `Type: ${entry.loreEntry.type}`;
  const tagsLine = tags.length > 0 ? `Tags: ${tags.join(", ")}` : null;

  return [header, typeLine, tagsLine, entry.loreEntry.body.trim()]
    .filter((value): value is string =>
      Boolean(value && value.trim().length > 0),
    )
    .join("\n\n");
}

function formatRecentMessages(
  messages: AssemblyInput["recentMessages"],
): string {
  return messages
    .map((message, index) => {
      const label = message.role === "assistant" ? "Assistant" : "User";
      return `### ${label} ${index + 1}\n${message.content}`;
    })
    .join("\n\n");
}

function tokenize(value: string): Set<string> {
  const matches = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(matches);
}

function getMatchReason(
  entry: AssemblyInput["loreEntries"][number],
  haystack: string,
  tokens: Set<string>,
): Exclude<
  PromptSegmentReason,
  "attached" | "configured" | "recent-history" | "disabled"
> | null {
  for (const tag of entry.loreEntry.tags) {
    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag) {
      continue;
    }

    // First, try an exact token match (works for single-word tags).
    if (tokens.has(normalizedTag)) {
      return "matched-by-tag";
    }

    // For multi-word tags, fall back to token-wise and phrase-wise matching.
    if (normalizedTag.includes(" ")) {
      const tagTokens = tokenize(normalizedTag);
      for (const token of tagTokens) {
        if (tokens.has(token)) {
          return "matched-by-tag";
        }
      }

      if (haystack.includes(normalizedTag)) {
        return "matched-by-tag";
      }
    }
  }

  for (const hint of entry.loreEntry.activationHints) {
    const normalizedHint = hint.trim().toLowerCase();
    if (normalizedHint && haystack.includes(normalizedHint)) {
      return "matched-by-hint";
    }
  }

  return null;
}

function toSegment(
  segment: Omit<PromptSegment, "estimatedChars">,
): PromptSegment {
  return {
    ...segment,
    estimatedChars: estimateChars(segment.content),
  };
}

function isSystemContextSegment(segment: PromptSegment): boolean {
  return segment.kind !== "recent-messages";
}

function buildSummaryMemorySegment(
  summaryMemory: NonNullable<AssemblyInput["summaryMemory"]>,
): PromptSegment {
  return toSegment({
    id: "summary-memory",
    kind: "summary-memory",
    title: "Summary Memory",
    reason: "generated-summary",
    content: [
      `Covered messages: ${summaryMemory.coveredMessageCount}`,
      summaryMemory.summary.trim(),
    ].join("\n\n"),
    included: true,
  });
}

export function flattenPromptSegments(
  segments: PromptSegment[],
): string | null {
  const includedSections = segments
    .filter((segment) => segment.included && isSystemContextSegment(segment))
    .map((segment) => segment.content.trim())
    .filter((content) => content.length > 0);

  return includedSections.length > 0
    ? includedSections.join("\n\n---\n\n")
    : null;
}

export function buildPromptSegments(
  input: AssemblyInput,
): PromptAssemblyResult {
  const segments: PromptSegment[] = [];
  const conversationContext = [input.conversationTitle, input.nextUserInput]
    .filter((value) => value.trim().length > 0)
    .join("\n\n")
    .toLowerCase();
  const contextTokens = tokenize(conversationContext);

  if (input.systemPrompt?.trim()) {
    segments.push(
      toSegment({
        id: "system-prompt",
        kind: "system-prompt",
        title: "System Prompt",
        reason: "configured",
        content: input.systemPrompt.trim(),
        included: true,
      }),
    );
  }

  if (input.characterSheet) {
    segments.push(
      toSegment({
        id: "character-sheet",
        kind: "character-sheet",
        title: input.characterSheet.name,
        reason: "attached",
        content: formatCharacterSheet(input.characterSheet),
        included: true,
      }),
    );
  }

  const orderedLoreEntries = [...input.loreEntries].sort(
    (left, right) => left.priority - right.priority,
  );

  for (const entry of orderedLoreEntries.filter((item) => item.pinned)) {
    segments.push(
      toSegment({
        id: `pinned-lore:${entry.loreEntryId}`,
        kind: "pinned-lore",
        title: entry.loreEntry.title,
        reason: "attached",
        content: formatLoreEntry(entry),
        included: true,
      }),
    );
  }

  for (const entry of orderedLoreEntries.filter((item) => !item.pinned)) {
    const matchReason = getMatchReason(
      entry,
      conversationContext,
      contextTokens,
    );
    if (!matchReason) {
      continue;
    }

    segments.push(
      toSegment({
        id: `matched-lore:${entry.loreEntryId}`,
        kind: "matched-lore",
        title: entry.loreEntry.title,
        reason: input.autoLoreEnabled ? matchReason : "disabled",
        content: formatLoreEntry(entry),
        included: input.autoLoreEnabled,
      }),
    );
  }

  if (input.summaryMemory) {
    segments.push(buildSummaryMemorySegment(input.summaryMemory));
  }

  if (input.recentMessages.length > 0) {
    const content = formatRecentMessages(input.recentMessages);
    segments.push(
      toSegment({
        id: "recent-messages",
        kind: "recent-messages",
        title: "Recent Verbatim Messages",
        reason: "recent-history",
        content,
        included: true,
      }),
    );
  }

  return {
    systemMessage: flattenPromptSegments(segments),
    segments,
  };
}

export function assembleSystemMessage(input: AssemblyInput): string | null {
  return buildPromptSegments(input).systemMessage;
}
