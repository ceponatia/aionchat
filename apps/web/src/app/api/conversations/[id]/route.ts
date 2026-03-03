import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const BASE_PATH = "/api/conversations";

type MessageRole = "user" | "assistant";

interface RawMessageRow {
  id: string;
  role: string;
  content: string;
  reasoningDetails: unknown;
  createdAt: Date;
}

function isValidMessageRole(role: string): role is MessageRole {
  return role === "user" || role === "assistant";
}

interface UpdateConversationBody {
  title?: string;
  systemPrompt?: string | null;
  characterSheetId?: string | null;
}

function parseUpdateBody(value: unknown): UpdateConversationBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const result: UpdateConversationBody = {};
  let hasField = false;

  if ("title" in candidate) {
    if (typeof candidate.title !== "string") return null;
    result.title = candidate.title;
    hasField = true;
  }

  if ("systemPrompt" in candidate) {
    if (
      candidate.systemPrompt !== null &&
      typeof candidate.systemPrompt !== "string"
    )
      return null;
    result.systemPrompt = candidate.systemPrompt as string | null;
    hasField = true;
  }

  if ("characterSheetId" in candidate) {
    if (
      candidate.characterSheetId !== null &&
      typeof candidate.characterSheetId !== "string"
    )
      return null;
    result.characterSheetId = candidate.characterSheetId as string | null;
    hasField = true;
  }

  return hasField ? result : null;
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
        systemPrompt: true,
        characterSheetId: true,
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
      systemPrompt: conversation.systemPrompt,
      characterSheetId: conversation.characterSheetId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: (conversation.messages as RawMessageRow[])
        .filter((message) => isValidMessageRole(message.role))
        .map((message) => ({
          id: message.id,
          role: message.role as MessageRole,
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

async function extractPatchBody(
  req: NextRequest,
): Promise<UpdateConversationBody | NextResponse> {
  try {
    const json = (await req.json()) as unknown;
    const parsed = parseUpdateBody(json);
    if (!parsed) {
      return NextResponse.json(
        { error: "At least one valid field is required" },
        { status: 400 },
      );
    }
    return parsed;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

async function validatePatchBody(
  body: UpdateConversationBody,
): Promise<NextResponse | null> {
  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json(
      { error: "Title cannot be empty" },
      { status: 400 },
    );
  }

  if (body.characterSheetId) {
    const exists = await prisma.characterSheet.findUnique({
      where: { id: body.characterSheetId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: "Character sheet not found" },
        { status: 400 },
      );
    }
  }

  return null;
}

function buildPatchData(
  body: UpdateConversationBody,
): Record<string, string | null> {
  const data: Record<string, string | null> = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if ("systemPrompt" in body) data.systemPrompt = body.systemPrompt ?? null;
  if ("characterSheetId" in body)
    data.characterSheetId = body.characterSheetId ?? null;
  return data;
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

  const bodyOrError = await extractPatchBody(req);
  if (bodyOrError instanceof NextResponse) return bodyOrError;

  const validationError = await validatePatchBody(bodyOrError);
  if (validationError) return validationError;

  try {
    const updated = await prisma.conversation.update({
      where: { id: normalizedId },
      data: buildPatchData(bodyOrError),
      select: {
        id: true,
        title: true,
        systemPrompt: true,
        characterSheetId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      systemPrompt: updated.systemPrompt,
      characterSheetId: updated.characterSheetId,
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
