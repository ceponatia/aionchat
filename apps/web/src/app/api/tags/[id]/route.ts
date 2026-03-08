import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const BASE_PATH = "/api/tags";

interface UpdateTagBody {
  name?: string;
  color?: string;
}

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseBody(value: unknown): UpdateTagBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const body: UpdateTagBody = {};
  let hasField = false;

  if ("name" in candidate) {
    if (typeof candidate.name !== "string") {
      return null;
    }
    const name = normalizeName(candidate.name);
    if (!name) {
      return null;
    }
    body.name = name;
    hasField = true;
  }

  if ("color" in candidate) {
    if (typeof candidate.color !== "string") {
      return null;
    }
    const color = candidate.color.trim();
    if (!color) {
      return null;
    }
    body.color = color;
    hasField = true;
  }

  return hasField ? body : null;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("PATCH", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
  }

  let body: UpdateTagBody | null = null;
  try {
    body = parseBody((await req.json()) as unknown);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!body) {
    return NextResponse.json(
      { error: "At least one valid field is required" },
      { status: 400 },
    );
  }

  try {
    const tag = await prisma.tag.update({
      where: { id: normalizedId },
      data: body,
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    logError("PATCH", `${BASE_PATH}/${id}`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A tag with that name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Unable to update tag" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("DELETE", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
  }

  try {
    await prisma.tag.delete({ where: { id: normalizedId } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("DELETE", `${BASE_PATH}/${id}`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Unable to delete tag" },
      { status: 500 },
    );
  }
}
