"use client";

import { useEffect, useEffectEvent } from "react";

import { ConversationSettings } from "@/components/chat/conversation-settings";
import { PromptInspector } from "@/components/chat/prompt-inspector";
import { SummaryPanel } from "@/components/chat/summary-panel";
import { useConversation } from "@/lib/providers/conversation-provider";
import { useEditor } from "@/lib/providers/editor-provider";

export function ConversationPanels() {
  const conversation = useConversation();
  const editor = useEditor();
  const showSettings = editor.activePanel === "settings";
  const showSummary = editor.activePanel === "summary";
  const showPromptInspector = editor.activePanel === "prompt-inspector";

  const refreshPromptPreviewForCurrentState = useEffectEvent(() => {
    if (!conversation.activeId) {
      return;
    }

    void conversation.loadPromptPreview(
      conversation.activeId,
      conversation.input,
    );
  });

  const refreshSummaryStateForCurrentConversation = useEffectEvent(() => {
    if (!conversation.activeId) {
      return;
    }

    void conversation.loadSummaryState(conversation.activeId);
  });

  useEffect(() => {
    if (!conversation.activeId) {
      return;
    }

    if (showSummary) {
      refreshSummaryStateForCurrentConversation();
    }

    if (showPromptInspector || showSettings) {
      refreshPromptPreviewForCurrentState();
    }
  }, [
    conversation.activeId,
    conversation.messages.length,
    showPromptInspector,
    showSettings,
    showSummary,
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
          currentDraft={conversation.input}
          previewDraft={conversation.promptPreviewDraft}
          error={conversation.promptPreviewError}
          isLoading={conversation.isPromptPreviewLoading}
          onRefresh={() => {
            if (!conversation.activeId) {
              return;
            }

            void conversation.loadPromptPreview(
              conversation.activeId,
              conversation.input,
            );
          }}
          onClose={editor.closePanels}
        />
      ) : null}
    </>
  );
}
