import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { prisma } from "@/lib/prisma";
import {
  toConversationMessage,
} from "@/lib/message-helpers";
import type { EditMessageBody, EditMessageResponse } from "@/lib/types";

const BASE_PATH = "/api/messages";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseEditBody(value: unknown): EditMessageBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<EditMessageBody>;
  if (typeof candidate.content !== "string") {
    return null;
  }

  return { content: candidate.content };
}

async function readBody(req: NextRequest): Promise<EditMessageBody | NextResponse> {
  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    throw error;
  }

  const body = parseEditBody(json);
  if (!body) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  const content = body.content.trim();
  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  return { content };
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const path = `${BASE_PATH}/${id}`;
  logRequest("DELETE", path);

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await prisma.message.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logError("DELETE", path, error);
    return NextResponse.json(
      { error: "Unable to delete message" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const path = `${BASE_PATH}/${id}`;
  logRequest("PATCH", path);

  try {
    const body = await readBody(req);
    if (body instanceof NextResponse) {
      return body;
    }

    const existing = await prisma.message.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content: body.content },
      select: {
        id: true,
        role: true,
        content: true,
        reasoningDetails: true,
        createdAt: true,
      },
    });

    const responseBody: EditMessageResponse = toConversationMessage(updated);
    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    logError("PATCH", path, error);
    return NextResponse.json(
      { error: "Unable to update message" },
      { status: 500 },
    );
  }
}