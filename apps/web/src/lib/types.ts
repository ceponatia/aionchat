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

export interface AssistantConversationMessage extends ConversationMessage {
  role: "assistant";
}

export interface ConversationListItem {
  id: string;
  title: string;
  systemPrompt: string | null;
  autoLoreEnabled: boolean;
  promptBudgetMode: PromptBudgetMode;
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

export interface ConversationMeta {
  id: string;
  title: string;
  systemPrompt: string | null;
  autoLoreEnabled: boolean;
  promptBudgetMode: PromptBudgetMode;
  characterSheetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PromptBudgetMode = "balanced" | "aggressive";

export type PromptSegmentKind =
  | "system-prompt"
  | "character-sheet"
  | "pinned-lore"
  | "matched-lore"
  | "summary-memory"
  | "recent-messages";

export type PromptSegmentReason =
  | "configured"
  | "attached"
  | "matched-by-tag"
  | "matched-by-hint"
  | "generated-summary"
  | "recent-history"
  | "disabled";

export interface PromptSegment {
  id: string;
  kind: PromptSegmentKind;
  title: string;
  reason: PromptSegmentReason;
  content: string;
  estimatedChars: number;
  included: boolean;
}

export interface PromptAssemblyResult {
  systemMessage: string | null;
  segments: PromptSegment[];
  budget: PromptBudgetReport;
}

export interface PromptBudgetReport {
  mode: PromptBudgetMode;
  targetChars: number;
  usedSystemContextChars: number;
  usedTotalChars: number;
  reservedRecentMessageChars: number;
  omittedSegmentIds: string[];
  overBudget: boolean;
}

export interface PromptPreviewRequestBody {
  content: string;
}

export interface ConversationSummaryDetail {
  conversationId: string;
  sourceMessageId: string;
  coveredMessageCount: number;
  summary: string;
  stateSnapshot: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export type ConversationSummaryStatus =
  | "available"
  | "not-ready"
  | "eligible"
  | "invalidated"
  | "failed";

export interface ConversationSummaryState {
  status: ConversationSummaryStatus;
  summary: ConversationSummaryDetail | null;
  messageCount: number;
  recentMessageWindow: number;
  minimumSummaryMessages: number;
  fallbackMode: "full-history" | "recent-only" | "summary";
  invalidatedAt: string | null;
  failureMessage: string | null;
}

export interface RefreshConversationSummaryResponse {
  summary: ConversationSummaryDetail;
}

export interface PaginatedMessagesResponse {
  messages: ConversationMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface EditMessageBody {
  content: string;
}

export type EditMessageResponse = ConversationMessage;

export interface RegenerateResponse {
  message: AssistantConversationMessage;
  usage?: AionChatResponse["usage"];
}

export interface BranchRequestBody {
  content: string;
}

export interface BranchResponse {
  message: AssistantConversationMessage;
  pruned: number;
  usage?: AionChatResponse["usage"];
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

export interface ExportEnvelope<TType extends string, TData> {
  version: 1;
  type: TType;
  exportedAt: string;
  data: TData;
}

export interface CharacterSheetExportData {
  name: string;
  tagline: string | null;
  personality: string | null;
  background: string | null;
  appearance: string | null;
  scenario: string | null;
  customInstructions: string | null;
}

export type CharacterSheetExportEnvelope = ExportEnvelope<
  "character-sheet",
  CharacterSheetExportData
>;

export const LORE_ENTRY_TYPES = [
  "world",
  "location",
  "faction",
  "npc",
  "item",
  "rule",
  "other",
] as const;

export type LoreEntryType = (typeof LORE_ENTRY_TYPES)[number];

export interface LoreEntryListItem {
  id: string;
  title: string;
  type: LoreEntryType;
  tags: string[];
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
  conversationCount: number;
}

export interface LoreEntryDetail {
  id: string;
  title: string;
  type: LoreEntryType;
  tags: string[];
  body: string;
  activationHints: string[];
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoreEntryBody {
  title: string;
  type: LoreEntryType;
  tags?: string[];
  body: string;
  activationHints?: string[];
  isGlobal?: boolean;
}

export interface UpdateLoreEntryBody {
  title?: string;
  type?: LoreEntryType;
  tags?: string[];
  body?: string;
  activationHints?: string[];
  isGlobal?: boolean;
}

export interface LoreEntryExportData {
  title: string;
  type: LoreEntryType;
  tags: string[];
  body: string;
  activationHints: string[];
  isGlobal: boolean;
}

export type LoreEntryExportEnvelope = ExportEnvelope<
  "lore-entry",
  LoreEntryExportData
>;

export interface ConversationLoreEntryItem {
  loreEntryId: string;
  pinned: boolean;
  priority: number;
  loreEntry: LoreEntryListItem;
}

export interface UpdateConversationLoreEntriesBody {
  items: Array<{
    loreEntryId: string;
    pinned: boolean;
    priority: number;
  }>;
}

export interface UpdateConversationSettingsBody {
  systemPrompt?: string | null;
  autoLoreEnabled?: boolean;
  promptBudgetMode?: PromptBudgetMode;
  characterSheetId?: string | null;
  loreEntries: Array<{
    loreEntryId: string;
    pinned: boolean;
    priority: number;
  }>;
}
