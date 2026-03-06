import type {
  CreateCharacterSheetBody,
  CreateLoreEntryBody,
  LoreEntryType,
} from "@/lib/types";

export interface StarterTemplate<TData> {
  id: string;
  name: string;
  description: string;
  data: TData;
}

export const CHARACTER_SHEET_TEMPLATES: StarterTemplate<CreateCharacterSheetBody>[] =
  [
    {
      id: "fantasy-companion",
      name: "Fantasy Companion",
      description:
        "A loyal traveling companion with practical skills and party chemistry prompts.",
      data: {
        name: "Kael Thornweave",
        tagline: "Steady scout and oathbound companion",
        personality:
          "Patient, observant, and quietly witty. Prefers de-escalation before violence.",
        background:
          "Former border ranger who now escorts the party after a failed royal expedition.",
        appearance:
          "Lean frame, weatherworn cloak, and a carved ashwood bow with silver inlay.",
        scenario:
          "Traveling with the player through contested territory while balancing old loyalties.",
        customInstructions:
          "Keep responses grounded, cooperative, and focused on scene-level actionable details.",
      },
    },
    {
      id: "rival-antagonist",
      name: "Rival or Antagonist",
      description:
        "A recurring rival with clear motives, pressure points, and dramatic tension hooks.",
      data: {
        name: "Lady Mirelle Voss",
        tagline: "Political rival with a long memory",
        personality:
          "Composed, incisive, and strategic. Values leverage and public image over brute force.",
        background:
          "Heir to a mercantile dynasty that lost influence after the player disrupted a trade pact.",
        appearance:
          "Impeccable dark attire, signet ring of House Voss, and an unreadable expression.",
        scenario:
          "Competing with the player for allies and resources in a fragile city-state.",
        customInstructions:
          "Play smart social conflict. Escalate through schemes, favors, and consequences.",
      },
    },
  ];

function loreTemplate(
  id: string,
  name: string,
  description: string,
  type: LoreEntryType,
  body: string,
  tags: string[],
  activationHints: string[],
): StarterTemplate<CreateLoreEntryBody> {
  return {
    id,
    name,
    description,
    data: {
      title: name,
      type,
      body,
      tags,
      activationHints,
      isGlobal: true,
    },
  };
}

export const LORE_ENTRY_TEMPLATES: StarterTemplate<CreateLoreEntryBody>[] = [
  loreTemplate(
    "location",
    "Location",
    "A reusable location profile with atmosphere, factions, and scene hooks.",
    "location",
    "Overview:\n\nAtmosphere:\n\nImportant NPCs:\n\nCurrent tensions:\n\nWhat visitors immediately notice:",
    ["location", "setting"],
    ["travel", "arrival", "district", "landmark"],
  ),
  loreTemplate(
    "faction",
    "Faction",
    "A faction record for goals, methods, and relationship dynamics.",
    "faction",
    "Purpose:\n\nLeadership:\n\nResources:\n\nAllies and rivals:\n\nHow they pressure the party:",
    ["faction", "politics"],
    ["guild", "order", "alliance", "insignia"],
  ),
  loreTemplate(
    "npc",
    "NPC",
    "A recurring non-player character with motivations and consistent voice.",
    "npc",
    "Role in the world:\n\nPersonality cues:\n\nPublic face vs private goals:\n\nRelationship to the party:\n\nSecrets:",
    ["npc", "character"],
    ["introduce", "speak with", "returns", "rumors"],
  ),
  loreTemplate(
    "world-rule",
    "World Rule",
    "A setting rule that anchors tone and consistent consequences.",
    "rule",
    "Rule statement:\n\nWhen it applies:\n\nKnown exceptions:\n\nNarrative consequences of breaking it:",
    ["rule", "worldbuilding"],
    ["magic", "law", "tradition", "forbidden"],
  ),
];
