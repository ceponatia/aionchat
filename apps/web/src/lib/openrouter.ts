import "server-only";

import { env } from "./env";
import type { AionChatRequest, AionChatResponse, AionMessage } from "./types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export class OpenRouterError extends Error {
  readonly status: number;
  readonly body: string;
  readonly retryAfter: string | null;

  constructor(status: number, body: string, retryAfter: string | null) {
    super(`OpenRouter API error (${status}): ${body}`);
    this.name = "OpenRouterError";
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

function buildRequest(
  messages: AionMessage[],
  stream: boolean,
): AionChatRequest {
  return {
    model: "aion-labs/aion-2.0",
    messages,
    reasoning: { enabled: true },
    stream,
  };
}

export async function chatCompletion(
  messages: AionMessage[],
): Promise<AionChatResponse> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequest(messages, false)),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OpenRouterError(res.status, body, res.headers.get("retry-after"));
  }

  return (await res.json()) as AionChatResponse;
}

export async function chatCompletionStream(
  messages: AionMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(buildRequest(messages, true)),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !res.body || !contentType.includes("text/event-stream")) {
    const body = await res.text();
    throw new OpenRouterError(res.status, body, res.headers.get("retry-after"));
  }

  return res.body;
}
