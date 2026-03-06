import { NextRequest, NextResponse } from "next/server";

import { logError, logRequest } from "@/lib/api-logger";
import { getConversationSummaryState } from "@/lib/conversation-summary";

const BASE_PATH = "/api/conversations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeId(id: string): string | null {
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const normalizedId = normalizeId(id);
  const path = `${BASE_PATH}/${id}/summary`;
  logRequest("GET", path);

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Conversation id is required" },
      { status: 400 },
    );
  }

  try {
    const state = await getConversationSummaryState(normalizedId);
    if (!state) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(state);
  } catch (error: unknown) {
    logError("GET", path, error);
    return NextResponse.json(
      { error: "Unable to load conversation summary" },
      { status: 500 },
    );
  }
}
