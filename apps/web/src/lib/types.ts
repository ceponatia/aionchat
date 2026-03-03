/** Individual reasoning step from Aion-2.0. */
export interface AionReasoningDetail {
  type: string;
  content: string;
}

/** Message shape sent to Aion-2.0 via OpenRouter. */
export interface AionRequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Message shape received from Aion-2.0 via OpenRouter. */
export interface AionResponseMessage {
  role: "assistant";
  content: string;
  reasoning_details?: AionReasoningDetail[];
}

/** OpenRouter chat completion request body. */
export interface AionChatRequest {
  model: "aion-labs/aion-2.0";
  messages: AionRequestMessage[];
  reasoning?: { enabled: boolean };
  stream?: boolean;
}

/** OpenRouter chat completion response (non-streaming). */
export interface AionChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: AionResponseMessage;
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

export interface ConversationListItem {
  id: string;
  title: string;
  systemPrompt: string | null;
  characterSheetId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningDetails: AionReasoningDetail[] | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  systemPrompt: string | null;
  characterSheetId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface CharacterSheetListItem {
  id: string;
  name: string;
  tagline: string | null;
  createdAt: string;
  updatedAt: string;
  conversationCount: number;
}

export interface CharacterSheetDetail {
  id: string;
  name: string;
  tagline: string | null;
  personality: string | null;
  background: string | null;
  appearance: string | null;
  scenario: string | null;
  customInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterSheetBody {
  name: string;
  tagline?: string | null;
  personality?: string | null;
  background?: string | null;
  appearance?: string | null;
  scenario?: string | null;
  customInstructions?: string | null;
}

export interface UpdateCharacterSheetBody {
  name?: string;
  tagline?: string | null;
  personality?: string | null;
  background?: string | null;
  appearance?: string | null;
  scenario?: string | null;
  customInstructions?: string | null;
}
