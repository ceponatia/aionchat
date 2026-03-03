import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const BASE_PATH = "/api/character-sheets";

type RouteContext = { params: Promise<{ id: string }> };

const CHARACTER_SHEET_FIELDS = {
  id: true,
  name: true,
  tagline: true,
  personality: true,
  background: true,
  appearance: true,
  scenario: true,
  customInstructions: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseUpdateBody(value: unknown): Record<string, string | null> | null {
  if (value === null || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const allowed = [
    "name",
    "tagline",
    "personality",
    "background",
    "appearance",
    "scenario",
    "customInstructions",
  ];

  const data: Record<string, string | null> = {};
  let hasField = false;

  for (const key of allowed) {
    if (!(key in candidate)) continue;
    const val = candidate[key];
    if (val === null) {
      data[key] = null;
    } else if (typeof val === "string") {
      data[key] = val.trim() || null;
    } else {
      return null;
    }
    hasField = true;
  }

  if (!hasField) return null;

  if ("name" in data && (data.name === null || data.name === "")) {
    return null;
  }

  return data;
}

function formatSheet(sheet: {
  id: string;
  name: string;
  tagline: string | null;
  personality: string | null;
  background: string | null;
  appearance: string | null;
  scenario: string | null;
  customInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
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
  };
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("GET", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Character sheet id is required" },
      { status: 400 },
    );
  }

  try {
    const sheet = await prisma.characterSheet.findUnique({
      where: { id: normalizedId },
      select: CHARACTER_SHEET_FIELDS,
    });

    if (!sheet) {
      return NextResponse.json(
        { error: "Character sheet not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(formatSheet(sheet));
  } catch (error: unknown) {
    logError("GET", `${BASE_PATH}/${id}`, error);
    return NextResponse.json(
      { error: "Unable to load character sheet" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("PATCH", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Character sheet id is required" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = parseUpdateBody(json);
  if (!data) {
    return NextResponse.json(
      { error: "At least one valid field is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.characterSheet.update({
      where: { id: normalizedId },
      data,
      select: CHARACTER_SHEET_FIELDS,
    });

    return NextResponse.json(formatSheet(updated));
  } catch (error: unknown) {
    logError("PATCH", `${BASE_PATH}/${id}`, error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Character sheet not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Unable to update character sheet" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("DELETE", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Character sheet id is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.characterSheet.delete({ where: { id: normalizedId } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("DELETE", `${BASE_PATH}/${id}`, error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Character sheet not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Unable to delete character sheet" },
      { status: 500 },
    );
  }
}
