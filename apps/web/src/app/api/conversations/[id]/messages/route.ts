import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";

const PATH = "/api/conversations";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type MessageRole = "user" | "assistant";

interface RawMessageRow {
  id: string;
  role: string;
  content: string;
  reasoningDetails: unknown;
  createdAt: Date;
}

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
}

function parseBefore(value: string | null): Date | null | "invalid" {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

function isValidMessageRole(role: string): role is MessageRole {
  return role === "user" || role === "assistant";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  const endpoint = `${PATH}/${id}/messages`;
  logRequest("GET", endpoint);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const limit = parseLimit(searchParams.get("limit"));
  const before = parseBefore(searchParams.get("before"));

  if (before === "invalid") {
    return NextResponse.json({ error: "Invalid before cursor" }, { status: 400 });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: normalizedId },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const rows = (await prisma.message.findMany({
      where: {
        conversationId: normalizedId,
        role: { in: ["user", "assistant"] },
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: {
        id: true,
        role: true,
        content: true,
        reasoningDetails: true,
        createdAt: true,
      },
    })) as RawMessageRow[];

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    pageRows.reverse();

    const messages = pageRows
      .filter((message) => isValidMessageRole(message.role))
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        reasoningDetails: message.reasoningDetails,
        createdAt: message.createdAt.toISOString(),
      }));

    const oldest = pageRows[0];
    const nextCursor = hasMore && oldest ? oldest.createdAt.toISOString() : null;

    return NextResponse.json({
      messages,
      hasMore,
      nextCursor,
    });
  } catch (error: unknown) {
    logError("GET", endpoint, error);
    return NextResponse.json(
      { error: "Unable to load paginated messages" },
      { status: 500 },
    );
  }
}
