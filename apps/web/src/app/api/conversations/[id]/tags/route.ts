import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";
import type { UpdateConversationTagsBody } from "@/lib/types";

const BASE_PATH = "/api/conversations";

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBody(value: unknown): UpdateConversationTagsBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<UpdateConversationTagsBody>;
  if (!Array.isArray(candidate.tagIds)) {
    return null;
  }

  const ids = new Set<string>();
  const tagIds: string[] = [];
  for (const tagId of candidate.tagIds) {
    if (typeof tagId !== "string") {
      return null;
    }
    const normalized = tagId.trim();
    if (!normalized || ids.has(normalized)) {
      return null;
    }
    ids.add(normalized);
    tagIds.push(normalized);
  }

  return { tagIds };
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("PUT", `${BASE_PATH}/${id}/tags`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  let body: UpdateConversationTagsBody | null = null;
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
      { error: "tagIds must be a unique string array" },
      { status: 400 },
    );
  }

  try {
    const tags = await prisma.tag.findMany({
      where: { id: { in: body.tagIds } },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    });

    if (tags.length !== body.tagIds.length) {
      return NextResponse.json(
        { error: "One or more tags were not found" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.conversation.findUniqueOrThrow({
        where: { id: normalizedId },
        select: { id: true },
      });
      await tx.conversationTag.deleteMany({
        where: { conversationId: normalizedId },
      });
      if (body.tagIds.length > 0) {
        await tx.conversationTag.createMany({
          data: body.tagIds.map((tagId) => ({
            conversationId: normalizedId,
            tagId,
          })),
        });
      }
    });

    return NextResponse.json(tags);
  } catch (error: unknown) {
    logError("PUT", `${BASE_PATH}/${id}/tags`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Unable to update conversation tags" },
      { status: 500 },
    );
  }
}
