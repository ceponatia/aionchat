"use client";

import { createContext, useContext } from "react";

import type {
  ConversationListItem,
  ConversationLoreEntryItem,
  ConversationMessage,
  ConversationSummaryState,
  PromptAssemblyResult,
  PromptBudgetMode,
} from "@/lib/types";

export interface ConversationContextValue {
  conversations: ConversationListItem[];
  activeId: string | null;
  activeTitle: string | null;
  activeSystemPrompt: string | null;
  activeAutoLoreEnabled: boolean;
  activePromptBudgetMode: PromptBudgetMode;
  activeModel: string | null;
  activeCharacterSheetId: string | null;
  activeLoreEntries: ConversationLoreEntryItem[];
  isConversationLoading: boolean;
  isHydrated: boolean;
  messages: ConversationMessage[];
  hasMore: boolean;
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  input: string;
  isLoading: boolean;
  error: string | null;
  pendingAssistantPlacement: { anchorId: string | null } | null;
  isMessageOperationPending: boolean;
  promptPreview: PromptAssemblyResult | null;
  promptPreviewDraft: string;
  promptPreviewError: string | null;
  isPromptPreviewLoading: boolean;
  summaryState: ConversationSummaryState | null;
  summaryError: string | null;
  isSummaryLoading: boolean;
  setInput: (value: string) => void;
  setError: (value: string | null) => void;
  handleSend: () => Promise<void>;
  handleEditMessage: (messageId: string, content: string) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleRegenerateMessage: (messageId: string) => Promise<void>;
  handleBranchMessage: (messageId: string, content: string) => Promise<void>;
  handleResendMessage: (messageId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  loadPromptPreview: (
    conversationId: string,
    draftContent: string,
  ) => Promise<void>;
  clearPromptPreview: () => void;
  loadSummaryState: (conversationId: string) => Promise<void>;
  refreshConversationSummary: (conversationId: string) => Promise<void>;
  handleNewChat: () => Promise<void>;
  handleSelectConversation: (id: string) => Promise<void>;
  handleRenameConversation: (id: string, title: string) => Promise<void>;
  handleDeleteConversation: (id: string) => Promise<void>;
  handleSaveSettings: (settings: {
    systemPrompt: string | null;
    model: string | null;
    autoLoreEnabled: boolean;
    promptBudgetMode: PromptBudgetMode;
    characterSheetId: string | null;
    loreEntries: Array<{
      loreEntryId: string;
      pinned: boolean;
      priority: number;
    }>;
  }) => Promise<void>;
  handleClearActive: () => void;
}

export const ConversationContext =
  createContext<ConversationContextValue | null>(null);

export function useConversation(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within ConversationProvider");
  }

  return context;
}
