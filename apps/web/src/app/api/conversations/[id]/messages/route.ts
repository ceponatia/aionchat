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

interface PageCursor {
  createdAt: string;
  id: string;
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

function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function parseCursor(value: string | null): PageCursor | null | "invalid" {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("createdAt" in parsed) ||
      !("id" in parsed)
    ) {
      return "invalid";
    }
    const { createdAt, id } = parsed as Record<string, unknown>;
    if (typeof createdAt !== "string" || typeof id !== "string") {
      return "invalid";
    }
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "invalid";
    return { createdAt, id };
  } catch {
    return "invalid";
  }
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
  const cursor = parseCursor(searchParams.get("before"));

  if (cursor === "invalid") {
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

    const cursorDate = cursor ? new Date(cursor.createdAt) : null;

    const rows = (await prisma.message.findMany({
      where: {
        conversationId: normalizedId,
        role: { in: ["user", "assistant"] },
        ...(cursor && cursorDate
          ? {
              OR: [
                { createdAt: { lt: cursorDate } },
                { createdAt: { equals: cursorDate }, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
    const nextCursor =
      hasMore && oldest
        ? encodeCursor({
            createdAt: oldest.createdAt.toISOString(),
            id: oldest.id,
          })
        : null;

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
