import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { buildConversationPromptAssembly } from "@/lib/message-helpers";
import type { PromptPreviewRequestBody } from "@/lib/types";

const BASE_PATH = "/api/conversations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBody(value: unknown): PromptPreviewRequestBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PromptPreviewRequestBody>;
  if (typeof candidate.content !== "string") {
    return null;
  }

  return { content: candidate.content };
}

export async function POST(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  const path = `${BASE_PATH}/${id}/prompt-preview`;
  logRequest("POST", path);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = (await req.json()) as unknown;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    logError("POST", path, error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const body = parseBody(json);
  if (!body) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  try {
    const assembly = await buildConversationPromptAssembly(normalizedId, {
      draftContent: body.content.trim(),
    });

    if (!assembly) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(assembly);
  } catch (error: unknown) {
    logError("POST", path, error);
    return NextResponse.json(
      { error: "Unable to build prompt preview" },
      { status: 500 },
    );
  }
}