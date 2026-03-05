import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const PATH = "/api/character-sheets";

interface CreateBody {
  name: string;
  tagline?: string;
  personality?: string;
  background?: string;
  appearance?: string;
  scenario?: string;
  customInstructions?: string;
}

function parseCreateBody(value: unknown): CreateBody | null {
  if (value === null || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string" || !candidate.name.trim()) return null;

  const optionalFields = [
    "tagline",
    "personality",
    "background",
    "appearance",
    "scenario",
    "customInstructions",
  ] as const;

  for (const key of optionalFields) {
    const val = candidate[key];
    if (val !== undefined && typeof val !== "string") return null;
  }

  const optionalString = (key: string): string | undefined => {
    const val = candidate[key];
    return typeof val === "string" ? val : undefined;
  };

  return {
    name: candidate.name as string,
    tagline: optionalString("tagline"),
    personality: optionalString("personality"),
    background: optionalString("background"),
    appearance: optionalString("appearance"),
    scenario: optionalString("scenario"),
    customInstructions: optionalString("customInstructions"),
  };
}

export async function GET(): Promise<NextResponse> {
  logRequest("GET", PATH);

  try {
    const sheets = await prisma.characterSheet.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        tagline: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { conversations: true } },
      },
    });

    return NextResponse.json(
      sheets.map((sheet) => ({
        id: sheet.id,
        name: sheet.name,
        tagline: sheet.tagline,
        createdAt: sheet.createdAt.toISOString(),
        updatedAt: sheet.updatedAt.toISOString(),
        conversationCount: sheet._count.conversations,
      })),
    );
  } catch (error: unknown) {
    logError("GET", PATH, error);
    return NextResponse.json(
      { error: "Unable to load character sheets" },
      { status: 500 },
    );
  }
}

function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function buildCreateData(body: CreateBody) {
  return {
    name: body.name.trim(),
    tagline: trimOrNull(body.tagline),
    personality: trimOrNull(body.personality),
    background: trimOrNull(body.background),
    appearance: trimOrNull(body.appearance),
    scenario: trimOrNull(body.scenario),
    customInstructions: trimOrNull(body.customInstructions),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  logRequest("POST", PATH);

  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parseCreateBody(json);
  if (!body) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const sheet = await prisma.characterSheet.create({
      data: buildCreateData(body),
    });

    return NextResponse.json({
      id: sheet.id,
      name: sheet.name,
      tagline: sheet.tagline,
      personality: sheet.personality,
      background: sheet.background,
      appearance: sheet.appearance,
      scenario: sheet.scenario,
      customInstructions: sheet.customInstructions,
      createdAt: sheet.createdAt.toISOString(),
      updatedAt: sheet.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    logError("POST", PATH, error);
    return NextResponse.json(
      { error: "Unable to create character sheet" },
      { status: 500 },
    );
  }
}
