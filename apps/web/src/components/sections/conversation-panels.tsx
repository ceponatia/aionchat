"use client";

import { useEffect, useEffectEvent } from "react";

import { ConversationSettings } from "@/components/chat/conversation-settings";
import { PromptInspector } from "@/components/chat/prompt-inspector";
import { SummaryPanel } from "@/components/chat/summary-panel";
import {
  useConversation,
  useConversationDraft,
} from "@/lib/providers/conversation-provider";
import { useEditor } from "@/lib/providers/editor-provider";

export function ConversationPanels() {
  const conversation = useConversation();
  const draft = useConversationDraft();
  const editor = useEditor();
  const showSettings = editor.activePanel === "settings";
  const showSummary = editor.activePanel === "summary";
  const showPromptInspector = editor.activePanel === "prompt-inspector";

  const refreshPromptPreviewForCurrentState = useEffectEvent(() => {
    if (!conversation.activeId) {
      return;
    }

    void conversation.loadPromptPreview(conversation.activeId, draft.input);
  });

  const refreshSummaryStateForCurrentConversation = useEffectEvent(() => {
    if (!conversation.activeId) {
      return;
    }

    void conversation.loadSummaryState(conversation.activeId);
  });

  useEffect(() => {
    if (!conversation.activeId || !showSummary) {
      return;
    }

    refreshSummaryStateForCurrentConversation();
  }, [conversation.activeId, conversation.messages.length, showSummary]);

  useEffect(() => {
    if (!conversation.activeId || (!showPromptInspector && !showSettings)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshPromptPreviewForCurrentState();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    conversation.activeId,
    conversation.messages.length,
    showPromptInspector,
    showSettings,
  ]);

  return (
    <>
      {showSettings && conversation.activeId ? (
        <ConversationSettings
          key={conversation.activeId}
          systemPrompt={conversation.activeSystemPrompt}
          model={conversation.activeModel}
          autoLoreEnabled={conversation.activeAutoLoreEnabled}
          promptBudgetMode={conversation.activePromptBudgetMode}
          budgetReport={conversation.promptPreview?.budget ?? null}
          characterSheetId={conversation.activeCharacterSheetId}
          characterSheets={editor.characterSheets}
          loreEntries={editor.loreEntries}
          attachedLoreEntries={conversation.activeLoreEntries}
          onSave={conversation.handleSaveSettings}
          onClose={editor.closePanels}
        />
      ) : null}

      {showSummary && conversation.activeId ? (
        <SummaryPanel
          state={conversation.summaryState}
          error={conversation.summaryError}
          isLoading={conversation.isSummaryLoading}
          onRefresh={() => {
            if (!conversation.activeId) {
              return;
            }

            void conversation.refreshConversationSummary(conversation.activeId);
          }}
          onClose={editor.closePanels}
        />
      ) : null}

      {showPromptInspector && conversation.activeId ? (
        <PromptInspector
          assembly={conversation.promptPreview}
          currentDraft={draft.input}
          previewDraft={conversation.promptPreviewDraft}
          error={conversation.promptPreviewError}
          isLoading={conversation.isPromptPreviewLoading}
          onRefresh={() => {
            if (!conversation.activeId) {
              return;
            }

            void conversation.loadPromptPreview(
              conversation.activeId,
              draft.input,
            );
          }}
          onClose={editor.closePanels}
        />
      ) : null}
    </>
  );
}
