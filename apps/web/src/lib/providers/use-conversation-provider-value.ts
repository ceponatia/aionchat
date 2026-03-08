"use client";

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useChatMessages } from "@/lib/hooks/use-chat-messages";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useConversationSummaryState } from "@/lib/hooks/use-conversation-summary-state";
import { useMessageOperations } from "@/lib/hooks/use-message-operations";
import { useMessages } from "@/lib/hooks/use-messages";
import { usePromptPreview } from "@/lib/hooks/use-prompt-preview";
import type {
  ConversationContextValue,
  ConversationDraftContextValue,
} from "@/lib/providers/conversation-context";
import type {
  PromptBudgetMode,
  UpdateConversationSettingsBody,
} from "@/lib/types";

interface UseConversationProviderValueOptions {
  defaultModel: string;
  isDefaultModelHydrated: boolean;
}

interface UseConversationProviderValueReturn {
  conversationValue: ConversationContextValue;
  draftValue: ConversationDraftContextValue;
}

// eslint-disable-next-line max-lines-per-function -- composes all conversation workspace hooks and preserves current page-level behavior behind a provider value
export function useConversationProviderValue({
  defaultModel,
  isDefaultModelHydrated,
}: UseConversationProviderValueOptions): UseConversationProviderValueReturn {
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
    showArchived,
    createConversation,
    selectConversation,
    loadConversations,
    renameConversation,
    deleteConversation,
    saveConversationSettings,
    setConversationTags,
    setConversationArchived,
    setArchivedVisibility,
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

  const resetConversationPanels = useCallback(() => {
    clearMessages();
    clearSummaryState();
    clearPromptPreview();
    setInput("");
    setError(null);
  }, [
    clearMessages,
    clearPromptPreview,
    clearSummaryState,
    setError,
    setInput,
  ]);

  const handleReloadConversations = useCallback(async () => {
    try {
      await loadConversations();
    } catch (providerError: unknown) {
      const message =
        providerError instanceof Error
          ? providerError.message
          : "Unable to refresh conversations";
      toast.error("Could not refresh conversations", {
        description: message,
        duration: 5000,
      });
    }
  }, [loadConversations]);

  const handleSetConversationTags = useCallback(
    async (id: string, tagIds: string[]) => {
      try {
        await setConversationTags(id, tagIds);
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to update conversation tags";
        toast.error("Failed to update tags", {
          description: message,
          duration: 5000,
        });
      }
    },
    [setConversationTags],
  );

  const handleSetConversationArchived = useCallback(
    async (id: string, archived: boolean) => {
      try {
        await setConversationArchived(id, archived);
        if (archived && id === activeId) {
          resetConversationPanels();
        }
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to update archive status";
        toast.error("Failed to update archive status", {
          description: message,
          duration: 5000,
        });
      }
    },
    [activeId, resetConversationPanels, setConversationArchived],
  );

  const handleSetArchivedVisibility = useCallback(
    async (value: boolean) => {
      try {
        await setArchivedVisibility(value);
        if (
          !value &&
          activeId &&
          !conversations.some(
            (item: (typeof conversations)[number]) =>
              item.id === activeId && item.archivedAt === null,
          )
        ) {
          resetConversationPanels();
        }
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : "Unable to change archive visibility";
        toast.error("Failed to update archive filter", {
          description: message,
          duration: 5000,
        });
      }
    },
    [activeId, conversations, resetConversationPanels, setArchivedVisibility],
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
    resetConversationPanels();
  }, [clearActiveConversation, resetConversationPanels]);

  const conversationValue = useMemo(
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
      showArchived,
      messages,
      hasMore,
      isLoadingMessages,
      isLoadingMore,
      isLoading,
      pendingAssistantPlacement,
      isMessageOperationPending,
      promptPreview,
      promptPreviewDraft,
      promptPreviewError,
      isPromptPreviewLoading,
      summaryState,
      summaryError,
      isSummaryLoading,
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
      handleReloadConversations,
      handleSetConversationTags,
      handleSetConversationArchived,
      handleSetArchivedVisibility,
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
      handleBranchMessage,
      handleClearActive,
      handleDeleteConversation,
      handleDeleteMessage,
      handleEditMessage,
      handleNewChat,
      handleReloadConversations,
      handleRegenerateMessage,
      handleRenameConversation,
      handleResendMessage,
      handleSaveSettings,
      handleSetArchivedVisibility,
      handleSetConversationArchived,
      handleSetConversationTags,
      handleSelectConversation,
      hasMore,
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
      showArchived,
      summaryError,
      summaryState,
    ],
  );

  const draftValue = useMemo(
    () => ({
      input,
      error,
      setInput,
      setError,
      handleSend,
    }),
    [error, handleSend, input, setError, setInput],
  );

  return {
    conversationValue,
    draftValue,
  };
}
