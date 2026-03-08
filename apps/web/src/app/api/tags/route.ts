import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const PATH = "/api/tags";

interface CreateTagBody {
  name: string;
  color?: string;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseBody(value: unknown): CreateTagBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CreateTagBody>;
  if (typeof candidate.name !== "string") {
    return null;
  }
  if (
    typeof candidate.color !== "undefined" &&
    typeof candidate.color !== "string"
  ) {
    return null;
  }

  const name = normalizeName(candidate.name);
  if (!name) {
    return null;
  }

  return {
    name,
    color: candidate.color?.trim() || undefined,
  };
}

export async function GET(): Promise<NextResponse> {
  logRequest("GET", PATH);

  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt.toISOString(),
      })),
    );
  } catch (error: unknown) {
    logError("GET", PATH, error);
    return NextResponse.json({ error: "Unable to load tags" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  logRequest("POST", PATH);

  let body: CreateTagBody | null = null;
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
      { error: "Tag name is required" },
      { status: 400 },
    );
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        name: body.name,
        color: body.color ?? "#6b7280",
      },
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
    logError("POST", PATH, error);
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
      { error: "Unable to create tag" },
      { status: 500 },
    );
  }
}
