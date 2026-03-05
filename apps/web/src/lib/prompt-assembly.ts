import "server-only";

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
}

export function assembleSystemMessage(input: AssemblyInput): string | null {
  const sections: string[] = [];

  if (input.systemPrompt?.trim()) {
    sections.push(input.systemPrompt.trim());
  }

  if (input.characterSheet) {
    const cs = input.characterSheet;
    const parts: string[] = [];

    parts.push(`## Character: ${cs.name}`);
    if (cs.tagline) parts.push(`*${cs.tagline}*`);
    if (cs.personality) parts.push(`### Personality\n${cs.personality}`);
    if (cs.background) parts.push(`### Background\n${cs.background}`);
    if (cs.appearance) parts.push(`### Appearance\n${cs.appearance}`);
    if (cs.scenario) parts.push(`### Scenario\n${cs.scenario}`);
    if (cs.customInstructions)
      parts.push(`### Instructions\n${cs.customInstructions}`);

    sections.push(parts.join("\n\n"));
  }

  return sections.length > 0 ? sections.join("\n\n---\n\n") : null;
}
