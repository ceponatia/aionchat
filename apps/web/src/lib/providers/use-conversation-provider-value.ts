"use client";

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useConversationSummaryState } from "@/lib/hooks/use-conversation-summary-state";
import { useMessageOperations } from "@/lib/hooks/use-message-operations";
import { useMessages } from "@/lib/hooks/use-messages";
import { usePromptPreview } from "@/lib/hooks/use-prompt-preview";
import type { ConversationContextValue } from "@/lib/providers/conversation-context";
import type {
  PromptBudgetMode,
  UpdateConversationSettingsBody,
} from "@/lib/types";

interface UseConversationProviderValueOptions {
  defaultModel: string;
  isDefaultModelHydrated: boolean;
}

// eslint-disable-next-line max-lines-per-function -- composes all conversation workspace hooks and preserves current page-level behavior behind a provider value
export function useConversationProviderValue({
  defaultModel,
  isDefaultModelHydrated,
}: UseConversationProviderValueOptions): ConversationContextValue {
  const {
    conversations,
    activeId,
    activeTitle,
    activeSystemPrompt,
    activeAutoLoreEnabled,
    activePromptBudgetMode,
    activeModel,
    activeCharacterSheetId,
    activeLoreEntries,
    isLoading: isConversationLoading,
    isHydrated,
    createConversation,
    selectConversation,
    loadConversations,
    renameConversation,
    deleteConversation,
    saveConversationSettings,
    clearActiveConversation,
  } = useConversations();

  const {
    messages,
    hasMore,
    isLoadingMessages,
    isLoadingMore,
    loadMessages,
    loadMore,
    clearMessages,
    setMessages,
  } = useMessages();

  const { input, isLoading, error, setInput, setError, handleSend } =
    useChatMessages({
      activeId,
      messages,
      setMessages,
      createConversation,
      selectConversation,
      loadMessages,
      loadConversations,
      renameConversation,
    });

  const {
    isOperating: isMessageOperationPending,
    pendingAssistantPlacement,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleBranchMessage,
    handleResendMessage,
  } = useMessageOperations({
    activeId,
    messages,
    setMessages,
    loadConversations,
    loadMessages,
  });

  const {
    summaryState,
    summaryError,
    isSummaryLoading,
    loadSummaryState,
    refreshConversationSummary,
    clearSummaryState,
  } = useConversationSummaryState(activeId);

  const {
    promptPreview,
    promptPreviewDraft,
    promptPreviewError,
    isPromptPreviewLoading,
    loadPromptPreview,
    clearPromptPreview,
  } = usePromptPreview(activeId);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!activeId) {
      clearMessages();
      return;
    }

    void loadMessages(activeId).catch((providerError: unknown) => {
      const message =
        providerError instanceof Error
          ? providerError.message
          : "Unable to load messages";
      toast.error("Could not load messages", {
        description: message,
        duration: 5000,
      });
    });
  }, [activeId, clearMessages, isHydrated, loadMessages]);

  const handleNewChat = useCallback(async () => {
    setInput("");

    try {
      await createConversation(undefined, {
        model: isDefaultModelHydrated ? defaultModel : null,
      });
    } catch (providerError: unknown) {
      const message =
        providerError instanceof Error
          ? providerError.message
          : "Unable to create conversation";
      toast.error("Failed to create conversation", {
        description: message,
        duration: 5000,
      });
    }
  }, [createConversation, defaultModel, isDefaultModelHydrated, setInput]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        await selectConversation(id);
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to load conversation";
        toast.error("Could not load conversation", {
          description: message,
          duration: 5000,
        });
      }
    },
    [selectConversation],
  );

  const handleRenameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        await renameConversation(id, title);
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to rename conversation";
        toast.error("Failed to rename conversation", {
          description: message,
          duration: 5000,
        });
      }
    },
    [renameConversation],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        if (id === activeId) {
          clearMessages();
        }
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to delete conversation";
        toast.error("Failed to delete conversation", {
          description: message,
          duration: 5000,
        });
      }
    },
    [activeId, clearMessages, deleteConversation],
  );

  const handleSaveSettings = useCallback(
    async (settings: {
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
    }) => {
      if (!activeId) {
        return;
      }

      const body: UpdateConversationSettingsBody = {
        systemPrompt: settings.systemPrompt,
        model: settings.model,
        autoLoreEnabled: settings.autoLoreEnabled,
        promptBudgetMode: settings.promptBudgetMode,
        characterSheetId: settings.characterSheetId,
        loreEntries: settings.loreEntries,
      };

      try {
        await saveConversationSettings(activeId, body);
        toast.success("Conversation settings saved", {
          description: "The thread settings were updated.",
          duration: 3000,
        });
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to save conversation settings";
        toast.error("Failed to save conversation settings", {
          description: message,
          duration: 5000,
        });
      }
    },
    [activeId, saveConversationSettings],
  );

  const handleClearActive = useCallback(() => {
    clearActiveConversation();
    clearMessages();
    clearSummaryState();
    clearPromptPreview();
    setInput("");
    setError(null);
  }, [
    clearActiveConversation,
    clearMessages,
    clearPromptPreview,
    clearSummaryState,
    setError,
    setInput,
  ]);

  return useMemo(
    () => ({
      conversations,
      activeId,
      activeTitle,
      activeSystemPrompt,
      activeAutoLoreEnabled,
      activePromptBudgetMode,
      activeModel,
      activeCharacterSheetId,
      activeLoreEntries,
      isConversationLoading,
      isHydrated,
      messages,
      hasMore,
      isLoadingMessages,
      isLoadingMore,
      input,
      isLoading,
      error,
      pendingAssistantPlacement,
      isMessageOperationPending,
      promptPreview,
      promptPreviewDraft,
      promptPreviewError,
      isPromptPreviewLoading,
      summaryState,
      summaryError,
      isSummaryLoading,
      setInput,
      setError,
      handleSend,
      handleEditMessage,
      handleDeleteMessage,
      handleRegenerateMessage,
      handleBranchMessage,
      handleResendMessage,
      loadMore,
      loadPromptPreview,
      clearPromptPreview,
      loadSummaryState,
      refreshConversationSummary,
      handleNewChat,
      handleSelectConversation,
      handleRenameConversation,
      handleDeleteConversation,
      handleSaveSettings,
      handleClearActive,
    }),
    [
      activeAutoLoreEnabled,
      activeCharacterSheetId,
      activeId,
      activeLoreEntries,
      activeModel,
      activePromptBudgetMode,
      activeSystemPrompt,
      activeTitle,
      clearPromptPreview,
      conversations,
      error,
      handleBranchMessage,
      handleClearActive,
      handleDeleteConversation,
      handleDeleteMessage,
      handleEditMessage,
      handleNewChat,
      handleRegenerateMessage,
      handleRenameConversation,
      handleResendMessage,
      handleSaveSettings,
      handleSelectConversation,
      handleSend,
      hasMore,
      input,
      isConversationLoading,
      isHydrated,
      isLoading,
      isLoadingMessages,
      isLoadingMore,
      isMessageOperationPending,
      isPromptPreviewLoading,
      isSummaryLoading,
      loadMore,
      loadPromptPreview,
      loadSummaryState,
      messages,
      pendingAssistantPlacement,
      promptPreview,
      promptPreviewDraft,
      promptPreviewError,
      refreshConversationSummary,
      setError,
      setInput,
      summaryError,
      summaryState,
    ],
  );
}
