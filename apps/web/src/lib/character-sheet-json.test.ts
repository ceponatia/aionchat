import { describe, expect, it } from "vitest";

import {
  formatCharacterSheetExportData,
  parseCharacterSheetExportText,
} from "@/lib/character-sheet-json";

describe("character-sheet-json", () => {
  it("formats long prose fields as readable arrays", () => {
    const data = formatCharacterSheetExportData({
      name: "Mara Ellison",
      tagline: "Earnest high achiever",
      personality:
        "Mara is bright, anxious, and extremely eager to prove that she belongs in any room she enters.",
      background: null,
      appearance: null,
      scenario: null,
      customInstructions: null,
    });

    expect(data.tagline).toBe("Earnest high achiever");
    expect(data.personality).toEqual([
      "Mara is bright, anxious, and extremely eager to prove that she belongs in any room she",
      "enters.",
    ]);
  });

  it("parses readable arrays back into runtime strings", () => {
    const parsed = parseCharacterSheetExportText([
      "First paragraph line one.",
      "First paragraph line two.",
      "",
      "Second paragraph.",
    ]);

    expect(parsed).toBe(
      "First paragraph line one.\nFirst paragraph line two.\n\nSecond paragraph.",
    );
  });

  it("rejects invalid readable text values", () => {
    expect(parseCharacterSheetExportText(["ok", 123])).toBeUndefined();
  });
});