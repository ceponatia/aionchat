import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  generateText,
  streamText,
  type LanguageModelUsage,
  type ModelMessage,
} from "ai";

import { env } from "./env";
import { DEFAULT_MODEL_ID, normalizeModelId } from "./model-registry";
import type { AionChatResponse, AionRequestMessage } from "./types";

export const DEFAULT_CHAT_MODEL = DEFAULT_MODEL_ID;

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

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

function toModelMessages(messages: AionRequestMessage[]): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function toOpenRouterError(error: unknown): OpenRouterError {
  const status =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;

  const body = error instanceof Error ? error.message : "Unknown model error";

  return new OpenRouterError(status, body, null);
}

function toUsage(
  usage: LanguageModelUsage | undefined,
): AionChatResponse["usage"] | undefined {
  if (!usage) {
    return undefined;
  }

  const promptTokens = usage.inputTokens ?? 0;
  const completionTokens = usage.outputTokens ?? 0;

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
}

export async function chatCompletion(
  messages: AionRequestMessage[],
  modelId?: string,
): Promise<AionChatResponse> {
  const model = normalizeModelId(modelId);

  try {
    const result = await generateText({
      model: openrouter(model),
      messages: toModelMessages(messages),
      providerOptions: {
        openrouter: {
          reasoning: { enabled: true },
        },
      },
    });

    return {
      id: crypto.randomUUID(),
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: result.text,
            reasoning_details: undefined,
          },
          finish_reason: result.finishReason,
        },
      ],
      usage: toUsage(result.usage),
    };
  } catch (error: unknown) {
    throw toOpenRouterError(error);
  }
}

interface StreamChatCompletionOptions {
  model?: string;
  onFinish?: (event: { text: string }) => Promise<void> | void;
}

type StreamChatCompletionResult = ReturnType<typeof streamText>;

export function streamChatCompletion(
  messages: AionRequestMessage[],
  options: StreamChatCompletionOptions = {},
): StreamChatCompletionResult {
  const model = normalizeModelId(options.model);

  try {
    return streamText({
      model: openrouter(model),
      messages: toModelMessages(messages),
      providerOptions: {
        openrouter: {
          reasoning: { enabled: true },
        },
      },
      onFinish: options.onFinish,
    });
  } catch (error: unknown) {
    throw toOpenRouterError(error);
  }
}
