import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const BASE_PATH = "/api/conversations";

interface UpdateConversationBody {
  title: string;
}

function parseUpdateBody(value: unknown): UpdateConversationBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<UpdateConversationBody>;
  if (typeof candidate.title !== "string") {
    return null;
  }

  return { title: candidate.title };
}

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("GET", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: normalizedId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            reasoningDetails: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        reasoningDetails: message.reasoningDetails,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    logError("GET", `${BASE_PATH}/${id}`, error);
    return NextResponse.json(
      { error: "Unable to load conversation" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  logRequest("PATCH", `${BASE_PATH}/${id}`);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  let body: UpdateConversationBody;
  try {
    const json = (await req.json()) as unknown;
    const parsed = parseUpdateBody(json);
    if (!parsed) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    body = parsed;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const title = body.title.trim();
  if (!title) {
    return NextResponse.json(
      { error: "Title cannot be empty" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.conversation.update({
      where: { id: normalizedId },
      data: { title },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    logError("PATCH", `${BASE_PATH}/${id}`, error);

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
      { error: "Unable to rename conversation" },
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
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  try {
    await prisma.conversation.delete({ where: { id: normalizedId } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("DELETE", `${BASE_PATH}/${id}`, error);

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
      { error: "Unable to delete conversation" },
      { status: 500 },
    );
  }
}
