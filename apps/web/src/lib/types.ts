/** Individual reasoning step from Aion-2.0. */
export interface AionReasoningDetail {
  type: string;
  content: string;
}

/** Message shape sent to and received from Aion-2.0 via OpenRouter. */
export interface AionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_details?: AionReasoningDetail[];
}

/** OpenRouter chat completion request body. */
export interface AionChatRequest {
  model: "aion-labs/aion-2.0";
  messages: AionMessage[];
  reasoning?: { enabled: boolean };
  stream?: boolean;
}

/** OpenRouter chat completion response (non-streaming). */
export interface AionChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
      reasoning_details?: AionReasoningDetail[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Shape of the POST body sent from the client to /api/chat. */
export interface ChatRequestBody {
  conversationId: string;
  content: string;
}

/** Shape of the response from /api/chat to the client. */
export interface ChatResponseBody {
  message: {
    id: string;
    role: "assistant";
    content: string;
    reasoningDetails: AionReasoningDetail[] | null;
    createdAt: string;
  };
  usage?: AionChatResponse["usage"];
}
